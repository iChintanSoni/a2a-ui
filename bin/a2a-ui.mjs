#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync, realpathSync } from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageRoot = dirname(__dirname);
const require = createRequire(import.meta.url);

const DEFAULT_PORT = "3000";
const OPEN_DELAY_MS = 1500;

export function parseArgs(args) {
  const options = {
    port: DEFAULT_PORT,
    hostname: undefined,
    open: false,
    dev: false,
    help: false,
    version: false,
    passthrough: [],
  };
  const unknown = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--") {
      unknown.push(...args.slice(index + 1));
      break;
    }

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    if (arg === "--version" || arg === "-v") {
      options.version = true;
      continue;
    }

    if (arg === "--open") {
      options.open = true;
      continue;
    }

    if (arg === "--dev") {
      options.dev = true;
      continue;
    }

    if (arg === "--port" || arg === "-p") {
      options.port = readOptionValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg.startsWith("--port=")) {
      options.port = readInlineValue(arg, "--port");
      continue;
    }

    if (arg === "--hostname" || arg === "--host") {
      options.hostname = readOptionValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg.startsWith("--hostname=")) {
      options.hostname = readInlineValue(arg, "--hostname");
      continue;
    }

    if (arg.startsWith("--host=")) {
      options.hostname = readInlineValue(arg, "--host");
      continue;
    }

    unknown.push(arg);
  }

  validatePort(options.port);

  if (unknown.length > 0) {
    if (!options.dev) {
      throw new Error(
        `Unknown argument${unknown.length > 1 ? "s" : ""}: ${unknown.join(
          " ",
        )}. Extra Next.js arguments are only supported with --dev.`,
      );
    }

    options.passthrough = unknown;
  }

  return options;
}

export function getPackageVersion(root = packageRoot) {
  const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  return packageJson.version;
}

export function helpText() {
  return `a2a-ui

Usage:
  a2a-ui [options]

Options:
  -p, --port <port>          Port to listen on (default: 3000)
      --hostname <hostname>  Hostname to bind
      --host <hostname>      Alias for --hostname
      --open                 Open the UI in the default browser
      --dev                  Run Next.js development mode
  -v, --version              Print the package version
  -h, --help                 Show this help

Examples:
  npx a2a-ui
  npx a2a-ui --port 3100 --open
  npx a2a-ui --dev
`;
}

function readOptionValue(args, index, flag) {
  const value = args[index + 1];

  if (!value || value.startsWith("-")) {
    throw new Error(`Missing value for ${flag}.`);
  }

  return value;
}

function readInlineValue(arg, flag) {
  const value = arg.slice(flag.length + 1);

  if (!value) {
    throw new Error(`Missing value for ${flag}.`);
  }

  return value;
}

function validatePort(port) {
  if (!/^\d+$/.test(port)) {
    throw new Error(`Invalid port: ${port}.`);
  }

  const value = Number(port);
  if (value < 1 || value > 65535) {
    throw new Error(`Port must be between 1 and 65535: ${port}.`);
  }
}

function localUrl({ hostname, port }) {
  const host =
    !hostname || hostname === "0.0.0.0" || hostname === "::" ? "localhost" : hostname;
  return `http://${host}:${port}`;
}

function openBrowser(url) {
  const command =
    process.platform === "darwin"
      ? "open"
      : process.platform === "win32"
        ? "cmd"
        : "xdg-open";
  const args =
    process.platform === "darwin"
      ? [url]
      : process.platform === "win32"
        ? ["/c", "start", "", url]
        : [url];

  const child = spawn(command, args, {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
}

function scheduleOpen(options) {
  if (!options.open) {
    return;
  }

  const timer = setTimeout(() => {
    openBrowser(localUrl(options));
  }, OPEN_DELAY_MS);
  timer.unref();
}

function resolveNextBin() {
  return require.resolve("next/dist/bin/next");
}

function spawnServer(command, args, env) {
  const child = spawn(command, args, {
    cwd: packageRoot,
    env,
    stdio: "inherit",
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 0);
  });

  child.on("error", (error) => {
    console.error(error.message);
    process.exit(1);
  });

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.once(signal, () => {
      if (!child.killed) {
        child.kill(signal);
      }
    });
  }
}

function runDev(options) {
  const env = {
    ...process.env,
    NEXT_TELEMETRY_DISABLED: "1",
  };
  const args = ["dev", "--port", options.port];

  if (options.hostname) {
    args.push("--hostname", options.hostname);
  }

  args.push(...options.passthrough);
  scheduleOpen(options);
  spawnServer(process.execPath, [resolveNextBin(), ...args], env);
}

function runProduction(options) {
  const standaloneServer = join(packageRoot, ".next", "standalone", "server.js");

  if (!existsSync(standaloneServer)) {
    throw new Error(
      "Missing production build. Reinstall a published package or run `a2a-ui --dev` from source.",
    );
  }

  const env = {
    ...process.env,
    NODE_ENV: "production",
    NEXT_TELEMETRY_DISABLED: "1",
    PORT: options.port,
  };

  if (options.hostname) {
    env.HOSTNAME = options.hostname;
  }

  scheduleOpen(options);
  spawnServer(process.execPath, [standaloneServer], env);
}

export function main(argv = process.argv.slice(2)) {
  let options;

  try {
    options = parseArgs(argv);
  } catch (error) {
    console.error(error.message);
    console.error("");
    console.error(helpText());
    process.exit(1);
  }

  if (options.help) {
    console.log(helpText());
    return;
  }

  if (options.version) {
    console.log(getPackageVersion());
    return;
  }

  try {
    if (options.dev) {
      runDev(options);
    } else {
      runProduction(options);
    }
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

function isDirectRun() {
  if (!process.argv[1]) {
    return false;
  }

  try {
    return realpathSync(process.argv[1]) === __filename;
  } catch {
    return process.argv[1] === __filename;
  }
}

if (isDirectRun()) {
  main();
}
