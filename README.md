![Banner image](https://user-images.githubusercontent.com/10284570/173569848-c624317f-42b1-45a6-ab09-f0ea3c247648.png)

# Acrolinx for n8n

This is an n8n community node that integrates [Acrolinx](https://www.acrolinx.com/) text quality and governance platform into your n8n workflows.

[Acrolinx](https://www.acrolinx.com/) helps create compliant, consistent, and engaging content by providing AI-powered text analysis, suggestions, and rewrites based on your organization's style guide and tone of voice.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

### Quick Install

In n8n, go to **Settings** > **Community Nodes** and install:

```
n8n-nodes-acrolinx
```

### Manual Install

```bash
npm install n8n-nodes-acrolinx
```

## Credentials

You'll need an Acrolinx API key:

1. Sign up for an [Acrolinx account](https://www.acrolinx.com/)
2. Get your API key from your account settings
3. In n8n, add credentials:
   - Go to **Credentials** > **New**
   - Select **Acrolinx API**
   - Enter your API key
   - Set base URL (default: `https://app.acrolinx.cloud`)

## Actions

### Style Check

Analyze text for quality issues without making changes. Returns:

- Quality, clarity, and grammar scores
- Style guide compliance
- Tone analysis
- Readability metrics
- Identified issues

### Style Rewrite

Automatically rewrite and improve text using AI. Returns:

- Improved text version
- Before/after quality scores
- Score improvements

## Options

All text operations support:

- **Dialect**: American English, British English, Australian English, Canadian English
- **Tone**: Academic, Business, Casual, Conversational, Formal, Gen-Z, Informal, Technical
- **Style Guide**: AP, Chicago, Microsoft, Proofpoint
- **Wait for Completion**: Auto-poll for results (default: true)
- **Polling Timeout**: Max wait time in ms (default: 60000)
- **Polling Interval**: Check frequency in ms (default: 2000)

## Example Workflow

```json
{
	"parameters": {
		"operation": "rewrite",
		"content": "={{ $json.data }}",
		"styleGuide": "01971e03-dd27-75ee-9044-b48e654848cf",
		"tone": "formal",
		"dialect": "american_english",
		"additionalOptions": {
			"documentLink": "={{ $('Google Drive').item.json.webViewLink }}",
			"documentName": "={{ $('Google Drive').item.json.name }}",
			"documentOwner": "={{ $('Google Drive').item.json.owners[0].displayName }}"
		}
	},
	"type": "CUSTOM.acrolinx",
	"typeVersion": 1,
	"position": [660, -440],
	"id": "8a6d86a0-d601-495c-9cc8-6e8d8939d71d",
	"name": "Acrolinx",
	"credentials": {
		"acrolinxApi": {
			"id": "wWJ3Q94oynVivIbw",
			"name": "Acrolinx account"
		}
	}
}
```

## Use Cases

- **Content Quality Assurance**: Check blog posts, documentation, and marketing content
- **Email Enhancement**: Improve business communication
- **Documentation Consistency**: Ensure technical docs follow style guides
- **Multilingual Content**: Adapt content for different English dialects
- **Automated Editing**: Batch process content improvements
- **Brand Voice Compliance**: Maintain consistent tone across content

## Development

Install n8n locally

```
npm install n8n -g
```

Install dependencies after cloning this repository

```
npm install
```

Build the code

```
npm run build
```

Link the build

```
npm link
```

You need to create a `custom` directory inside n8n if it does not exist

```
# In ~/.n8n directory run
mkdir custom
cd custom
npm init
```

Link the custom folder to the build

```
npm link n8n-nodes-acrolinx
```

Start n8n

```
n8n start
```

You should now see Acrolinx in the list of nodes. Happy hacking!
