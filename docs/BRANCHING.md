# Branching and release policy

`main` is production. `staging` is the protected integration and pre-production branch. Direct pushes to either branch must be disabled.

## Normal release flow

1. Create `feature/<ticket>-short-name` from `staging`.
2. Open a pull request back to `staging`; require CI, CodeQL, resolved conversations, and a current branch. Require another reviewer when a second maintainer is available.
3. The merge to `staging` deploys the staging API, applies staging migrations, and publishes the Pages staging branch.
4. Validate critical paths on `https://staging.jbagreengoldorchard.farm`.
5. Open a `staging` to `main` pull request. The protected GitHub `production` environment must require a human approval.
6. The merge to `main` deploys production. Never force-push or develop directly on `main`.

Use squash merge for feature pull requests and a merge commit for `staging` to `main`, preserving an auditable release boundary. Tag successful production releases as `vYYYY.MM.DD.N`.

For an urgent correction, branch from `staging`, use the same staging validation path, and then promote the exact staging tree. Production never accepts an untested direct hotfix.

## GitHub repository settings

Create branch rules for both `main` and `staging`: require pull requests, status checks `verify` and `analyze`, resolved conversations, signed commits where available, and block deletions/force pushes. Add required approvals and Code Owners review when a second maintainer is available. Restrict the production deployment environment to `main` and add a required deployment reviewer.

The repository is public, so GitHub branch protection, security scanning, and environment controls can be enabled without relying on a private-repository plan exception. The deployment environments must remain restricted to their matching `main` and `staging` branches.

The initial Code Owner is `@Nyamesem22`; replace it with a GitHub team when additional maintainers join.
