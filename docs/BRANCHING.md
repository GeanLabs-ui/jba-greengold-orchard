# Branching and release policy

`main` is production. `staging` is the protected integration and pre-production branch. Direct pushes to either branch must be disabled.

## Normal release flow

1. Create `feature/<ticket>-short-name` from `staging`.
2. Open a pull request back to `staging`; require CI, CodeQL, one approving review, resolved conversations, and a current branch.
3. The merge to `staging` deploys the staging API, applies staging migrations, and publishes the Pages staging branch.
4. Validate critical paths on `https://staging.jbagreengoldorchard.farm`.
5. Open a `staging` to `main` pull request. The protected GitHub `production` environment must require a human approval.
6. The merge to `main` deploys production. Never force-push or develop directly on `main`.

Use squash merge for feature pull requests and a merge commit for `staging` to `main`, preserving an auditable release boundary. Tag successful production releases as `vYYYY.MM.DD.N`.

For an urgent correction, branch `hotfix/<ticket>-short-name` from `main`, review and deploy it through `main`, then immediately merge `main` back into `staging`.

## GitHub repository settings

Create branch rules for both `main` and `staging`: require pull requests, at least one review, Code Owners review for security/infrastructure paths, status checks `verify` and `analyze`, resolved conversations, linear history for feature branches, signed commits where available, and block deletions/force pushes. Restrict the production deployment environment to `main` and add required reviewers.

The repository is private. GitHub rejected branch protection and required environment reviewers on the current Free plan; upgrade the account/repository to GitHub Pro before production, then apply the rules above. The existing deployment environments are already restricted to their matching `main` and `staging` branches.

The initial Code Owner is `@Nyamesem22`; replace it with a GitHub team when additional maintainers join.
