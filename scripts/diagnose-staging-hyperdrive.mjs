import { pathToFileURL } from 'node:url';
import { stagingHyperdriveFailures } from './staging-database-identity.mjs';

const account = 'b704861ca32f3579611a66b3a0f7f874';
const hyperdrive = '05df39dddd6744cd81fa791957ac922b';

export async function diagnose(env, request = fetch) {
  const token = env.CLOUDFLARE_API_TOKEN;
  // Never echo credentials, arbitrary response bodies/messages or exception text.
  if (!token || env.CLOUDFLARE_ACCOUNT_ID !== account) {
    return { passed: false, configuration: 'missing credential or unexpected account' };
  }
  const read = async (path, inspect) => {
    try {
      const response = await request(`https://api.cloudflare.com/client/v4${path}`, {
        method: 'GET', headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(15000),
      });
      let body;
      try { body = await response.json(); } catch {
        return { httpStatus: response.status, success: false, response: 'non-JSON' };
      }
      return {
        httpStatus: response.status,
        success: response.ok && body?.success === true,
        errorCodes: Array.isArray(body?.errors)
          ? body.errors.map(error => error?.code).filter(Number.isInteger) : [],
        ...(response.ok && body?.success === true ? inspect(body.result) : {}),
      };
    } catch {
      return { success: false, response: 'request failed or timed out' };
    }
  };
  const [identity, origin] = await Promise.all([
    read('/user/tokens/verify', result => ({
      tokenId: /^[a-f0-9]{32}$/i.test(result?.id ?? '') ? result.id : 'unavailable',
      active: result?.status === 'active',
    })),
    read(`/accounts/${account}/hyperdrive/configs/${hyperdrive}`, result => ({
      expectedOrigin: stagingHyperdriveFailures(result?.origin).length === 0,
    })),
  ]);
  return {
    checkedAt: new Date().toISOString(),
    credentialHasSurroundingWhitespace: token !== token.trim(),
    identity, hyperdrive: origin,
    passed: origin.success === true && origin.expectedOrigin === true,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const report = await diagnose(process.env);
  console.log(JSON.stringify(report, null, 2));
  if (!report.passed) process.exitCode = 1;
}
