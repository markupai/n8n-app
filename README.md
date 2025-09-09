![Banner image](https://user-images.githubusercontent.com/10284570/173569848-c624317f-42b1-45a6-ab09-f0ea3c247648.png)

# MarkupAI for n8n

This is an n8n community node that integrates [MarkupAI](https://markup.ai/) text quality and governance platform into your n8n workflows.

[MarkupAI](https://markup.ai/) helps create compliant, consistent, and engaging content by providing AI-powered text analysis, suggestions, and rewrites based on your organization's style guide and tone of voice.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

### Quick Install

In n8n, go to **Settings** > **Community Nodes** and install:

```
n8n-nodes-markupai
```

### Manual Install

```bash
npm install n8n-nodes-markupai
```

## Credentials

You'll need an Markup AI API key:

1. Sign up for an [MarkupAI account](https://markup.ai/)
2. Get your API key from your account settings
3. In n8n, add credentials:
   - Go to **Credentials** > **New**
   - Select **MarkupAI API**
   - Enter your API key
   - Set base URL (default: `https://api.markup.ai`)

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
	"name": "Markup AI workflow",
	"nodes": [
		{
			"parameters": {
				"options": {
					"responseMode": "responseNodes"
				}
			},
			"type": "@n8n/n8n-nodes-langchain.chatTrigger",
			"typeVersion": 1.3,
			"position": [0, 0],
			"id": "93ded2fe-e5ee-4dd8-939e-6fd5c3895efd",
			"name": "When chat message received",
			"webhookId": "0d21af3d-6b17-4a77-ac67-1fe92c86c914"
		},
		{
			"parameters": {
				"operation": "styleRewrite",
				"content": "={{ $json.chatInput }}",
				"styleGuide": "01971e03-dd27-779f-b3ec-b724a2cf809f",
				"tone": "confident",
				"dialect": "american_english",
				"additionalOptions": {}
			},
			"type": "@markupai/n8n-nodes-markupai.markupai",
			"typeVersion": 1,
			"position": [208, 0],
			"id": "2f83ee27-ceb9-4e40-b78d-6a51812fd3d1",
			"name": "Content style rewrite",
			"credentials": {
				"markupaiApi": {
					"id": "TAA9j2TwvdpSkqC8",
					"name": "MarkupAI account"
				}
			}
		},
		{
			"parameters": {
				"message": "={{ $json.rewrite.text }}",
				"waitUserReply": false,
				"options": {}
			},
			"type": "@n8n/n8n-nodes-langchain.chat",
			"typeVersion": 1,
			"position": [416, 0],
			"id": "77a56b71-b36a-4358-8b19-4d961d869a7b",
			"name": "Respond to Chat"
		}
	],
	"pinData": {},
	"connections": {
		"When chat message received": {
			"main": [
				[
					{
						"node": "Content style rewrite",
						"type": "main",
						"index": 0
					}
				]
			]
		},
		"Content style rewrite": {
			"main": [
				[
					{
						"node": "Respond to Chat",
						"type": "main",
						"index": 0
					}
				]
			]
		}
	},
	"active": false,
	"settings": {
		"executionOrder": "v1"
	},
	"versionId": "72fe65f2-ace6-46ba-886d-11067a9234fc",
	"meta": {
		"templateCredsSetupCompleted": true,
		"instanceId": "f44f64e02790168f34e20210cd9f8854fcab3cab729880c8fca1b193c90b5101"
	},
	"id": "iErjnWU83D47JIUG",
	"tags": []
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
npm link n8n-nodes-markupai
```

Start n8n

```
n8n start
```

You should now see MarkupAI in the list of nodes. Happy hacking!
