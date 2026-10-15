import { expect, test } from "@playwright/test";

for (const width of [375, 760, 1280]) {
  test(`settings screens keep controls within the window at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 700 });
    await page.goto("/");
    for (const name of [
      "My companion",
      "Characters",
      "Preview studio",
      "Reminders",
      "Appearance",
      "Desktop & startup",
      "About heykup pets",
    ]) {
      await page.getByRole("button", { name, exact: true }).click();
      if (name === "Reminders")
        await page
          .getByRole("button", { name: "Create reminder", exact: true })
          .click();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const clipped = await page
        .locator("main input, main select, main button, .save-bar button")
        .evaluateAll((elements) =>
          elements
            .filter((element) => {
              const rect = element.getBoundingClientRect();
              return (
                rect.width &&
                rect.height &&
                (rect.left < -1 || rect.right > innerWidth + 1)
              );
            })
            .map(
              (element) =>
                element.getAttribute("aria-label") || element.textContent,
            ),
        );
      expect(clipped, `${name}: controls must fit at ${width}px`).toEqual([]);
    }
  });
}

test("sidebar decoration does not cover copy and the caption stays inside its card", async ({
  page,
}) => {
  await page.setViewportSize({ width: 760, height: 600 });
  await page.goto("/");
  const geometry = await page.locator(".sidebar-note").evaluate((card) => {
    const note = card.getBoundingClientRect();
    const copy = card.querySelector("p")!.getBoundingClientRect();
    const spark = card.querySelector(".note-spark")!.getBoundingClientRect();
    const caption = card.lastElementChild!.getBoundingClientRect();
    return {
      overlap: copy.bottom > spark.top,
      captionFits: caption.bottom <= note.bottom - 1,
    };
  });
  expect(geometry).toEqual({ overlap: false, captionFits: true });
});

test("interval can be cleared, retyped, clamped, and saved without a clipped focus ring", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Reminders", exact: true }).click();
  const interval = page.getByLabel("Drink water interval in minutes");
  await interval.fill("");
  await expect(interval).toHaveValue("");
  await interval.pressSequentially("240");
  await expect(interval).toHaveValue("240");
  expect(
    await interval.evaluate((input) => {
      const wrapper = input.parentElement!;
      const suffix = wrapper.querySelector("span")!.getBoundingClientRect();
      return (
        input.getBoundingClientRect().right <= suffix.left &&
        getComputedStyle(wrapper).overflow !== "hidden"
      );
    }),
  ).toBe(true);
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "Reminders", exact: true }).click();
  await expect(interval).toHaveValue("240");
  await interval.fill("999");
  await interval.press("Tab");
  await expect(interval).toHaveValue("240");
});

test("retired creator and photo controls are absent, including after loading old preferences", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "miso.settings.v1",
      JSON.stringify({
        character: "custom-old",
        customCharacters: [{ id: "custom-old" }],
        name: "My friend",
        coat: "cream",
      }),
    ),
  );
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "My friend", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Characters", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Choose Alex", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByText("My Custom Characters", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", {
      name: /Create Character|Create from Photo|Create Manually|Export preset/,
    }),
  ).toHaveCount(0);
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
});

test("sleeping companions wake when activated by mouse or keyboard", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Nap time", exact: true }).click();
  await page.getByRole("button", { name: "Wake Alex", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Nap time", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Wake up", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Open preview", exact: true }).click();
  await page.getByRole("button", { name: "Sleep", exact: true }).click();
  const pet = page.getByRole("button", {
    name: "Wake Alex in preview",
    exact: true,
  });
  await pet.focus();
  await pet.press("Enter");
  await expect(page.locator(".preview-human")).toHaveAttribute(
    "data-animation",
    "happy",
  );
});

test("long companion names wrap in the profile and stay inside preview bubbles", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Appearance", exact: true }).click();
  await page.getByLabel("Your companion’s name").fill("A".repeat(80));
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  for (const width of [375, 760]) {
    await page.setViewportSize({ width, height: 700 });
    await page
      .getByRole("button", { name: "My companion", exact: true })
      .click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page
      .getByRole("button", { name: "Preview studio", exact: true })
      .click();
    await page.getByRole("button", { name: "Wave", exact: true }).click();
    expect(
      await page.locator(".preview-speech").evaluate((bubble) => {
        const bounds = bubble
          .closest(".preview-stage")!
          .getBoundingClientRect();
        const rect = bubble.getBoundingClientRect();
        return (
          rect.left >= bounds.left &&
          rect.right <= bounds.right &&
          rect.top >= bounds.top
        );
      }),
    ).toBe(true);
  }
});

test("reduced-motion preferences pause gallery frames and react to preference changes", async ({
  page,
}) => {
  await page.clock.install();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "Characters", exact: true }).click();
  const sprite = page
    .getByRole("button", { name: "Choose Alex", exact: true })
    .locator(".pixel-pet");
  const position = await sprite.evaluate(
    (element) => getComputedStyle(element).backgroundPosition,
  );
  await page.clock.runFor(1200);
  await expect(sprite).toHaveCSS("background-position", position);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page
    .getByRole("button", { name: "Preview studio", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Pause preview", exact: true }),
  ).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(
    page.getByRole("button", { name: "Play preview", exact: true }),
  ).toBeVisible();
});
