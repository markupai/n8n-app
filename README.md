![Banner image](https://user-images.githubusercontent.com/10284570/173569848-c624317f-42b1-45a6-ab09-f0ea3c247648.png)

# Markup AI for n8n

This is an n8n community node that integrates [Markup AI](https://markup.ai/) a content guardian platform into your n8n workflows.

[Markup AI](https://markup.ai/) helps create compliant, consistent, and engaging content by providing AI-powered content analysis, suggestions, and rewrites based on your organization's style guide and tone of voice.

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

## Pre-Requisites

You'll need a Markup AI API key:

1. Sign up for a [Markup AI account](https://markup.ai/#early-access)
2. Get your API key from your account settings
3. In n8n, add credentials:
   - Go to **Credentials** > **New**
   - Select **Markup AI API**
   - Enter your API key
   - Set base URL (default: `https://api.markup.ai`)

## Usage

### Style Check Action

Analyze content for quality issues without making changes. Returns:

- Quality, clarity, and grammar scores
- Style guide compliance
- Tone analysis
- Readability metrics
- Identified issues

### Style Rewrite Action

Automatically rewrite and improve content using AI. Returns:

- Improved content version
- Before/after quality scores
- Score improvements

## Options

All content operations support:

- **Dialect**: The dialect to be used
- **Tone**: The tone to be used
- **Style Guide**: The style guide to be used
- **Wait for Completion**: Auto-poll for results (default: true)
- **Polling Timeout**: Max wait time in ms (default: 60000)
- **Polling Interval**: Check frequency in ms (default: 2000)

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

You should now see Markup AI in the list of nodes. Happy hacking!
