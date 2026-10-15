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

test("all plush animals have complete offline atlases and can become the saved companion", async ({
  page,
}) => {
  const failures: string[] = [];
  page.on("pageerror", (error) => failures.push(error.message));
  page.on("response", (response) => {
    if (
      response.url().includes("/characters/soft-") &&
      response.status() >= 400
    )
      failures.push(response.url());
  });
  await page.goto("/");
  for (const [id, name] of [
    ["soft-bunny", "Mallow"],
    ["soft-kitten", "Tofu"],
    ["soft-puppy", "Pudding"],
    ["soft-panda", "Pebble"],
    ["soft-duck", "Buttercup"],
    ["soft-axolotl", "Bubble"],
  ]) {
    await page.getByRole("button", { name: "Characters", exact: true }).click();
    await page.getByLabel("Character collection").selectOption("Soft Friends");
    await page
      .getByRole("button", { name: `Choose ${name}`, exact: true })
      .click();
    await page
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    await page.reload();
    await expect(
      page.getByRole("heading", { name, exact: true }),
    ).toBeVisible();
    await page.evaluate(async (id) => {
      for (const coat of ["ginger", "cream", "slate"]) {
        const image = new Image();
        image.src = `/characters/${id}-${coat}.png`;
        await image.decode();
      }
    }, id);
  }
  expect(failures).toEqual([]);
});
