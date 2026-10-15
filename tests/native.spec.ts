import { test, expect, type Page } from "@playwright/test";
import { defaults } from "../src/core/settings";
async function mockNative(
  page: Page,
  label: string,
  failFrame = false,
  settings = defaults,
  saveDelay = 0,
  quickRequest = false,
) {
  await page.addInitScript(
    ({ label, settings, failFrame, saveDelay, quickRequest }) => {
      let pendingQuick = quickRequest;
      let scheduled: import("../src/core/scheduledReminders").ScheduledReminder[] =
        [];
      const w = window as unknown as Record<string, unknown>;
      w.isTauri = true;
      w.calls = [];
      w.__TAURI_EVENT_PLUGIN_INTERNALS__ = { unregisterListener: () => {} };
      w.__TAURI_INTERNALS__ = {
        metadata: { currentWindow: { label }, currentWebview: { label } },
        transformCallback: () => 1,
        invoke: async (cmd: string, args: unknown) => {
          (w.calls as unknown[]).push({ cmd, args });
          if (cmd === "bootstrap")
            return {
              platform: "windows",
              clickEnabled: true,
              settings,
              warning: null,
            };
          if (cmd === "list_monitors")
            return [
              {
                id: "test",
                name: "Display 1",
                primary: true,
                scale: 1.5,
                coordinateScale: 1.5,
                bounds: { left: -1920, top: 0, right: 0, bottom: 1080 },
                work: { left: -1920, top: 0, right: 0, bottom: 1032 },
                taskbar: "bottom",
                autoHide: false,
              },
            ];
          if (cmd === "present_frame") {
            if (failFrame) throw Error("Test positioning failure");
            return null;
          }
          if (cmd === "desktop_status")
            return "Pet animation has not responded. Select Show / restart pet to retry.";
          if (cmd === "save_settings") {
            await new Promise((resolve) => setTimeout(resolve, saveDelay));
            return (args as { settings: typeof settings }).settings;
          }
          if (cmd === "take_quick_reminder_request") {
            const pending = pendingQuick;
            pendingQuick = false;
            return pending;
          }
          if (cmd === "list_custom_reminders")
            return { reminders: scheduled, warning: null, snoozedUntil: 0 };
          if (cmd === "save_custom_reminder") {
            const { reminder } = args as {
              reminder: (typeof scheduled)[number];
            };
            scheduled = [
              ...scheduled.filter((r) => r.id !== reminder.id),
              reminder,
            ];
            return { reminders: scheduled, warning: null, snoozedUntil: 0 };
          }
          if (cmd === "delete_custom_reminder") {
            scheduled = scheduled.filter(
              (r) => r.id !== (args as { id: string }).id,
            );
            return { reminders: scheduled, warning: null, snoozedUntil: 0 };
          }
          if (cmd === "input_status") return true;
          if (cmd === "plugin:event|listen") return 1;
          return null;
        },
      };
    },
    { label, settings, failFrame, saveDelay, quickRequest },
  );
}
test("packaged pet uses native identity without a query and submits frames", async ({
  page,
}) => {
  await mockNative(page, "pet");
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-window", "pet");
  await expect(page.getByRole("img", { name: "Alex companion" })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { calls: { cmd: string }[] }).calls.filter(
            (c) => c.cmd === "present_frame",
          ).length,
      ),
    )
    .toBeGreaterThan(2);
  const frames = await page.evaluate(() =>
    (
      window as unknown as {
        calls: { cmd: string; args: { frame: { rows: number[][] } } }[];
      }
    ).calls.filter((c) => c.cmd === "present_frame"),
  );
  expect(frames[0].args.frame.rows.length).toBeGreaterThan(10);
});
test("native placement failures are reported instead of silently stopping", async ({
  page,
}) => {
  await mockNative(page, "pet", true);
  await page.goto("/");
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as unknown as { calls: { cmd: string }[] }).calls.some(
          (c) => c.cmd === "report_pet_error",
        ),
      ),
    )
    .toBe(true);
});
test("settings provides recovery and preview sends no live animation actions", async ({
  page,
}) => {
  await mockNative(page, "settings");
  await page.goto("/");
  await expect(page.getByText(/Pet animation has not responded/)).toBeVisible();
  await page.getByRole("button", { name: "Show / restart pet" }).click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as unknown as { calls: { cmd: string }[] }).calls.some(
          (c) => c.cmd === "restart_pet",
        ),
      ),
    )
    .toBe(true);
  await page.getByRole("button", { name: "Open preview" }).click();
  await page.getByRole("button", { name: "Jump", exact: true }).click();
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { calls: { cmd: string }[] }).calls.filter(
          (c) => c.cmd === "pet_action",
        ).length,
    ),
  ).toBe(0);
});

