# Color rollback — September 19, 2026

The client requested restoration of the original staging appearance. The AGRIVI and six-swatch overrides have been removed from the application. The prior instructions in this document are superseded.

Restored shared styles and Tailwind palette across public, portal, admin, dialogs and charts. Restored per-page color replacements while preserving unrelated functional changes. Backups of the removed experimental themes and edited files are under tmp/color-rollback-backup.

Compared staging and local homepage, newsroom, customer login and staff login: shared page #F4FBF5, header #123524, primary #2E7D32 match. Local admin login reached its Dashboard heading; screenshot capture timed out waiting for web fonts. Authenticated staging interiors were not verified, so this does not claim every page/state has pixel parity.

Frontend production build passed. Aggregate npm run build remains blocked by pre-existing apps/api/src/modules/product-images.test.ts:28 unknown JSON response typing.
