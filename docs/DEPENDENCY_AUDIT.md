# Reviewed legacy minimatch advisory

The release audit reports eight moderate dependency findings, all derived from GHSA-g3hv-75wg-m249. The advisory describes firstPhasePreProcess and secondPhasePreProcess at optimizationLevel >= 2 in minimatch 10.2.6, but its published range is every version before 11.0.1. This application installs legacy minimatch 3.1.5 for ESLint; that version has neither preprocessor nor the optimizationLevel option.

Reference: https://github.com/advisories/GHSA-g3hv-75wg-m249

`npm run audit:dependencies` still audits all dependencies. It accepts this one finding and its transitive reports only when the installed minimatch version is exactly 3.1.5 and minimatch.js matches the reviewed SHA-256 `746849f267c4868a53729225bd85c7dccd387712136fb305fcc0a3eadd4a3d9d`. A different installed version, changed source, new advisory, audit service error or unresolved dependency chain fails the gate. The existing lockfile integrity checks remain in effect. No dependency is downgraded or replaced, and no runtime advisory is waived.