test("high-resolution 3D companions submit 64-pixel hit masks within a parked area", async ({
  page,
}) => {
  await mockNative(page, "pet", false, {
    ...defaults,
    character: "cute-3d-humans-office-work--doctor",
    roaming: false,
    homeSide: "right",
    walkStart: 25,
    walkEnd: 75,
  });
  await page.goto("/");
  await expect(page.locator(".native-pet .pixel-pet")).toHaveAttribute(
    "data-character",
    "cute-3d-humans-office-work--doctor",
  );
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as unknown as {
              calls: {
                cmd: string;
                args: { frame?: { grid: number; x: number; rows: number[][] } };
              }[];
            }
          ).calls.find((c) => c.cmd === "present_frame")?.args.frame,
      ),
    )
    .toMatchObject({ grid: 64, x: 880 });
});

test("newer edits survive a pending native save and remain unsaved", async ({
  page,
}) => {
  await mockNative(page, "settings", false, defaults, 1500);
  await page.goto("/");
  await page.getByRole("button", { name: "Appearance", exact: true }).click();
  const name = page.getByLabel("Your companion’s name");
  await name.fill("Submitted name");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await name.fill("Newer draft");
  await expect(
    page.getByRole("button", { name: "Save changes", exact: true }),
  ).toBeEnabled();
  await expect(name).toHaveValue("Newer draft");
  await page.getByRole("button", { name: "Discard", exact: true }).click();
  await expect(name).toHaveValue("Submitted name");
});

test("pet right-click opens the quick reminder bridge", async ({ page }) => {
  await mockNative(page, "pet");
  await page.goto("/");
  await page.locator(".native-pet").click({ button: "right" });
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as unknown as { calls: { cmd: string }[] }).calls.some(
          (c) => c.cmd === "open_quick_reminder",
        ),
      ),
    )
    .toBe(true);
});
test("pending quick reminder opens its form and schedules both alerts through native storage", async ({
  page,
}) => {
  await mockNative(page, "settings", false, defaults, 0, true);
  await page.goto("/");
  await page.getByLabel("Reminder title", { exact: true }).fill("Team call");
  await page
    .getByLabel("Reminder message", { exact: true })
    .fill("Join the office call");
  await page.getByRole("button", { name: "In 5 minutes", exact: true }).click();
  await page
    .getByRole("button", { name: "Schedule reminder", exact: true })
    .click();
  await expect(
    page.getByRole("article", { name: "Reminder Team call", exact: true }),
  ).toBeVisible();
  const reminder = await page.evaluate(
    () =>
      (
        window as unknown as {
          calls: {
            cmd: string;
            args: {
              reminder: {
                dueAt: number;
                bubble: boolean;
                systemNotification: boolean;
              };
            };
          }[];
        }
      ).calls.find((c) => c.cmd === "save_custom_reminder")!.args.reminder,
  );
  expect(reminder.bubble).toBe(true);
  expect(reminder.systemNotification).toBe(true);
  expect(reminder.dueAt - Date.now()).toBeGreaterThan(250000);
  await page
    .getByRole("button", { name: "Test system notification", exact: true })
    .click();
  expect(
    await page.evaluate(() =>
      (window as unknown as { calls: { cmd: string }[] }).calls.some(
        (c) => c.cmd === "test_notification",
      ),
    ),
  ).toBe(true);
});
