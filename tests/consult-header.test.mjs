import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import consultHeader, { renderConsultHeader } from "../consult/extensions/consult-header.ts";

const consultPackage = JSON.parse(readFileSync(new URL("../consult/package.json", import.meta.url), "utf8"));

function makePi() {
  const handlers = new Map();
  const commands = new Map();

  return {
    handlers,
    commands,
    on(event, handler) {
      handlers.set(event, handler);
    },
    registerCommand(name, command) {
      commands.set(name, command);
    },
  };
}

function makeContext() {
  const calls = [];

  return {
    hasUI: true,
    model: { id: "test-model", provider: "test-provider" },
    ui: {
      calls,
      setHeader(value) {
        calls.push(value);
      },
      notify(message, level) {
        calls.push({ message, level });
      },
    },
  };
}

describe("Consult Pi startup header", () => {
  it("renders the selected large Consult ASCII header with provider, model, and Consult version only", () => {
    const lines = renderConsultHeader(80, "test-model", "test-provider");
    const plainText = lines.join("\n");

    expect(plainText).toContain("┏━╸┏━┓┏┓╻┏━┓╻ ╻╻ ╺┳╸");
    expect(plainText).toContain("┃  ┃ ┃┃┗┫┗━┓┃ ┃┃  ┃ ");
    expect(plainText).toContain("┗━╸┗━┛╹ ╹┗━┛┗━┛┗━╸╹ ");
    expect(plainText).not.toContain(" / __ )/ __ \\");
    expect(plainText).toContain(`(test-provider) test-model · consult ${consultPackage.version}`);
    expect(plainText).not.toContain("test-model · repo");
    expect(plainText).not.toContain("\x1b[1m\x1b[38;2;181;189;104mCONSULT");
    expect(plainText).not.toContain("practical guidance");
    expect(plainText).not.toContain("proven software");
    expect(plainText).not.toContain("╭");
    expect(plainText).not.toContain("╰");
  });

  it("colors the startup logo with pi's context green", () => {
    const lines = renderConsultHeader(80, "test-model", "test-provider");

    expect(lines.join("\n")).toContain("\x1b[38;2;181;189;104m┏━╸┏━┓┏┓╻┏━┓╻ ╻╻ ╺┳╸");
  });

  it("installs the startup header when a UI session starts", async () => {
    const pi = makePi();
    const ctx = makeContext();
    consultHeader(pi);

    await pi.handlers.get("session_start")({}, ctx);

    expect(ctx.ui.calls).toHaveLength(1);
    const component = ctx.ui.calls[0]({}, { fg: (_name, text) => text });
    const rendered = component.render(80).join("\n");
    expect(rendered).toContain("┏━╸┏━┓┏┓╻┏━┓╻ ╻╻ ╺┳╸");
    expect(rendered).toContain(`(test-provider) test-model · consult ${consultPackage.version}`);
    expect(rendered).not.toContain("test-model · consult\n");
  });

  it("registers commands to toggle the startup header for the current session", async () => {
    const pi = makePi();
    const ctx = makeContext();
    consultHeader(pi);

    await pi.commands.get("consult:header-off").handler("", ctx);
    await pi.commands.get("consult:header-on").handler("", ctx);

    expect(ctx.ui.calls[0]).toBeUndefined();
    expect(ctx.ui.calls.at(-1)).toEqual({ message: "Consult startup header enabled", level: "info" });
  });
});
