import { describe, expect, it } from 'vitest';
import { isDeploymentPreloadError, shouldResetDeploymentRecovery } from './DeploymentRecoveryBoundary';

describe('isDeploymentPreloadError', () => {
  it.each([
    'Failed to fetch dynamically imported module: /assets/FarmProfile.js',
    'Importing a module script failed',
  ])('recognizes stale deployment failures: %s', (message) => {
    expect(isDeploymentPreloadError(new Error(message))).toBe(true);
  });

  it('does not reload automatically for an ordinary application error', () => {
    expect(isDeploymentPreloadError(new Error('Farm record not found'))).toBe(false);
    expect(isDeploymentPreloadError(new ReferenceError('useMemo is not defined'))).toBe(false);
  });

  it('clears a trapped page error when navigation moves elsewhere', () => {
    expect(shouldResetDeploymentRecovery('/farms/a', '/records')).toBe(true);
    expect(shouldResetDeploymentRecovery('/farms/a', '/farms/a')).toBe(false);
  });
});
