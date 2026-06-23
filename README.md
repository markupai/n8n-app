![Banner image](https://user-images.githubusercontent.com/10284570/173569848-c624317f-42b1-45a6-ab09-f0ea3c247648.png)

# n8n-nodes-markupai

This is an n8n community node that integrates [Markup AI](https://markup.ai/) — a content guardian platform for ensuring brand-compliant, consistent, and engaging content.

[Markup AI](https://markup.ai/) provides AI-powered content analysis through specialized agents (for example terminology, claims, focus, and AI voice detection). Integrate agent-based quality checks and automated improvements directly into your n8n workflows.

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

The Markup AI node currently supports one operation:

### Run Agent

Run the Markup AI Style Agent on input text.

- **Execution model:** Calls `POST /agents/{id}/run` and polls `GET /agents/workflows/{id}` until the workflow reaches a terminal state (`completed`, `failed`, `timed_out`, or `cancelled`) or the configured timeout elapses.
- **Gating:** The node fails fast if your organization has `style_agent: "disabled"` in `/style-agent/config`.

**Returns (success):**

- `workflow_id`, `status`, `started_at`, `completed_at`, `duration_seconds`
- `document_ref` (echoed back from your input, when provided)
- `result` (agent output payload)
- `issue_counts` (`total`, `high`, `medium`, `low` computed from `result.issues`)
- `html_report` (rendered HTML report of issues and workflow metadata)

**Returns (failure with "Continue On Fail"):** When the node is configured with **Continue On Fail** and the run errors, the item output is simply `{ error: "<message>" }`. Without Continue On Fail, errors are thrown as n8n node-operation errors and the workflow stops.

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

The **Run Agent** operation supports the following configuration:

| Option                                      | Type               | Required | Default  | Description                                                                                                 |
| ------------------------------------------- | ------------------ | -------- | -------- | ----------------------------------------------------------------------------------------------------------- |
| **Agent**                                   | Single-select      | Yes      | -        | Select the agent to run. Currently only `style_agent` is exposed.                                           |
| **Style Guide**                             | Single-select      | No       | -        | Style agent style guide. Loaded from `GET /style-agent/style-guides`. Defaults to your default style guide. |
| **Content**                                 | String (multiline) | Yes      | -        | Document text to analyze.                                                                                   |
| **Additional Options → Document Name**      | String             | No       | `""`     | Human-readable name of the document being analyzed.                                                         |
| **Additional Options → Document Reference** | String             | No       | `""`     | Caller-supplied identifier (e.g. CMS page ID) echoed back in the result for tracking.                       |
| **Additional Options → Timeout (Ms)**       | Number             | No       | `120000` | Maximum time to wait while polling workflow status before returning a timeout error.                        |

Organization and content profile are auto-detected from the API key — there is no input for them.

### Example Workflows

#### Content Quality Gate

1. Trigger: New document added to Google Drive
2. **Markup AI** → Run Agent: Select one or more compliance-focused agents
3. Condition: Check `status` and evaluate returned issues from `result`
4. If passed: Approve and publish
5. If failed: Send notification to content team

#### Automated Content Improvement

1. Trigger: Webhook receives content for publication
2. **Markup AI** → Run Agent: Analyze with selected agents (for example terminology + generic claims)
3. Send improved version to CMS for publication

### Common Use Cases

- **Content Compliance & Consistency**: Ensure all company content — from blogs and web pages to documentation and marketing materials — aligns with brand and style guidelines while maintaining a consistent tone.

- **Automated Quality Gates**: Ensure content meets standards automatically before publication. Monitor content changes in real-time and prevent non-compliant content from going live.

- **Quality at the Source**: Create and maintain high-quality content right where it's produced. Proactively monitor consistency and compliance across CMS platforms like Google Drive and beyond.

- **Early Issue Detection**: Automatically identify and flag potential issues or non-compliant content within workflows before they become problems.

- **Streamlined Content Compliance**: Minimize manual reviews by automating content compliance checks and review processes throughout your content lifecycle.

- **Actionable Alerts**: Go beyond flagging issues — automatically trigger notifications to stakeholders within workflows, transforming compliance checks into immediate corrective actions.

## Resources

- [Markup AI Website](https://markup.ai/)
- [n8n Community Nodes Documentation](https://docs.n8n.io/integrations/community-nodes/)
- [n8n Documentation](https://docs.n8n.io/)
- [GitHub Repository](https://github.com/markupai/n8n-app)

## Development

Contributions are welcome! This section is for developers who want to contribute to this community node or set up a local development environment.

### Prerequisites

- Node.js >= 22.16
- npm
- Basic familiarity with n8n and TypeScript

### Quick Start (Recommended)

After cloning this repository:

```bash
npm install
npm start
```

That's it. `npm start` runs `n8n-node dev` (the official [`@n8n/node-cli`](https://github.com/n8n-io/n8n-nodes-starter) toolchain), which:

- builds the node in watch mode (rebuilds automatically on file changes),
- starts n8n in a subprocess with this node pre-loaded,
- opens the editor at http://localhost:5678.

You do **not** need n8n installed globally. The CLI bundles a compatible n8n version for you.

The dev n8n stores its data in `~/.n8n-node-cli/.n8n/` (separate from any other n8n install you may have at `~/.n8n/`).

**First-time SQLite fix:** If `npm start` errors with `SQLite package has not been found installed`, the sqlite3 native binding in the npx cache needs to be rebuilt for your Node version. The `@n8n/node-cli` toolchain caches n8n under a hash-named directory; this one-liner finds it and rebuilds:

```bash
cd "$(find ~/.npm/_npx -maxdepth 4 -type d -path '*/node_modules/n8n' -print -quit | xargs dirname | xargs dirname)"
npm rebuild sqlite3
```

Then re-run `npm start`.

### Manual Setup (alternative)

If you prefer to run an n8n instance you already have installed (e.g. global install, Docker, an existing `~/.n8n/`), use the `npm link` workflow:

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

7. Start your own n8n instance (e.g. `n8n start` if globally installed). You should now see Markup AI in the list of nodes.

`npm run setup` automates steps 1–6 of this flow.

### Making Changes

1. Make your changes in the `nodes/` or `credentials/` directories
2. Build the code: `npm run build`
3. Test in n8n (refresh the browser if n8n is already running)
4. Run tests: `npm test`
5. Run linter: `npm run lint:check`

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

**`SQLite package has not been found installed` on `npm start`**: The sqlite3 native binding in the `@n8n/node-cli` npx cache wasn't built for your Node version. Rebuild it once:

```bash
cd "$(find ~/.npm/_npx -maxdepth 4 -type d -path '*/node_modules/n8n' -print -quit | xargs dirname | xargs dirname)"
npm rebuild sqlite3
```

**Resetting the dev n8n instance**: If you want a clean slate (forget owner setup, credentials, workflows), nuke the dev user folder:

```bash
rm -rf ~/.n8n-node-cli/
```

The next `npm start` will prompt you to create the owner account again.

**Module loading errors (manual setup only)**: If you're using the Manual Setup path and see errors like `require(...).index is not a constructor`, make sure you've linked from the `dist` folder, not the project root. To fix:

```bash
npm run cleanup  # Remove old links
npm run setup    # Set up correctly
```

**Permissions errors (manual setup only)**: If you see warnings about file permissions, run `chmod 600 ~/.n8n/config` to fix them.

**Debugging setup issues**: If you encounter problems during setup, enable debug mode for detailed output:

```bash
DEBUG=1 npm run setup    # Verbose setup with debug information
DEBUG=1 npm run cleanup  # Verbose cleanup with debug information
```

This will show:

- Exact commands being executed
- Full command output (both stdout and stderr)
- Detailed error information when commands fail
- Working directory for each command

## License

[MIT](LICENSE)

## Support

- For general n8n questions: [n8n Community Forum](https://community.n8n.io/)
- For Markup AI API questions: [Markup AI Support](https://community.markup.ai/c/markup-ai-integrations/6)

---

Made with ❤️ by the Markup AI team
