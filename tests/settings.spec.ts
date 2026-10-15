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
    "About MiniMates",
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
