# Google Sign-In — staging only

Configured and verified on 4 September 2026.

- Staging origin: `https://staging.jba-greengold-orchard.pages.dev`
- Public OAuth Web client ID: `445602030751-d1pjntsv6v1h9nolomjtufhnvdocbu3v.apps.googleusercontent.com`
- GitHub repository environment: `GeanLabs-ui/jba-greengold-orchard`, environment `staging`, variable `GOOGLE_CLIENT_ID`. This already matched the supplied ID.
- Live API: `mango-farm-api-staging`, binding `GOOGLE_CLIENT_ID`, updated with Wrangler's staging-scoped secret command.
- Active Worker version after the configuration update: `2610ff42-a0aa-404a-9a55-f4045b0fed9e`, 100% traffic.

The deployed frontend already contains the same client ID, and Google's button renders on staging `/login`. Staging `/api/v1/health` returned JSON `status: ok` with the version above; `/api/v1/ready` returned JSON `status: ready`.

Localhost was not configured: its `/api/v1/auth/config` still returns `googleClientId: null`. Production configuration was not changed. This staging-only instruction supersedes the local OAuth setup proposal in the earlier account security review.

Only the live configuration was updated. No source release, database migration, account creation, data reassignment, or production deployment was performed. The security fixes in the local working tree have not been released to staging by this operation.

Google Cloud Console must authorize the staging origin above for this Web client. Console settings were not edited or directly inspected, and the account owner's final Google sign-in was not completed. Button rendering alone does not establish successful end-to-end authentication.

The existing staging deployment workflow already supplies the staging GitHub variable to both Worker `GOOGLE_CLIENT_ID` and frontend build `VITE_GOOGLE_CLIENT_ID`. The newer local frontend instead reads the API's public `/auth/config` endpoint when that source release is deployed.
