#!/usr/bin/env node
/**
 * Remove the dist/ output directory so the next build starts from a clean
 * slate. Used by `npm run build` to make sure stale compiled artifacts
 * (e.g. tests that were once compiled into dist/) cannot leak into the
 * published tarball.
 *
 * Equivalent to `rm -rf dist` but cross-platform (works on Windows shells).
 */
import { rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = resolve(repoRoot, "dist");

rmSync(distDir, { recursive: true, force: true });
