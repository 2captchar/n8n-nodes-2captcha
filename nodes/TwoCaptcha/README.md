# n8n-nodes-2captcha

An official n8n community node to automate solving and bypassing the most complex captchas using the [2Captcha.com](https://2captcha.com/auth/register?utm_source=n8n&utm_medium=community_node) API.

Designed for web scraping, automation experts, and developers dealing with strict anti-bot systems. This node handles the complete polling cycle under the hood—just pass the target parameters, and get the bypass token in seconds.

## 🚀 Features & Supported Captchas

The node features a dynamic UI. Simply select your captcha type, and the interface will adapt to show only the required fields.

Currently supported:
* **Cloudflare Turnstile**
* **reCAPTCHA** (v2, v3, and Enterprise)
* **hCaptcha**
* **GeeTest** (v3 and v4)
* **Amazon WAF**
* **Lemin Cropped**
* **Normal Captcha** (Image-to-Text via Base64)

*No need to build complex `Wait` or `HTTP Request` loops. The node automatically handles task submission and result polling.*

## ⚙️ Prerequisites

* An active [n8n](https://n8n.io/) installation.
* A 2Captcha account and an API Key. Get one by registering at [2Captcha](https://2captcha.com/auth/register?utm_source=n8n&utm_medium=community_node).

## 🛠 Installation

You can install this node directly from your n8n interface:

1. Go to **Settings > Community Nodes**.
2. Click on **Install**.
3. Enter `n8n-nodes-2captcha` as the package name.
4. Check the "I understand the risks..." box and click **Install**.

*(If you are running n8n via Docker, you can also add `n8n-nodes-2captcha` to your `package.json` or install it via the terminal).*

## 📖 Usage & Configuration

1. **Add Credentials:** In your n8n workflow, add the `2Captcha` node.
2. **Setup API Key:** Click on *Select Credential* -> *Create New*, and paste your 2Captcha API Key.
3. **Select Operation:** Choose the type of captcha you want to bypass from the dropdown.
4. **Provide Target Data:** Fill in the dynamically generated fields (e.g., Site Key, URL, GT Key) based on your selected captcha.
5. **Execute:** Run the node. The output will provide a JSON object containing the `taskId` and the ready-to-use `token` for your next HTTP Request or Playwright/Puppeteer script.

## 📄 Example Output

```json
{
  "success": true,
  "taskId": "7392817492",
  "token": "0.xxxxx_valid_bypass_token_xxxxx",
  "type": "turnstile"
}