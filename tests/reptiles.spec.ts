import { test, expect } from "@playwright/test";

test("reptiles are selectable, persist, and have all offline artwork", async ({
  page,
}) => {
  const failures: string[] = [];
  page.on("pageerror", (error) => failures.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Characters", exact: true }).click();
  await page.getByLabel("Character collection").selectOption("Little Reptiles");
  await expect(page.getByRole("button", { name: /^Choose / })).toHaveCount(5);
  for (const [id, name] of [
    ["reptile-chameleon", "Prism"],
    ["reptile-gecko", "Gizmo"],
    ["reptile-tortoise", "Moss"],
    ["reptile-snake", "Noodle"],
    ["reptile-crocodile", "Pickle"],
  ]) {
    await page
      .getByRole("button", { name: `Choose ${name}`, exact: true })
      .click();
    await page
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: `Choose ${name}`, exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            JSON.parse(localStorage.getItem("miso.settings.v1") || "{}")
              .character,
        ),
      )
      .toBe(id);
    await page.evaluate(async (character) => {
      for (const coat of ["ginger", "cream", "slate"]) {
        const image = new Image();
        image.src = `/characters/${character}-${coat}.png`;
        await image.decode();
      }
    }, id);
  }
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Pickle", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open preview", exact: true }).click();
  for (const name of ["Idle", "Walk", "Wave", "Jump", "Drink water", "Sleep"]) {
    await page.getByRole("button", { name, exact: true }).click();
    await expect(
      page.locator('.preview-human [data-character="reptile-crocodile"]'),
    ).toBeVisible();
  }
  expect(failures).toEqual([]);
});
