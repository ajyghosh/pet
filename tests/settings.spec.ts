import { test, expect } from "@playwright/test";
test("appearance and reminders persist; discard restores saved settings", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Small company. Big day." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Appearance", exact: true }).click();
  await page.getByLabel("Your companion’s name").fill("Sam");
  await page.getByRole("button", { name: "Sunset coral outfit" }).click();
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Sam", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reminders", exact: true }).click();
  await page.getByRole("switch", { name: "Drink water reminder" }).click();
  await page.getByLabel("Stretch a little interval in minutes").fill("25");
  await page
    .getByLabel("Stretch a little message")
    .fill("A stretch and a smile.");
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.reload();
  await page.getByRole("button", { name: "Reminders", exact: true }).click();
  await expect(
    page.getByRole("switch", { name: "Drink water reminder" }),
  ).toHaveAttribute("aria-checked", "false");
  await expect(
    page.getByLabel("Stretch a little interval in minutes"),
  ).toHaveValue("25");
  await page.getByLabel("Stretch a little interval in minutes").fill("30");
  await page.getByRole("button", { name: "Discard", exact: true }).click();
  await expect(
    page.getByLabel("Stretch a little interval in minutes"),
  ).toHaveValue("25");
  expect(errors).toEqual([]);
});
test("dedicated preview plays all six states, pauses, and switches scene", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open preview" }).click();
  for (const [label, state] of [
    ["Idle", "idle"],
    ["Walk", "walking"],
    ["Wave", "happy"],
    ["Jump", "jumping"],
    ["Drink water", "drinking"],
    ["Sleep", "sleeping"],
  ]) {
    await page.getByRole("button", { name: label, exact: true }).click();
    await expect(page.locator(".preview-human")).toHaveAttribute(
      "data-animation",
      state,
    );
  }
  await page.getByRole("button", { name: "Night preview" }).click();
  await expect(page.locator(".preview-stage")).toHaveClass(/night/);
  await page.getByRole("button", { name: "Walk", exact: true }).click();
  await page.getByRole("button", { name: "Pause preview" }).click();
  const left = await page
    .locator(".preview-human")
    .evaluate((el) => (el as HTMLElement).style.left);
  await page.waitForTimeout(250);
  expect(
    await page
      .locator(".preview-human")
      .evaluate((el) => (el as HTMLElement).style.left),
  ).toBe(left);
  await page.getByRole("button", { name: "Play preview" }).click();
  await expect
    .poll(() =>
      page
        .locator(".preview-human")
        .evaluate((el) => (el as HTMLElement).style.left),
    )
    .not.toBe(left);
});
test("desktop preferences and small-window layout work offline", async ({
  page,
}) => {
  const external: string[] = [];
  page.on("request", (r) => {
    if (
      !r.url().startsWith("http://127.0.0.1:1420") &&
      !r.url().startsWith("data:")
    )
      external.push(r.url());
  });
  await page.setViewportSize({ width: 760, height: 700 });
  await page.goto("/");
  await page.getByRole("button", { name: "Nap time" }).click();
  await expect(page.getByText("Off on a tiny dream adventure.")).toBeVisible();
  await page.getByRole("button", { name: "Wake up" }).click();
  for (const tab of [
    "Preview studio",
    "Reminders",
    "Appearance",
    "Desktop & startup",
    "About heykup pets",
  ]) {
    await page.getByRole("button", { name: tab, exact: true }).click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page
    .getByRole("button", { name: "Desktop & startup", exact: true })
    .click();
  await expect(
    page.getByRole("switch", { name: "Start with Windows" }),
  ).toBeDisabled();
  await page.getByRole("switch", { name: "Show speech bubbles" }).click();
  await page.getByRole("button", { name: "Save changes" }).click();
  expect(external).toEqual([]);
});

test("all imported collections are available, 3D choice persists, and references cannot be selected", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Characters", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Ready to join · 133" }),
  ).toBeVisible();
  await page
    .getByLabel("Character collection")
    .selectOption("Cute 3D Humans — Office & Work");
  await page.getByLabel("Character art style").selectOption("cute-3d");
  await expect(page.locator(".character-card")).toHaveCount(10);
  await page
    .getByRole("button", { name: "Choose Doctor", exact: true })
    .click();
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.reload();
  await expect(page.locator(".profile-avatar .pixel-pet")).toHaveAttribute(
    "data-character",
    "cute-3d-humans-office-work--doctor",
  );
  await page.getByRole("button", { name: "Characters", exact: true }).click();
  await page.getByLabel("Character collection").selectOption("Indian & Kerala");
  await expect(page.locator(".character-card")).toHaveCount(15);
  await page.getByRole("button", { name: "Reference ideas · 20" }).click();
  await expect(page.locator(".reference-card")).toHaveCount(20);
  await expect(page.locator(".character-card")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Save changes" }),
  ).toBeDisabled();
});

