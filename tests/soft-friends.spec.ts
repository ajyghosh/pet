import { test, expect } from "@playwright/test";

test("Maple can be found, selected, animated, and saved", async ({ page }) => {
  const failures: string[] = [];
  page.on("pageerror", (e) => failures.push(e.message));
  page.on("response", (r) => {
    if (r.url().includes("soft-bear") && r.status() >= 400)
      failures.push(r.url());
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Characters", exact: true }).click();
  await page.getByLabel("Character collection").selectOption("Soft Friends");
  await page.getByRole("button", { name: "Choose Maple", exact: true }).click();
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Maple", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open preview" }).click();
  for (const label of [
    "Idle",
    "Walk",
    "Wave",
    "Jump",
    "Drink water",
    "Sleep",
  ]) {
    await page.getByRole("button", { name: label, exact: true }).click();
    await expect(
      page.locator('.preview-human [data-character="soft-bear"]'),
    ).toBeVisible();
  }
  await page.evaluate(async () => {
    for (const coat of ["ginger", "cream", "slate"]) {
      const image = new Image();
      image.src = `/characters/soft-bear-${coat}.png`;
      await image.decode();
    }
  });
  expect(failures).toEqual([]);
});
