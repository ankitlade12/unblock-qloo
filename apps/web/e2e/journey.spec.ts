import { test, expect } from "@playwright/test";
test("organizer and participant journey, confirmation, disruption and isolation", async ({
  page,
  browser,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  let releaseInitial!: () => void;
  await page.route(
    "**/api/state",
    async (route) => {
      await new Promise<void>((resolve) => {
        releaseInitial = resolve;
      });
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: '{"detail":"Start a demo workspace first"}',
      });
    },
    { times: 1 },
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explore the demo", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: /Different tastes.*One afternoon.*A way together/,
    }),
  ).toBeVisible();
  await expect.poll(() => Boolean(releaseInitial)).toBe(true);
  const lateInitial = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/state") && response.status() === 401,
  );
  releaseInitial();
  await lateInitial;
  await page.screenshot({
    path: "test-results/overview-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Discover", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Live discovery setup" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Run Qloo discovery", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", {
      name: "Load reviewed demo profile",
      exact: true,
    }),
  ).toBeDisabled();
  await page
    .getByRole("checkbox", { name: /Use this fictional profile for Alex/ })
    .check();
  await page
    .getByRole("button", { name: "Load reviewed demo profile", exact: true })
    .click();
  await expect(
    page.getByText("8 of 8 screenings mapped. Each selection is reviewed."),
  ).toBeVisible();
  await page
    .locator("summary")
    .filter({ hasText: "Personalize with Qloo" })
    .click();
  await expect(
    page.getByRole("checkbox", {
      name: /I agree to use my selected favorites/,
    }),
  ).toBeVisible();
  await page
    .locator("summary")
    .filter({ hasText: "Personalize with Qloo" })
    .click();
  await page
    .getByText("Source & event details", { exact: true })
    .first()
    .click();
  await expect(page.getByText(/Source observed/).first()).toBeVisible();
  await page.screenshot({
    path: "test-results/discover-polished.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "My practical needs" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page
    .getByRole("button", { name: "Maybe", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("button", { name: "Maybe", exact: true }).first(),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Interested", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Plans", exact: true }).click();
  await page
    .getByRole("button", { name: "Generate plans", exact: true })
    .click();
  await page.getByRole("button", { name: "Review proposal" }).first().click();
  await page.getByRole("button", { name: /Approve version/ }).click();
  const selects = page.locator('select[aria-label$=" commitment"]');
  for (let i = 0; i < (await selects.count()); i++) {
    await selects.nth(i).selectOption("accepted");
    await expect(selects.nth(i)).toBeEnabled();
  }
  const confirmations = page.getByRole("button", {
    name: "Record evidence",
    exact: true,
  });
  for (let i = 0; i < (await confirmations.count()); i++) {
    await confirmations.nth(i).click();
    await page
      .getByRole("button", { name: "Record confirmation", exact: true })
      .click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
  }
  await expect(
    page.getByRole("link", { name: "Final calendar itinerary" }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/confirmed-plan.png",
    fullPage: true,
  });
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Final calendar itinerary" }).click();
  expect((await download).suggestedFilename()).toMatch(/\.ics$/);
  await page
    .getByRole("button", {
      name: "Simulate post-event review · fictional outcomes only",
      exact: true,
    })
    .click();
  await expect(page.getByText(/Simulated post-event review:/)).toBeVisible();
  await page
    .getByRole("combobox", { name: "Alex attendance", exact: true })
    .selectOption("attended");
  await expect
    .poll(async () => {
      const state = await (await page.request.get("/api/state")).json();
      return state.outcomes.some(
        (outcome: {
          participant_id: string;
          attendance: string;
          simulated_at?: string;
        }) =>
          outcome.participant_id === "p1" &&
          outcome.attendance === "attended" &&
          !!outcome.simulated_at,
      );
    })
    .toBe(true);
  await page.getByRole("button", { name: "Resources", exact: true }).click();
  await page
    .getByRole("button", { name: "Mark unavailable", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: /^Plans/ })
    .first()
    .click();
  await expect(
    page.getByText("Needs review after a change", { exact: true }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Replan current inputs" }).click();
  await expect(
    page.getByText("Awaiting organizer approval", { exact: true }).first(),
  ).toBeVisible();
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await otherPage.goto(new URL("/", page.url()).toString());
  await expect(
    otherPage.getByRole("button", { name: "Explore the demo", exact: true }),
  ).toBeVisible();
  await other.close();
  expect(errors).toEqual([]);
});
test("mobile navigation, all screens and no horizontal overflow", async ({
  page,
}) => {
  // Layout fixture: long provider identifiers must fit after real discovery too.
  await page.route("**/api/demo", async (route) => {
    const response = await route.fetch();
    const state = await response.json();
    state.evidence = [
      {
        id: "12345678-1234-1234-1234-123456789012",
        path: "/v2/insights",
        fingerprint: "a".repeat(64),
        retrieved_at: new Date().toISOString(),
      },
    ];
    await route.fulfill({ response, json: state });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explore the demo", exact: true })
    .click();
  for (const label of [
    "Discover",
    "Participants",
    "Catalogue",
    "Resources",
    "Plans",
    "Evidence",
  ]) {
    await page.getByRole("button", { name: "Toggle navigation" }).click();
    await page.getByRole("button", { name: label, exact: true }).click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  const populatedEvidence = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(populatedEvidence.violations).toEqual([]);
  await page.getByRole("button", { name: "Toggle navigation" }).click();
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await page.screenshot({
    path: "test-results/overview-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Toggle navigation" }).click();
  await page
    .getByRole("button", { name: "Workspace settings", exact: true })
    .click();
  await page.getByLabel("Organizer budget (USD)", { exact: true }).fill("0");
  await page
    .getByRole("button", { name: "Save settings", exact: true })
    .click();
  await expect(page.getByText("Changes saved.", { exact: true })).toContainText(
    "Changes saved.",
  );
  await page.getByRole("button", { name: "Toggle navigation" }).click();
  await page.getByRole("button", { name: "Plans", exact: true }).click();
  await page
    .getByRole("button", { name: "Generate plans", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "No checked plan found for these inputs.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Review budget and inputs" }),
  ).toBeVisible();
});

test("keyboard entry and accessibility scan", async ({ page }) => {
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Explore the demo", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", {
      name: /Different tastes.*One afternoon.*A way together/,
    }),
  ).toBeVisible();
  for (const name of [
    "Overview",
    "Discover",
    "Participants",
    "Resources",
    "Plans",
    "Evidence",
  ]) {
    await page.getByRole("button", { name, exact: true }).click();
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
  }
  await page.getByRole("button", { name: "Participants", exact: true }).click();
  await page
    .getByRole("button", { name: "Requirements", exact: true })
    .first()
    .click();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Close dialog" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
});

test("guided story makes real choices, plans and repairs inspectable", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explore the demo", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Walk through the story", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "A good invitation should come with a way to say yes.",
    }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/story-people-desktop.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Inspect Jordan’s needs", exact: true })
    .click();
  await expect(
    page.getByRole("checkbox", { name: "Companion seat and ticket required" }),
  ).toBeChecked();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page
    .getByRole("button", { name: "Next: Their choices", exact: true })
    .click();
  await page.getByRole("button", { name: /Cultural discovery/ }).click();
  await expect(
    page.getByRole("heading", { name: "A recommendation needs a source." }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Their decision/ }).click();
  await expect(
    page.getByRole("heading", { name: "The choice stays with the person." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Jordan: maybe in Soul", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Jordan: maybe in Soul", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Jordan: interested in Soul", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Next: The possibilities", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Run the planning checks", exact: true })
    .click();
  await page
    .getByText("Inspect times, access, and itemized costs", { exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "The day, made concrete.", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Organizer cost", { exact: true }).first(),
  ).toBeVisible();
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  const populated = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    populated.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  await page.screenshot({
    path: "test-results/story-possibilities-desktop.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Next: The commitments", exact: true })
    .click();
  await expect(
    page.getByText("Awaiting organizer approval", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Next: The unexpected", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Simulate this shuttle cancellation",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("Needs review after a change", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Check the remaining options", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Inspect changes and blockers",
      exact: true,
    }),
  ).toBeVisible();
  const repair = page.getByRole("region", {
    name: "Before and after the change",
  });
  await expect(repair).toBeVisible();
  await page.screenshot({
    path: "test-results/repair-polished.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations.map((v) => v.id),
  ).toEqual([]);
  await page.screenshot({
    path: "test-results/repair-polished-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page
    .getByRole("button", { name: "Next: The evidence", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "What remains before the real thing?",
      exact: true,
    }),
  ).toBeVisible();
  const configured = (await (await page.request.get("/api/state")).json())
    .qloo_available;
  await expect(
    page.getByText(
      configured
        ? "Configured; verify live coverage"
        : "Awaiting Qloo credential",
      { exact: true },
    ),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("guided story is accessible and fits mobile at every chapter", async ({
  page,
}) => {
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explore the demo", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Walk through the story", exact: true })
    .click();
  for (const chapter of [
    "The people",
    "Their choices",
    "The possibilities",
    "The commitments",
    "The unexpected",
    "The evidence",
  ]) {
    await page
      .getByRole("navigation", { name: "Story chapters" })
      .getByRole("button", { name: new RegExp(chapter) })
      .click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      results.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
  }
  await page
    .getByRole("navigation", { name: "Story chapters" })
    .getByRole("button", { name: /The people/ })
    .click();
  await page.screenshot({
    path: "test-results/story-people-mobile.png",
    fullPage: true,
  });
});

test("discovery comparison freezes choices, shows unchanged result, and rejects changed resources", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explore the demo", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Compare discovery", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Freeze current choices", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Alex: interested after exploring Soul",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Compare checked plans", exact: true })
    .click();
  await expect(
    page.getByText("No improvement in feasible coverage or organizer cost.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Direct-catalogue decisions only. This is not evidence of Qloo uplift.",
      { exact: true },
    ),
  ).toBeVisible();
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  await page.screenshot({
    path: "test-results/comparison-desktop.png",
    fullPage: true,
  });
  await expect(
    page.getByRole("heading", { name: "Follow each choice into the plan." }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Discovery to planning evidence" }),
  ).toContainText("Explored directly in the catalogue; no Qloo attribution.");
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Export comparison evidence" }).click();
  expect((await download).suggestedFilename()).toContain("comparison");
  await page
    .getByRole("combobox", { name: "Discovery source", exact: true })
    .selectOption("qloo");
  await expect(
    page.getByRole("heading", {
      name: "No Qloo-backed catalogue matches for Alex.",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Resources", exact: true }).click();
  await page
    .getByRole("button", { name: "Mark unavailable", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Compare discovery", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Compare checked plans", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText(
      /Budget, catalogue, resources, or participant requirements changed/,
    ),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  await page.screenshot({
    path: "test-results/comparison-mobile.png",
    fullPage: true,
  });
});
