#!/usr/bin/env node
/**
 * Refuse to publish a prerelease version. Reads package.json's `version`
 * and exits non-zero if it isn't a clean `MAJOR.MINOR.PATCH` semver string
 * (e.g. blocks `0.3.0-rc.1`).
 *
 * Wired into `prepublishOnly` so `npm publish` aborts before pushing a
 * prerelease tag to the stable npm channel.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SEMVER_RE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pkgPath = resolve(repoRoot, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));

if (!SEMVER_RE.test(pkg.version)) {
  console.error(`Refusing to publish prerelease version: ${pkg.version}`);
  process.exit(1);
}
