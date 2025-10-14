#!/usr/bin/env node

const { execSync } = require("node:child_process");
const path = require("node:path");
const os = require("node:os");

const colors = {
	reset: "\x1b[0m",
	bright: "\x1b[1m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	blue: "\x1b[34m",
	red: "\x1b[31m",
};

function log(message, color = colors.reset) {
	console.log(`${color}${message}${colors.reset}`);
}

log("\n==============================================", colors.bright);
log("  Cleanup Development Links", colors.bright);
log("==============================================\n", colors.bright);

// Unlink from custom directory
log("Step 1: Unlinking from custom directory", colors.blue);
try {
	const customDir = path.join(os.homedir(), ".n8n", "custom");
	execSync("npm unlink @markupai/n8n-nodes-markupai", { cwd: customDir, stdio: "inherit" });
	log("✓ Unlinked from custom directory", colors.green);
} catch (error) {
	log(`⚠ Could not unlink from custom directory: ${error.message}`, colors.yellow);
	log("This is normal if the package was not previously linked.", colors.yellow);
}

// Unlink from global
log("\nStep 2: Unlinking from global npm", colors.blue);
try {
	execSync("npm unlink -g @markupai/n8n-nodes-markupai", { stdio: "inherit" });
	log("✓ Unlinked from global npm", colors.green);
} catch (error) {
	log(`⚠ Could not unlink from global npm: ${error.message}`, colors.yellow);
	log("This is normal if the package was not previously linked.", colors.yellow);
}

log("\n==============================================", colors.bright);
log("  Cleanup Complete!", colors.green);
log("==============================================\n", colors.bright);

log("You can now run:", colors.yellow);
log("  npm run setup\n", colors.bright);
log("to set up the development environment correctly.\n", colors.green);
