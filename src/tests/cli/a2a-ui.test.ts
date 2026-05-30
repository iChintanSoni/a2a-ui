import { describe, expect, it } from "vitest";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

async function loadCli() {
  return import(pathToFileURL(resolve("bin/a2a-ui.mjs")).href);
}

describe("a2a-ui CLI arguments", () => {
  it("uses production defaults", async () => {
    const { parseArgs } = await loadCli();

    expect(parseArgs([])).toEqual({
      port: "3000",
      hostname: undefined,
      open: false,
      dev: false,
      help: false,
      version: false,
      passthrough: [],
    });
  });

  it("parses port, hostname, and open options", async () => {
    const { parseArgs } = await loadCli();

    expect(parseArgs(["--port", "3100", "--hostname=127.0.0.1", "--open"])).toMatchObject({
      port: "3100",
      hostname: "127.0.0.1",
      open: true,
    });
  });

  it("supports aliases", async () => {
    const { parseArgs } = await loadCli();

    expect(parseArgs(["-p", "3101", "--host", "localhost"])).toMatchObject({
      port: "3101",
      hostname: "localhost",
    });
  });

  it("passes unknown arguments through only in dev mode", async () => {
    const { parseArgs } = await loadCli();

    expect(parseArgs(["--dev", "--turbo", "--experimental-test-proxy"]).passthrough).toEqual([
      "--turbo",
      "--experimental-test-proxy",
    ]);
    expect(() => parseArgs(["--turbo"])).toThrow(/only supported with --dev/);
  });

  it("parses help and version flags", async () => {
    const { parseArgs } = await loadCli();

    expect(parseArgs(["--help"]).help).toBe(true);
    expect(parseArgs(["--version"]).version).toBe(true);
  });

  it("validates port values", async () => {
    const { parseArgs } = await loadCli();

    expect(() => parseArgs(["--port", "nope"])).toThrow(/Invalid port/);
    expect(() => parseArgs(["--port", "70000"])).toThrow(/between 1 and 65535/);
  });
});
