import { test, expect } from "@playwright/test";
test("appearance and reminder settings persist; discard restores saved settings", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "A little company for your day." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Appearance", exact: true }).click();
  await page.getByLabel("A name to come home to").fill("Bean");
  await page.getByRole("button", { name: "slate coat" }).click();
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Bean YOUR COMPANION" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Gentle reminders" }).click();
  await page.getByRole("switch", { name: "Stay hydrated reminder" }).click();
  await page.getByLabel("Stretch a little interval in minutes").fill("25");
  await page
    .getByLabel("Miso’s message", { exact: true })
    .nth(1)
    .fill("A short stretch, Bean says.");
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.reload();
  await expect(
    page.getByRole("switch", { name: "Stay hydrated reminder" }),
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
test("all animations, local preview, and desktop preferences are usable", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Nap time" }).click();
  await expect(
    page.getByText("Dreaming of very small adventures"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Wake up" }).click();
  await page.getByRole("button", { name: "Let’s play" }).click();
  await expect(page.locator(".preview-pet")).toHaveClass(/jumping/);
  await page.getByRole("button", { name: "Appearance", exact: true }).click();
  for (const state of ["walking", "sleeping", "jumping", "happy", "idle"]) {
    await page.getByRole("button", { name: state, exact: true }).click();
    await expect(page.locator(".preview-pet")).toHaveClass(new RegExp(state));
  }
  await page
    .getByRole("button", { name: "Desktop & startup", exact: true })
    .click();
  await expect(
    page.getByRole("switch", { name: "Start with Windows" }),
  ).toBeDisabled();
  await page.getByRole("switch", { name: "Show speech bubbles" }).click();
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.getByRole("button", { name: "About Miso" }).click();
  await expect(
    page.getByText("Good company. No strings attached."),
  ).toBeVisible();
});
test("UI loads without remote assets and fits a small window", async ({
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
  await expect(
    page.getByRole("heading", { name: "A little company for your day." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(external).toEqual([]);
});
