"use strict";

import path from "node:path";
import { task, src, dest } from "gulp";
import fs from "node:fs";

task("build:icons", copyIcons);
task("build:package", copyPackageJson);

function copyIcons() {
	const nodeSource = path.resolve("nodes", "**", "*.{png,svg}");
	const nodeDestination = path.resolve("dist", "nodes");

	src(nodeSource).pipe(dest(nodeDestination));

	const credSource = path.resolve("credentials", "**", "*.{png,svg}");
	const credDestination = path.resolve("dist", "credentials");

	return src(credSource).pipe(dest(credDestination));
}

function copyPackageJson(cb) {
	try {
		const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));

		// Remove devDependencies and scripts that are only needed for development
		const distPackageJson = {
			...packageJson,
			devDependencies: undefined,
			scripts: undefined,
		};

		fs.writeFileSync(
			path.resolve("dist", "package.json"),
			JSON.stringify(distPackageJson, null, 2),
		);

		cb();
	} catch (err) {
		console.error("Error copying package.json:", err.message);
		cb(err);
	}
}
