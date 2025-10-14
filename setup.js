#!/usr/bin/env node
"use strict";

const { exec } = require("node:child_process");
const { promisify } = require("node:util");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const execAsync = promisify(exec);

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

async function execCommand(command, description) {
	log(`\n${description}...`, colors.blue);
	try {
		await execAsync(command, { stdio: "inherit" });
		log(`✓ ${description} completed`, colors.green);
		return true;
	} catch (error) {
		log(`✗ ${description} failed: ${error.message}`, colors.red);
		return false;
	}
}

async function main() {
	log("\n====", colors.bright);
	log("  n8n-nodes-markupai Development Setup", colors.bright);
	log("====\n", colors.bright);

	// Step 1: Install dependencies (including n8n as devDependency)
	if (!(await execCommand("npm install", "Step 1: Installing dependencies (including n8n)"))) {
		process.exit(1);
	}

	// Step 2: Build the code
	if (!(await execCommand("npm run build", "Step 2: Building the code"))) {
		process.exit(1);
	}

	// Step 3: Link the build from dist folder
	log("\nStep 3: Linking the package from dist folder", colors.blue);
	try {
		const distPath = path.join(process.cwd(), "dist");
		await execAsync("npm link", { cwd: distPath, stdio: "inherit" });
		log("✓ Package linked from dist folder", colors.green);
	} catch (error) {
		log(`✗ Failed to link package: ${error.message}`, colors.red);
		log("\nNote: npm link may require sudo/admin privileges", colors.yellow);
		log("If it failed, try:", colors.yellow);
		log("  cd dist", colors.bright);
		log("  sudo npm link\n", colors.bright);
	}

	// Step 4: Setup custom directory in ~/.n8n
	log("\nStep 4: Setting up n8n custom directory", colors.blue);
	const n8nDir = path.join(os.homedir(), ".n8n");
	const customDir = path.join(n8nDir, "custom");

	try {
		// Create .n8n directory if it doesn't exist
		if (fs.existsSync(n8nDir)) {
			log("✓ .n8n directory already exists", colors.green);
		} else {
			fs.mkdirSync(n8nDir, { recursive: true });
			log("✓ Created .n8n directory", colors.green);
		}

		// Fix permissions for n8n config file if it exists
		const configFile = path.join(n8nDir, "config");
		if (fs.existsSync(configFile)) {
			try {
				fs.chmodSync(configFile, 0o600);
				log("✓ Fixed n8n config file permissions", colors.green);
			} catch (permError) {
				log(`⚠ Could not fix config file permissions: ${permError.message}`, colors.yellow);
				log("You may need to run: chmod 600 ~/.n8n/config", colors.yellow);
			}
		}

		// Create custom directory if it doesn't exist
		if (fs.existsSync(customDir)) {
			log("✓ Custom directory already exists", colors.green);
		} else {
			fs.mkdirSync(customDir, { recursive: true });
			log("✓ Created custom directory", colors.green);
		}

		// Initialize npm in custom directory if package.json doesn't exist
		const customPackageJson = path.join(customDir, "package.json");
		if (fs.existsSync(customPackageJson)) {
			log("✓ Custom directory already initialized", colors.green);
		} else {
			log("Initializing npm in custom directory...", colors.blue);
			await execAsync("npm init -y", { cwd: customDir, stdio: "ignore" });
			log("✓ Initialized npm in custom directory", colors.green);
		}

		// Link the package in custom directory
		log("Linking package in custom directory...", colors.blue);
		try {
			await execAsync("npm link @markupai/n8n-nodes-markupai", {
				cwd: customDir,
				stdio: "inherit",
			});
			log("✓ Package linked in custom directory", colors.green);
		} catch (linkError) {
			log(`✗ Failed to link package in custom directory: ${linkError.message}`, colors.red);
			log("You may need to run this manually:", colors.yellow);
			log(`  cd ${customDir}`, colors.bright);
			log("  npm link @markupai/n8n-nodes-markupai\n", colors.bright);
		}
	} catch (error) {
		log(`✗ Error setting up custom directory: ${error.message}`, colors.red);
		log("You may need to set up the custom directory manually.", colors.yellow);
	}

	// Final message
	log("\n====", colors.bright);
	log("  Setup Complete!", colors.green);
	log("====\n", colors.bright);

	log("To start n8n with your development node, run:", colors.yellow);
	log("  npm start\n", colors.bright);

	log("This will use the local n8n from devDependencies.", colors.blue);
	log("You should now see Markup AI in the list of nodes.", colors.green);
	log("Happy hacking! 🚀\n", colors.green);
}

// Run the main function
main().catch((error) => {
	console.error("Setup failed:", error);
	process.exit(1);
});
