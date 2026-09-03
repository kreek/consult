import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { resolveTestConfig } from "../src/proof/test-config.ts";

async function writePackageJson(dir, testScript = "echo test") {
  await writeFile(
    join(dir, "package.json"),
    JSON.stringify({ type: "module", scripts: { test: testScript } }, null, 2),
  );
}

describe("proof test config resolution", () => {
  it("prefers a project-local Pi extension test project over workspace child repos", async () => {
    const root = await mkdtemp(join(tmpdir(), "consult-proof-workspace-"));
    const childRepo = join(root, "event-bus-service");
    const extension = join(root, ".pi", "extensions", "review-widget");
    await mkdir(childRepo, { recursive: true });
    await mkdir(extension, { recursive: true });
    await writePackageJson(childRepo);
    await writePackageJson(extension);

    await expect(resolveTestConfig(root, undefined)).resolves.toEqual({
      command: "npm test",
      cwd: extension,
    });
  });

  it("does not fall through to child repos when Pi extension test project selection is ambiguous", async () => {
    const root = await mkdtemp(join(tmpdir(), "consult-proof-workspace-"));
    const childRepo = join(root, "event-bus-service");
    const firstExtension = join(root, ".pi", "extensions", "review-widget");
    const secondExtension = join(root, ".pi", "extensions", "audit-widget");
    await mkdir(childRepo, { recursive: true });
    await mkdir(firstExtension, { recursive: true });
    await mkdir(secondExtension, { recursive: true });
    await writePackageJson(childRepo);
    await writePackageJson(firstExtension);
    await writePackageJson(secondExtension);

    await expect(resolveTestConfig(root, undefined)).resolves.toBeUndefined();
  });
});
