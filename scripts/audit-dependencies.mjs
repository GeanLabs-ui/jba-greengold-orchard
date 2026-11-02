import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const advisory = 'https://github.com/advisories/GHSA-g3hv-75wg-m249';
const legacySourceHash = '746849f267c4868a53729225bd85c7dccd387712136fb305fcc0a3eadd4a3d9d';

// The advisory describes the optimizationLevel >= 2 preprocessor introduced
// after minimatch 3. Its published version range also matches the legacy line.
// Accept only the reviewed, integrity-locked legacy source; fail for every other
// advisory, version, source change or unresolved dependency chain.
export function assessAudit(report, legacyVerified) {
  const entries = report.vulnerabilities || {};
  const reviewed = name => {
    const seen = new Set();
    const leaves = [];
    let unresolved = false;
    const visit = dependency => {
      if (seen.has(dependency)) return;
      seen.add(dependency);
      if (!entries[dependency]?.via?.length) { unresolved = true; return; }
      for (const via of entries[dependency].via) {
        if (typeof via === 'string') visit(via);
        else leaves.push(via);
      }
    };
    visit(name);
    return !unresolved && leaves.length > 0 && leaves.every(via => legacyVerified && via.name === 'minimatch' && via.url === advisory);
  };
  return Object.keys(entries).filter(name => !reviewed(name));
}

function main() {
  const npmCli = process.env.npm_execpath;
  if (!npmCli) throw new Error('Run through npm run audit:dependencies');
  const result = spawnSync(process.execPath, [npmCli, 'audit', '--json'], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  if (result.error) throw result.error;
  const report = JSON.parse(result.stdout);
  if (report.error) throw new Error('Dependency audit service failed');
  let verified = false;
  const nodes = report.vulnerabilities?.minimatch?.nodes || [];
  if (nodes.length === 1 && nodes[0] === 'node_modules/minimatch') {
    const pkg = JSON.parse(readFileSync(new URL('../node_modules/minimatch/package.json', import.meta.url)));
    const source = readFileSync(new URL('../node_modules/minimatch/minimatch.js', import.meta.url));
    verified = pkg.version === '3.1.5' && createHash('sha256').update(source).digest('hex') === legacySourceHash;
  }
  const unaddressed = assessAudit(report, verified);
  console.log(JSON.stringify({ advisories: report.metadata?.vulnerabilities, reviewedLegacySourceException: verified, unaddressed }));
  if (unaddressed.length) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
