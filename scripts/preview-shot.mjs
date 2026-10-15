import { chromium } from "@playwright/test";
const browser = await chromium.launch({
  executablePath: process.env.MISO_CHROME_PATH,
});
const page = await browser.newPage({
  viewport: { width: 1280, height: 960 },
  deviceScaleFactor: 1,
});
await page.goto("http://127.0.0.1:1420");
await page
  .getByRole("heading", { name: "A little company for your day." })
  .waitFor();
await page.screenshot({ path: "docs/preview.png", fullPage: true });
await browser.close();
