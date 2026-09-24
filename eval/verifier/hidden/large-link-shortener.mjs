import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import assert from "node:assert/strict";

if (!existsSync("src/server.js")) {
  throw new Error("src/server.js missing; cannot exercise link-shortener endpoints.");
}

const PORT = String(20000 + Math.floor(Math.random() * 10000));
const server = spawn(process.execPath, ["--experimental-sqlite", "src/server.js"], {
  cwd: process.cwd(),
  env: { ...process.env, PORT },
  stdio: ["ignore", "ignore", "pipe"],
});
let stderr = "";
server.stderr.on("data", (d) => { stderr += d.toString(); });
server.on("error", () => {});

const base = "http://localhost:" + PORT;
const fail = (msg) => {
  server.kill("SIGKILL");
  throw new Error(msg + (stderr ? "\n--- server stderr ---\n" + stderr.slice(-1500) : ""));
};

let ready = false;
for (let i = 0; i < 50; i++) {
  if (server.exitCode !== null) fail("server exited before becoming ready (exit " + server.exitCode + ")");
  try {
    const r = await fetch(base + "/", { signal: AbortSignal.timeout(500) });
    if (r.status < 500) { ready = true; break; }
  } catch (_) {}
  await new Promise((r) => setTimeout(r, 200));
}
if (!ready) fail("server did not become ready within 10s");

const postJson = (body) =>
  fetch(base + "/shorten", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

try {
  const home = await fetch(base + "/");
  assert.equal(home.status, 200, "GET / should be 200, got " + home.status);
  const homeBody = await home.text();
  assert.ok(/htmx/i.test(homeBody), "home page must reference htmx");
  assert.ok(/alpine/i.test(homeBody), "home page must reference alpine");

  const target = "https://example.com/foo";
  const post = await postJson({ url: target });
  assert.ok(post.status >= 200 && post.status < 300, "POST /shorten should be 2xx, got " + post.status);
  const postBody = await post.text();

  let slug = null;
  try {
    const parsed = JSON.parse(postBody);
    slug = parsed?.slug ?? parsed?.short ?? parsed?.shortSlug ?? null;
    if (!slug && typeof parsed?.shortUrl === "string") {
      const tail = parsed.shortUrl.split("/").pop();
      if (tail) slug = tail;
    }
  } catch (_) {
    // not JSON; probe URL-safe tokens below
  }
  if (!slug) {
    const tokens = postBody.split(/[^A-Za-z0-9_-]+/).filter((t) => t.length >= 3 && t.length <= 32);
    for (const candidate of tokens) {
      if (/^(html|head|body|div|span|class|id|http|https|json|true|false|null|slug|shortUrl|copy|button|form|input|btoa|alpine|htmx|admin|index)$/i.test(candidate)) continue;
      const r = await fetch(base + "/" + candidate, { redirect: "manual", signal: AbortSignal.timeout(2000) });
      if ([301, 302, 303, 307, 308].includes(r.status)) { slug = candidate; break; }
    }
  }
  if (!slug) fail("response to POST /shorten did not yield a slug; body: " + postBody.slice(0, 300));

  const redir = await fetch(base + "/" + slug, { redirect: "manual" });
  assert.ok(redir.status >= 300 && redir.status < 400, "GET /:slug should redirect, got " + redir.status);
  assert.equal(redir.headers.get("location"), target, "redirect location must match the original URL");

  const missing = await fetch(base + "/no-such-slug-xyz-9q9q9q", { redirect: "manual" });
  assert.equal(missing.status, 404, "unknown slug should be 404, got " + missing.status);

  const js = await postJson({ url: "javascript:alert(1)" });
  assert.ok(js.status >= 400 && js.status < 500, "javascript: target must be rejected, got " + js.status);
  const lenient = await postJson({ url: "https:evil.example.com" });
  assert.ok(lenient.status >= 400 && lenient.status < 500, "lenient https:host must be rejected, got " + lenient.status);
  const schemeRel = await postJson({ url: "//evil.example.com" });
  assert.ok(schemeRel.status >= 400 && schemeRel.status < 500, "//host must be rejected, got " + schemeRel.status);

  const admin = await fetch(base + "/admin");
  assert.equal(admin.status, 200, "GET /admin should be 200, got " + admin.status);
  const adminBody = await admin.text();
  assert.ok(adminBody.includes(slug), "admin page must list the slug created earlier");
} finally {
  server.kill("SIGKILL");
}
