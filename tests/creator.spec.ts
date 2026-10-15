import { test, expect } from "@playwright/test";

test("offline manual creator persists edits, selection, duplicate, export, discard and deletion", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const errors: string[] = [],
    external: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (
      !r.url().startsWith("http://127.0.0.1:") &&
      !r.url().startsWith("blob:")
    )
      external.push(r.url());
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Characters", exact: true }).click();
  await page
    .getByRole("button", { name: "Create Character", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: /Create from Photo/ }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Create Manually", exact: true })
    .click();
  const editor = page.getByLabel("Manual character creator", { exact: true });
  await editor.getByLabel("Character name", { exact: true }).fill("Asha");
  await editor.getByRole("button", { name: "Pause preview" }).click();
  await editor.getByRole("button", { name: "Idle", exact: true }).click();
  const canvas = editor.locator("canvas");
  const before = await canvas.evaluate((c) =>
    (c as HTMLCanvasElement).toDataURL(),
  );
  await editor.getByLabel("Hair color", { exact: true }).selectOption("rose");
  await expect
    .poll(() => canvas.evaluate((c) => (c as HTMLCanvasElement).toDataURL()))
    .not.toBe(before);
  await editor.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(editor.getByLabel("Hair color", { exact: true })).toHaveValue(
    "dark-brown",
  );
  await editor.getByLabel("Hair style", { exact: true }).selectOption("bun");
  await editor.getByLabel("Clothing", { exact: true }).selectOption("saree");
  await editor.getByLabel("glasses", { exact: true }).check();
  await editor.getByRole("button", { name: "Face left" }).click();
  await editor.screenshot({
    path: test.info().outputPath("manual-creator.png"),
  });
  for (const label of ["Walk", "Wave", "Jump", "Drink water", "Sleep"])
    await editor.getByRole("button", { name: label, exact: true }).click();
  await editor.getByRole("button", { name: "Keep character" }).click();
  let card = page.getByRole("article", {
    name: "Custom character Asha",
    exact: true,
  });
  await card
    .getByRole("button", { name: "Add to Desktop", exact: true })
    .click();
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "Characters", exact: true }).click();
  card = page.getByRole("article", {
    name: "Custom character Asha",
    exact: true,
  });
  await expect(
    card.getByRole("button", { name: "Add to Desktop", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await card.getByRole("button", { name: "Preview / Edit / Rename" }).click();
  await expect(editor.getByLabel("Hair style", { exact: true })).toHaveValue(
    "bun",
  );
  await expect(editor.getByLabel("glasses", { exact: true })).toBeChecked();
  await editor
    .getByLabel("Character name", { exact: true })
    .fill("Asha edited");
  await editor.getByRole("button", { name: "Keep character" }).click();
  await page.getByRole("button", { name: "Discard", exact: true }).click();
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Duplicate", exact: true }).click();
  await editor.getByRole("button", { name: "Reset appearance" }).click();
  await expect(editor.getByLabel("Hair style", { exact: true })).toHaveValue(
    "short-wavy",
  );
  await editor.getByRole("button", { name: "Keep character" }).click();
  const copy = page.getByRole("article", {
    name: "Custom character Asha copy",
    exact: true,
  });
  await expect(copy).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await copy.getByRole("button", { name: "Export preset" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^custom-.*\.json$/);
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  expect(JSON.parse(Buffer.concat(chunks).toString())).toMatchObject({
    name: "Asha copy",
    source: "manual",
    animations: {},
  });
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await card.getByRole("button", { name: "Delete", exact: true }).click();
  await card
    .getByRole("button", { name: "Confirm delete", exact: true })
    .click();
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "Characters", exact: true }).click();
  await expect(card).toHaveCount(0);
  await expect(copy).toBeVisible();
  const settings = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("miso.settings.v1")!),
  );
  expect(settings.character).toBe("alex");
  expect(settings.customCharacters).toHaveLength(1);
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});

test("beta includes manual customization and keeps photo creation unavailable", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Characters", exact: true }).click();
  await page
    .getByRole("button", { name: "Create Character", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Create from Photo · Unavailable in beta",
      exact: true,
    }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Create Manually", exact: true })
    .click();
  await expect(page.getByLabel("Hair style", { exact: true })).toBeVisible();
  await page
    .getByLabel("Character name", { exact: true })
    .fill("a".repeat(73) + "🙂");
  await page
    .getByRole("button", { name: "Keep character", exact: true })
    .click();
  await page.getByRole("button", { name: "Duplicate", exact: true }).click();
  await expect(page.getByLabel("Character name", { exact: true })).toHaveValue(
    "a".repeat(73) + "🙂 copy",
  );
  await page
    .getByRole("button", { name: "Keep character", exact: true })
    .click();
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "Characters", exact: true }).click();
  await expect(
    page.getByRole("article", {
      name: "Custom character " + "a".repeat(73) + "🙂 copy",
      exact: true,
    }),
  ).toBeVisible();
});
