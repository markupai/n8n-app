![Banner image](https://user-images.githubusercontent.com/10284570/173569848-c624317f-42b1-45a6-ab09-f0ea3c247648.png)

# Markup AI for n8n

This is an n8n community node that integrates [Markup AI](https://markup.ai/) a content guardian platform into your n8n
workflows.

[Markup AI](https://markup.ai/) helps create compliant, consistent, and engaging content by providing AI-powered content
analysis, suggestions, and rewrites based on your organization's style guide and tone of voice.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community
nodes documentation.

### Quick Install

In n8n, go to **Settings** > **Community Nodes** and install:

```
@markupai/n8n-nodes-markupai
```

### Manual Install

```bash
npm install @markupai/n8n-nodes-markupai
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

- **Content Compliance & Consistency**: Ensure all company content — from blogs and web pages to documentation and
  marketing materials — aligns with brand and style guidelines while maintaining a consistent tone.
- **Automated Quality Gates**: Ensuring content meets standards automatically. Keeping an eye on content changes in
  real-time.
- **Quality at the Source**: Quality at the Source: Create and maintain high-quality content right where it’s produced.
  Proactively monitor consistency and compliance across CMS platforms like Google Drive and beyond.
- **Early Issue Detection**: Automatically identify and flag potential issues or non-compliant content within workflows
  before they become problems.
- **Streamlined Content Compliance**: Minimize manual reviews by automating content compliance checks and review
  processes.
- **Actionable Alerts**: Go beyond flagging issues — automatically trigger notifications to stakeholders within
  workflows, transforming compliance checks into immediate corrective actions.

## Development

### Quick Setup (Recommended)

After cloning this repository, run the automated setup script:

```bash
npm run setup
```

This will:
- Install dependencies (including n8n as a devDependency)
- Build the code and create the dist folder
- Link the package from the dist folder (avoiding node_modules conflicts)
- Configure the n8n custom directory
- Fix n8n config file permissions
- Link the package for local development

Then start n8n:

```bash
npm start
```

This uses the local n8n installation from devDependencies - no global installation needed!

**Note:** The setup links from the `dist` folder rather than the project root. This ensures that n8n only loads the compiled code without development dependencies, preventing module loading conflicts.

### Manual Setup

If you prefer to set things up manually:

1. Install dependencies after cloning this repository

```bash
npm install
```

2. Build the code

```bash
npm run build
```

3. Link the build from the dist folder

```bash
cd dist
npm link
cd ..
```

4. Create a `custom` directory inside n8n if it does not exist

```bash
# In ~/.n8n directory run
mkdir -p ~/.n8n/custom
cd ~/.n8n/custom
npm init -y
```

5. Link the custom folder to the build

```bash
npm link @markupai/n8n-nodes-markupai
```

6. Fix n8n config file permissions (if needed)

```bash
chmod 600 ~/.n8n/config
```

7. Start n8n

```bash
# Back in your project directory
npm start
```

You should now see Markup AI in the list of nodes. Happy hacking!

### Troubleshooting

**Module loading errors**: If you see errors like `require(...).index is not a constructor`, make sure you've linked from the `dist` folder, not the project root. To fix:

```bash
npm run cleanup  # Remove old links
npm run setup    # Set up correctly
```

**Permissions errors**: If you see warnings about file permissions, run `chmod 600 ~/.n8n/config` to fix them.

**Resetting the development environment**: If you need to start fresh:

```bash
npm run cleanup  # Removes all npm links
npm run setup    # Sets up from scratch
```
