import { describe, expect, it } from "vitest";

import consultHeader, { renderConsultHeader } from "../consult/extensions/consult-header.ts";

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
    model: { id: "test-model" },
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
  it("renders the selected large Consult ASCII header with session context and no border", () => {
    const lines = renderConsultHeader(80, "test-model · repo");
    const plainText = lines.join("\n");

    expect(plainText).toContain("   ______ ____   _   __ _____ __  __ __  ______");
    expect(plainText).toContain("  / ____// __ \\ / | / // ___// / / // / /_  __/");
    expect(plainText).toContain("\\____/ \\____//_/ |_//____/ \\____//_____/_/");
    expect(plainText).not.toContain(" / __ )/ __ \\");
    expect(plainText).toContain("test-model · repo");
    expect(plainText).not.toContain("practical guidance");
    expect(plainText).not.toContain("proven software");
    expect(plainText).not.toContain("╭");
    expect(plainText).not.toContain("╰");
  });

  it("colors the startup logo with pi's context green", () => {
    const lines = renderConsultHeader(80, "test-model · repo");

    expect(lines.join("\n")).toContain("\x1b[38;2;181;189;104m   ______ ____   _   __ _____ __  __ __  ______");
  });

  it("installs the startup header when a UI session starts", async () => {
    const pi = makePi();
    const ctx = makeContext();
    consultHeader(pi);

    await pi.handlers.get("session_start")({}, ctx);

    expect(ctx.ui.calls).toHaveLength(1);
    const component = ctx.ui.calls[0]({}, { fg: (_name, text) => text });
    expect(component.render(80).join("\n")).toContain("CONSULT");
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
