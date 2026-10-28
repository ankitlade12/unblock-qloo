const { chromium } = require(
  process.cwd() + "/apps/web/node_modules/playwright",
);
const { expect } = require(
  process.cwd() + "/apps/web/node_modules/@playwright/test",
);
const AxeBuilder = require(
  process.cwd() + "/apps/web/node_modules/@axe-core/playwright",
).default;
const fs = require("fs"),
  crypto = require("crypto");
if (!process.argv.includes("--allow-live"))
  throw new Error("Pass --allow-live to authorize one real Qloo request.");
const origin = process.env.QA_BASE_URL || "http://127.0.0.1:8011",
  out = process.env.QA_OUTPUT || "data/browser-qa";
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_PATH,
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    timezoneId: "America/Chicago",
  });
  const page = await context.newPage(),
    errors = [],
    checks = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const snap = async (name, fullPage = false) => {
    await page.screenshot({ path: `${out}/${name}.png`, fullPage });
  };
  const nav = async (name) => {
    await page
      .getByRole("button", {
        name: name === "Settings" ? "Workspace settings" : name,
        exact: true,
      })
      .click();
  };
  const state = async () => {
    const r = await context.request.get(origin + "/api/state");
    expect(r.ok()).toBeTruthy();
    return r.json();
  };
  const command = async (action, target = "", data = {}, status = 200) => {
    const s = await state();
    const r = await context.request.post(origin + "/api/command", {
      headers: { "X-Unblock-Request": "1" },
      data: {
        revision: s.revision,
        action,
        target,
        data,
        idempotency_key: crypto.randomUUID(),
      },
    });
    expect(r.status()).toBe(status);
    return status === 200 ? r.json() : null;
  };
  const reload = async (name) => {
    await page.reload();
    await nav(name);
  };
  await page.goto(origin);
  await expect(page.getByRole("button", { name: "Explore the demo", exact: true })).toBeVisible();
  await snap("01-welcome");
  let r = await context.request.post(origin + "/api/demo", {
    headers: { "X-Unblock-Request": "1" },
    data: {},
  });
  if (r.status() === 429) {
    console.log("Waiting for existing creation-rate window.");
    await page.waitForTimeout(61000);
    r = await context.request.post(origin + "/api/demo", {
      headers: { "X-Unblock-Request": "1" },
      data: {},
    });
  }
  expect(r.ok()).toBeTruthy();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Discover", exact: true }),
  ).toBeVisible();
  await snap("02-overview");
  // Empty budget, then restore it without changing participant interests.
  await nav("Settings");
  await page.getByLabel("Organizer budget (USD)", { exact: true }).fill("0");
  await page
    .getByRole("button", { name: "Save settings", exact: true })
    .click();
  await expect.poll(async () => (await state()).window.budget_minor).toBe(0);
  await nav("Plans");
  await page
    .getByRole("button", { name: "Generate plans", exact: true })
    .click();
  await expect.poll(async () => (await state()).traces.length).toBe(1);
  expect((await state()).proposals.length).toBe(0);
  await expect(
    page.getByRole("heading", {
      name: "No checked plan found for these inputs.",
    }),
  ).toBeVisible();
  await snap("03-zero-budget", true);
  checks.push("Zero budget returns no actionable plan");
  await nav("Settings");
  await page.getByLabel("Organizer budget (USD)", { exact: true }).fill("300");
  await page
    .getByRole("button", { name: "Save settings", exact: true })
    .click();
  await expect
    .poll(async () => (await state()).window.budget_minor)
    .toBe(30000);
  const before = await state();
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "invalid.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"events":[null],"offers":[]}'),
    });
  await expect(page.getByRole("alert")).toContainText("downloadable template");
  expect((await state()).events).toEqual(before.events);
  await snap("04-import-error");
  checks.push(
    "Malformed upload gives validation feedback and preserves catalogue",
  );
  // Live provider failure is deliberately simulated in this browser only.
  await nav("Discover");
  await page
    .getByRole("checkbox", { name: /Use this fictional profile for Alex/ })
    .check();
  await page
    .getByRole("button", { name: "Load reviewed demo profile", exact: true })
    .click();
  await expect(
    page.getByText("8 of 8 screenings mapped. Each selection is reviewed."),
  ).toBeVisible();
  await snap("05-reviewed-profile");
  const baseline = await state();
  await page.route(
    "**/api/command",
    (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          detail:
            "Simulated provider outage for QA. Existing choices preserved.",
        }),
      }),
    { times: 1 },
  );
  await page
    .getByRole("button", { name: "Run Qloo discovery", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Simulated provider outage",
  );
  expect((await state()).participants[0].interests).toEqual(
    baseline.participants[0].interests,
  );
  await snap("06-simulated-outage");
  checks.push("Simulated provider error is recoverable and preserves choices");
  await page
    .getByRole("button", { name: "Run Qloo discovery", exact: true })
    .click();
  await expect(
    page.getByText("WHAT QLOO ADDED AT DISCOVERY TIME", { exact: true }),
  ).toBeVisible({ timeout: 30000 });
  await page.locator(".discovery-contribution").scrollIntoViewIfNeeded();
  await snap("07-live-discovery");
  const live = await state();
  expect(live.provider_calls).toBe(1);
  const cached = await command("discover", "p1");
  expect(cached.result.mode).toBe("recorded");
  expect(cached.state.provider_calls).toBe(1);
  checks.push("Real Qloo discovery and cache reuse, one provider attempt");
  // Consent removal cannot leave cultural suggestions behind.
  await page
    .locator("summary")
    .filter({ hasText: "Personalize with Qloo" })
    .click();
  await page
    .getByRole("checkbox", { name: /I agree to use my selected favorites/ })
    .click();
  await expect
    .poll(async () => (await state()).participants[0].suggestions.length)
    .toBe(0);
  expect((await state()).participants[0].favorites.length).toBe(0);
  checks.push("Consent revocation removes favorites and suggestions");
  await command("plan");
  let s = await state();
  const plan = s.proposals[0];
  await command("approve", plan.id);
  await command("commit", plan.id, {
    participant_id: "p1",
    decision: "withdrawn",
  });
  const repaired = await command("replan");
  expect(repaired.result.plans.length).toBeGreaterThan(0);
  expect(repaired.result.plans.every((p) => !("p1" in p.assignments))).toBe(
    true,
  );
  await reload("Plans");
  await snap("08-withdrawal-replan");
  checks.push(
    "Withdrawal invalidates approval and excludes Alex from every repaired plan",
  );
  // Stale edits and final exports remain blocked.
  const stale = await context.request.post(origin + "/api/command", {
    headers: { "X-Unblock-Request": "1" },
    data: {
      revision: 1,
      action: "window",
      data: { name: "Stale edit", budget_minor: 0 },
      idempotency_key: crypto.randomUUID(),
    },
  });
  expect(stale.status()).toBe(409);
  const finalExport = await context.request.get(
    origin + `/api/proposals/${plan.id}/export?final=true`,
  );
  expect(finalExport.status()).toBe(409);
  checks.push("Stale writes and stale final exports rejected");
  await nav("Participants");
  await snap("09-participants");
  await nav("Catalogue");
  await snap("10-catalogue");
  await nav("Resources");
  await snap("11-resources");
  await nav("Evidence");
  await snap("12-evidence");
  await page.setViewportSize({ width: 768, height: 1024 });
  await snap("13-tablet-evidence");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("heading", { name: "Provider evidence index" }).scrollIntoViewIfNeeded();
  await snap("14b-mobile-provider-evidence");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    axe.violations.map((x) => ({
      id: x.id,
      nodes: x.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  checks.push("Tablet/mobile fit and populated Evidence accessibility");
  await page.setViewportSize({ width: 1440, height: 960 });
  await nav("Settings");
  await page
    .getByRole("button", { name: "Delete this workspace", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete workspace", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Explore the demo", exact: true }),
  ).toBeVisible();
  expect((await context.request.get(origin + "/api/state")).status()).toBe(401);
  checks.push("Workspace deletion clears session and returns to welcome");
  await snap("15-after-deletion");
  expect(errors).toEqual([]);
  const report = {
    checked_at: new Date().toISOString(),
    origin,
    checks,
    page_errors: errors,
    provider_attempts: 1,
    real_matches: live.participants[0].discovery.covered,
    new_options: live.participants[0].discovery.new_options.map((x) => x.title),
    note: "Provider outage was injected only into the QA browser; operational data and choices are synthetic.",
  };
  fs.writeFileSync(out + "/checks.json", JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
  await browser.close();
})().catch((e) => {
  console.error(e.stack);
  process.exit(1);
});