test("character gallery filters, saves, and discards unsaved choices", async ({
  page,
}) => {
  const missing: string[] = [];
  page.on("response", (r) => {
    if (r.url().includes("/characters/") && r.status() >= 400)
      missing.push(r.url());
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Characters", exact: true }).click();
  await expect(page.locator(".character-card")).toHaveCount(24);
  for (const name of [
    "Nova",
    "Sage",
    "Mochi",
    "Biscuit",
    "Ember",
    "Clover",
    "Bao",
    "Pip",
    "Sprout",
    "Bolt",
    "Cinder",
    "Alex",
  ]) {
    await page
      .getByRole("button", { name: `Choose ${name}`, exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: `Choose ${name}`, exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".gallery-preview .pixel-pet")).toHaveAttribute(
      "aria-label",
      `${name} companion`,
    );
  }
  await page.getByRole("button", { name: "Animals", exact: true }).click();
  await expect(page.locator(".character-card")).toHaveCount(8);
  await page.getByLabel("Search characters").fill("fox");
  await expect(page.locator(".character-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Choose Ember", exact: true }).click();
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.reload();
  await expect(page.locator(".profile-avatar .pixel-pet")).toHaveAttribute(
    "data-character",
    "fox",
  );
  await expect(
    page.getByRole("heading", { name: "Ember", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Characters", exact: true }).click();
  await page.getByRole("button", { name: "Choose Bao", exact: true }).click();
  await page.getByRole("button", { name: "Discard", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Choose Ember", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.setViewportSize({ width: 760, height: 700 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(missing).toEqual([]);
});

test("walking area and alert-only mode persist and enforce slider spacing", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Desktop & startup", exact: true })
    .click();
  await page.getByLabel("When to walk").selectOption("alerts");
  await page.getByRole("button", { name: "Park on the right" }).click();
  await page.getByLabel("Walking area left limit").fill("30");
  await page.getByLabel("Walking area right limit").fill("65");
  await expect(page.getByLabel("Walking area from 30% to 65%")).toBeVisible();
  await page.getByRole("button", { name: "Preview reminder movement" }).click();
  await expect(page.locator(".walking-map-pet .pixel-pet")).toHaveCSS(
    "background-image",
    /alex-slate.png/,
  );
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.reload();
  await page
    .getByRole("button", { name: "Desktop & startup", exact: true })
    .click();
  await expect(page.getByLabel("When to walk")).toHaveValue("alerts");
  await expect(
    page.getByRole("button", { name: "Park on the right" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Walking area left limit")).toHaveValue("30");
  await expect(page.getByLabel("Walking area right limit")).toHaveValue("65");
  await page.getByLabel("Walking area left limit").fill("90");
  await expect(page.getByLabel("Walking area right limit")).toHaveValue("100");
  await page.getByRole("button", { name: "Discard", exact: true }).click();
  await expect(page.getByLabel("Walking area left limit")).toHaveValue("30");
});

test("About exposes the packaged dependency notices and beta feature limits", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "About heykup pets", exact: true })
    .click();
  await page
    .getByText("Third-party licenses and notices", { exact: true })
    .click();
  const notices = page.getByLabel("Third-party license texts", { exact: true });
  await expect(notices).toContainText("Permission is hereby granted");
  await expect(notices).toContainText("npm: react@");
  await expect(notices).toContainText("cargo: tauri@");
  await expect(notices).toContainText("Mozilla Public License Version 2.0");
  await expect(
    page.getByText(/Manual character customization is included/),
  ).toBeVisible();
});
