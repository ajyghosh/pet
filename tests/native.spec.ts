import { test, expect, type Page } from "@playwright/test";
import { defaults } from "../src/core/settings";
async function mockNative(page: Page, label: string, failFrame = false) {
  await page.addInitScript(
    ({ label, settings, failFrame }) => {
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
          if (cmd === "input_status") return true;
          if (cmd === "plugin:event|listen") return 1;
          return null;
        },
      };
    },
    { label, settings: defaults, failFrame },
  );
}
test("packaged pet uses native identity without a query and submits frames", async ({
  page,
}) => {
  await mockNative(page, "pet");
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-window", "pet");
  await expect(
    page.getByRole("img", { name: "MiniMates human companion" }),
  ).toBeVisible();
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
