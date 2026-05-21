#!/usr/bin/env node

import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const root = dirname(dirname(__filename));
const nextDir = join(root, ".next");
const standaloneDir = join(nextDir, "standalone");
const staticDir = join(nextDir, "static");
const publicDir = join(root, "public");
const packageJsonPath = join(root, "package.json");
const standalonePackageJsonPath = join(standaloneDir, "package.json");

if (!existsSync(standaloneDir)) {
  throw new Error("Missing .next/standalone. Run `next build` before preparing the package.");
}

function copyDirectory(source, destination) {
  if (!existsSync(source)) {
    return false;
  }

  rmSync(destination, { recursive: true, force: true });
  mkdirSync(dirname(destination), { recursive: true });
  cpSync(source, destination, { recursive: true });
  return true;
}

const copiedPublic = copyDirectory(publicDir, join(standaloneDir, "public"));
const copiedStatic = copyDirectory(staticDir, join(standaloneDir, ".next", "static"));
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
const standalonePackageJson = {
  name: packageJson.name,
  version: packageJson.version,
  description: packageJson.description,
  private: true,
  dependencies: packageJson.dependencies,
  engines: packageJson.engines,
};

writeFileSync(
  standalonePackageJsonPath,
  `${JSON.stringify(standalonePackageJson, null, 2)}\n`,
);

console.log("Prepared Next.js standalone package:");
console.log(`- public assets: ${copiedPublic ? "copied" : "skipped"}`);
console.log(`- static assets: ${copiedStatic ? "copied" : "skipped"}`);
console.log("- standalone manifest: sanitized");
