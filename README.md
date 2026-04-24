# n8n-nodes-2captcha

An n8n community node to automate solving and bypassing the most complex captchas using the [2Captcha.com](https://2captcha.com/auth/register?utm_source=n8n&utm_medium=community_node) API.

Designed for web scraping, automation experts, and developers dealing with strict anti-bot systems. The node handles the full submit/poll cycle under the hood — pass the target parameters and get the bypass token back in a single node.

## Features

The node has a dynamic UI: pick a captcha type and only the fields required for that type are shown.

Currently supported:

- **Cloudflare Turnstile**
- **reCAPTCHA v2**
- **reCAPTCHA v3**
- **reCAPTCHA Enterprise**
- **Normal Captcha** (Image-to-Text via Base64)

No need to build complex `Wait` or `HTTP Request` loops — task creation and result polling are handled automatically.

## Prerequisites

- An active [n8n](https://n8n.io/) installation (self-hosted or Cloud).
- A 2Captcha account and an API key. Get one by registering at [2Captcha](https://2captcha.com/auth/register?utm_source=n8n&utm_medium=community_node).

## Installation

Install directly from the n8n UI:

1. Go to **Settings → Community Nodes**.
2. Click **Install**.
3. Enter `n8n-nodes-2captcha-official` as the package name.
4. Accept the risks prompt and click **Install**.

For Docker-based installations you can also add the package to your `package.json` or install it via the terminal inside the n8n container.

## Credentials

1. In your workflow, add the **2Captcha** node.
2. Open the **Credential** dropdown and choose **Create New**.
3. Paste your 2Captcha API key and save.

The credential is verified against `POST https://api.2captcha.com/getBalance`, so a successful save also confirms the key works and the account has balance.

## Usage

1. Select a **Captcha Type** (Turnstile, reCAPTCHA v2/v3/Enterprise, or Normal).
2. Fill in the dynamic fields:
   - Token-based captchas need **Page URL** and **Site Key / App ID**.
   - reCAPTCHA v3 and Enterprise also accept an **Action** (and v3 accepts **Min Score**).
   - Normal captcha requires the image as a **Base64** string.
3. Run the node. The solved token is returned on the `token` field of the output JSON, ready to be plugged into a subsequent HTTP Request, Puppeteer/Playwright step, or any other node.

### Example output

```json
{
  "success": true,
  "taskId": "7392817492",
  "token": "0.xxxxx_valid_bypass_token_xxxxx",
  "type": "turnstile"
}
```

## Resources

- [2Captcha API documentation](https://2captcha.com/api-docs)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)

## License

[MIT](LICENSE.md)
