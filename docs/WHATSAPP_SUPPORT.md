# WhatsApp customer support

The floating support button is available throughout the website, customer portal, staff workspace, and authentication pages. It has an on-site assistant for product prices, orders, local supply, export, public news, vacancies, and general company information. Customers can also hand the same conversation over to WhatsApp at any time.

The assistant is deliberately public-information-only. It must not share company security information, credentials, staff identifiers or contact details, customer/account data, internal documents, internal operational information, or payment details. Order tracking and payments are directed to the signed-in customer portal instead.

The public click-to-chat number defaults to the existing `233593549954`. To replace it, set the public Pages build variable `VITE_WHATSAPP_SUPPORT_PHONE` to the digits-only international phone number, for example `233XXXXXXXXX`.

## Connect the WhatsApp Business bot

The API implements the official WhatsApp Cloud API webhook at:

```
https://<your-pages-domain>/api/v1/support/whatsapp
```

The Pages `/api` Function safely proxies this public URL to the private API Worker, so Meta should use the Pages domain rather than an internal Worker service-binding name.

In the Meta developer dashboard, add that callback URL, choose a long random verify token, and subscribe to incoming messages. Then set the following as Worker secrets for each environment; never add them to `wrangler.jsonc`, a Pages build variable, or source control:

```powershell
cd "C:\Users\USER\Desktop\Farm Actual Project"
npx wrangler secret put WHATSAPP_ACCESS_TOKEN --config apps/api/wrangler.jsonc --env staging
npx wrangler secret put WHATSAPP_APP_SECRET --config apps/api/wrangler.jsonc --env staging
npx wrangler secret put WHATSAPP_VERIFY_TOKEN --config apps/api/wrangler.jsonc --env staging
npx wrangler secret put WHATSAPP_PHONE_NUMBER_ID --config apps/api/wrangler.jsonc --env staging
npx wrangler secret put WHATSAPP_GRAPH_API_VERSION --config apps/api/wrangler.jsonc --env staging
```

Repeat the commands with `--env production` only after the staging webhook has verified and a real message has received a reply. `WHATSAPP_GRAPH_API_VERSION` must be the Graph API version Meta currently shows for the WhatsApp app. The webhook verifies Meta's `X-Hub-Signature-256` before processing any message and does not expose credentials to the browser.

Until these five values are configured, the on-site assistant and click-to-chat link still work, but messages sent directly to the WhatsApp Business number cannot receive automated replies from this platform.
