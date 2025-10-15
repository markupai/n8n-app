![Banner image](https://user-images.githubusercontent.com/10284570/173569848-c624317f-42b1-45a6-ab09-f0ea3c247648.png)

# n8n-nodes-markupai

This is an n8n community node that integrates [Markup AI](https://markup.ai/) — a content guardian platform for ensuring brand-compliant, consistent, and engaging content.

[Markup AI](https://markup.ai/) provides AI-powered content analysis, suggestions, and rewrites based on your organization's brand standards. Integrate content quality checks and automated improvements directly into your n8n workflows.

[Installation](#installation) · [Operations](#operations) · [Credentials](#credentials) · [Usage](#usage) · [Resources](#resources) · [Development](#development)

## Installation

### Community Nodes (Recommended)

1. In n8n, go to **Settings** > **Community Nodes**
2. Select **Install**
3. Enter `@markupai/n8n-nodes-markupai` in the package field
4. Click **Install**

For detailed instructions, visit the [n8n community nodes installation guide](https://docs.n8n.io/integrations/community-nodes/installation/).

### Manual Installation

To install manually, run the following command in your n8n installation directory:

```bash
npm install @markupai/n8n-nodes-markupai
```

## Operations

The Markup AI node supports the following operations:

### Style Check

Analyze content for quality issues without making changes.

**Returns:**

- Quality, clarity, and grammar scores
- Style guide compliance metrics
- Tone analysis
- Readability metrics
- Detailed list of identified issues

### Style Rewrite

Automatically rewrite and improve content using AI.

**Returns:**

- Improved content version
- Before/after quality scores
- Score improvements
- Comparison metrics

## Credentials

To use this node, you'll need a Markup AI API account.

### Setting up credentials:

1. Sign up for a [Markup AI account](https://markup.ai/#early-access)
2. Get your API key from your account settings
3. In n8n, add new credentials:
   - Go to **Credentials** > **New**
   - Search for **Markup AI API**
   - Enter your API key
   - Click **Save**

## Usage

### Configuration Options

All operations support the following options:

| Option                  | Type    | Default | Description                                 |
| ----------------------- | ------- | ------- | ------------------------------------------- |
| **Style Guide**         | String  | -       | The style guide to apply                    |
| **Dialect**             | String  | -       | The dialect to be used for content analysis |
| **Tone**                | String  | -       | The desired tone for content (optional)     |
| **Wait for Completion** | Boolean | `true`  | Auto-poll for results                       |
| **Polling Timeout**     | Number  | `60000` | Maximum wait time in milliseconds           |
| **Polling Interval**    | Number  | `2000`  | Polling frequency in milliseconds           |

### Example Workflows

#### Content Quality Gate

1. Trigger: New document added to Google Drive
2. **Markup AI** → Style Check: Analyze document content
3. Condition: Check if quality score meets threshold
4. If passed: Approve and publish
5. If failed: Send notification to content team

#### Automated Content Improvement

1. Trigger: Webhook receives content for publication
2. **Markup AI** → Style Check: Analyze initial quality
3. **Markup AI** → Style Rewrite: Improve content
4. Send improved version to CMS for publication

### Common Use Cases

- **Content Compliance & Consistency**: Ensure all company content — from blogs and web pages to documentation and marketing materials — aligns with brand and style guidelines while maintaining a consistent tone.

- **Automated Quality Gates**: Ensure content meets standards automatically before publication. Monitor content changes in real-time and prevent non-compliant content from going live.

- **Quality at the Source**: Create and maintain high-quality content right where it's produced. Proactively monitor consistency and compliance across CMS platforms like Google Drive and beyond.

- **Early Issue Detection**: Automatically identify and flag potential issues or non-compliant content within workflows before they become problems.

- **Streamlined Content Compliance**: Minimize manual reviews by automating content compliance checks and review processes throughout your content lifecycle.

- **Actionable Alerts**: Go beyond flagging issues — automatically trigger notifications to stakeholders within workflows, transforming compliance checks into immediate corrective actions.

## Resources

- [Markup AI Documentation](https://docs.markup.ai/)
- [Markup AI Website](https://markup.ai/)
- [n8n Community Nodes Documentation](https://docs.n8n.io/integrations/community-nodes/)
- [n8n Documentation](https://docs.n8n.io/)
- [GitHub Repository](https://github.com/markupai/n8n-app)

## Development

Contributions are welcome! This section is for developers who want to contribute to this community node or set up a local development environment.

### Prerequisites

- Node.js >= 20
- npm
- Basic familiarity with n8n and TypeScript

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

This uses the local n8n installation from devDependencies — no global installation needed!

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

### Making Changes

1. Make your changes in the `nodes/` or `credentials/` directories
2. Build the code: `npm run build`
3. Test in n8n (refresh the browser if n8n is already running)
4. Run tests: `npm test`
5. Run linter: `npm run lint`

### Testing

Run the test suite:

```bash
npm test
```

Run tests with coverage:

```bash
npm run test:coverage
```

Run tests in watch mode during development:

```bash
npm run test:watch
```

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

## License

[MIT](LICENSE)

## Support

- For general n8n questions: [n8n Community Forum](https://community.n8n.io/)
- For Markup AI API questions: [Markup AI Support](https://community.markup.ai/c/markup-ai-integrations/6)

---

Made with ❤️ by the Markup AI team
