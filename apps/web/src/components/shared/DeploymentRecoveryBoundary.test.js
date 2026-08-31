import { describe, expect, it } from 'vitest';
import { isDeploymentPreloadError } from './DeploymentRecoveryBoundary';

describe('isDeploymentPreloadError', () => {
  it.each([
    'Failed to fetch dynamically imported module: /assets/FarmProfile.js',
    'Importing a module script failed',
    'useMemo is not defined',
    "Cannot access 'React' before initialization",
  ])('recognizes stale deployment failures: %s', (message) => {
    expect(isDeploymentPreloadError(new Error(message))).toBe(true);
  });

  it('does not reload automatically for an ordinary application error', () => {
    expect(isDeploymentPreloadError(new Error('Farm record not found'))).toBe(false);
  });
});
