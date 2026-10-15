import { test, expect } from "@playwright/test";

test("custom reminders save independently, edit, pause, schedule and survive reload", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Reminders", exact: true }).click();
  await page
    .getByRole("button", { name: "Create reminder", exact: true })
    .click();
  await page.getByLabel("Reminder title", { exact: true }).fill("Office call");
  await page
    .getByLabel("Reminder message", { exact: true })
    .fill("Join the team");
  await page.getByRole("button", { name: "In 5 minutes", exact: true }).click();
  await expect(page.getByLabel("Speech bubble", { exact: true })).toBeChecked();
  await expect(
    page.getByLabel("System notification", { exact: true }),
  ).toBeChecked();
  await page
    .getByRole("button", { name: "Schedule reminder", exact: true })
    .click();
  const card = page.getByRole("article", {
    name: "Reminder Office call",
    exact: true,
  });
  await expect(card).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Reminders", exact: true }).click();
  await expect(card).toBeVisible();
  await card
    .getByRole("button", { name: "Edit reminder", exact: true })
    .click();
  await page
    .getByLabel("Reminder message", { exact: true })
    .fill("Bring the weekly notes");
  await page
    .getByLabel("Reminder repeat", { exact: true })
    .selectOption("repeat");
  await page.getByLabel("Repeat every (minutes)", { exact: true }).fill("");
  await expect(
    page.getByLabel("Repeat every (minutes)", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Repeat every (minutes)", { exact: true }).fill("1440");
  await page
    .getByRole("button", { name: "Schedule reminder", exact: true })
    .click();
  await expect(card).toContainText("Every 1440 minutes");
  await card
    .getByRole("button", { name: "Pause reminder", exact: true })
    .click();
  await expect(card).toContainText("Paused");
  await page.getByRole("button", { name: "Appearance", exact: true }).click();
  await page.getByLabel("Your companion’s name").fill("Unrelated unsaved edit");
  await page.getByRole("button", { name: "Discard", exact: true }).click();
  await page.getByRole("button", { name: "Reminders", exact: true }).click();
  await expect(card).toBeVisible();
  await page
    .getByRole("button", { name: "Create reminder", exact: true })
    .click();
  await page
    .getByLabel("Reminder title", { exact: true })
    .fill("Future appointment");
  await page
    .getByLabel("Reminder message", { exact: true })
    .fill("Time to leave");
  await page
    .getByLabel("Reminder timing", { exact: true })
    .selectOption("scheduled");
  await page
    .getByLabel("Date and time", { exact: true })
    .fill("2099-11-20T14:30");
  await page
    .getByRole("button", { name: "Schedule reminder", exact: true })
    .click();
  await expect(
    page.getByRole("article", {
      name: "Reminder Future appointment",
      exact: true,
    }),
  ).toBeVisible();
  await card
    .getByRole("button", { name: "Delete reminder", exact: true })
    .click();
  await card
    .getByRole("button", { name: "Confirm delete reminder", exact: true })
    .click();
  await expect(card).toHaveCount(0);
});

test("past dates and missing alert methods are rejected without losing the draft", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Reminders", exact: true }).click();
  await page
    .getByRole("button", { name: "Create reminder", exact: true })
    .click();
  await page.getByLabel("Reminder title", { exact: true }).fill("Invalid time");
  await page
    .getByLabel("Reminder message", { exact: true })
    .fill("Keep this draft");
  await page
    .getByLabel("Reminder timing", { exact: true })
    .selectOption("scheduled");
  await page
    .getByLabel("Date and time", { exact: true })
    .fill("2020-01-01T10:00");
  await page
    .getByRole("button", { name: "Schedule reminder", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("future");
  await expect(
    page.getByLabel("Reminder message", { exact: true }),
  ).toHaveValue("Keep this draft");
  await page
    .getByLabel("Date and time", { exact: true })
    .fill("2099-01-01T10:00");
  await page.getByLabel("Speech bubble", { exact: true }).uncheck();
  await page.getByLabel("System notification", { exact: true }).uncheck();
  await page
    .getByRole("button", { name: "Schedule reminder", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("alert method");
});
