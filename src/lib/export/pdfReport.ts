import { chromium } from "playwright";
import { buildHtmlReport } from "./htmlReport";

type RunData = Parameters<typeof buildHtmlReport>[0];

export async function buildPdfReport(run: RunData): Promise<Buffer> {
  const html = buildHtmlReport(run);

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
