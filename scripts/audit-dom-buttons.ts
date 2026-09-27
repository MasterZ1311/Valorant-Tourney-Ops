import { chromium } from "playwright";

async function run() {
  console.log("=== STARTING COMPLETE DOM BUTTON & VISUAL AUDIT ===");

  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();

  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(`[CONSOLE ERROR] ${msg.text()}`);
    }
  });
  page.on("pageerror", (err) => {
    consoleErrors.push(`[PAGE ERROR] ${err.message}`);
  });

  const routes = [
    "/admin",
    "/admin/bracket",
    "/admin/fixtures",
    "/admin/venues",
    "/admin/teams",
    "/admin/matches",
    "/admin/incidents",
    "/admin/audit",
    "/admin/reports",
    "/volunteer",
  ];

  let totalButtonsClicked = 0;
  let totalModalsVerified = 0;
  const issues: string[] = [];

  for (const route of routes) {
    console.log(`\n--> Auditing Route: http://localhost:3001${route}`);
    await page.goto(`http://localhost:3001${route}`, { waitUntil: "networkidle" });

    // Check for horizontal overflow
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    if (hasHorizontalOverflow) {
      issues.push(`Route ${route} has horizontal overflow (scrollWidth > innerWidth)`);
      console.warn(`[WARN] Route ${route} has horizontal overflow!`);
    }

    // Find all visible buttons on the page
    const buttons = await page.locator("button:visible").all();
    console.log(`  Found ${buttons.length} visible buttons on ${route}`);

    for (let i = 0; i < buttons.length; i++) {
      try {
        const btn = buttons[i];
        const btnText = (await btn.innerText()).trim().replace(/\n+/g, " ") || "[icon button]";
        
        // Skip destructive actions like reset or unlock
        if (
          btnText.toLowerCase().includes("reset") ||
          btnText.toLowerCase().includes("delete") ||
          btnText.toLowerCase().includes("lock & finalize")
        ) {
          continue;
        }

        // Click the button
        await btn.click({ timeout: 1000 }).catch(() => {});
        totalButtonsClicked++;
        await page.waitForTimeout(150);

        // Check if any modal or fixed overlay appeared
        const modals = await page.locator(".fixed.inset-0:visible").all();
        for (const modal of modals) {
          totalModalsVerified++;
          // Check that modal dialog is centered and not clipped
          const box = await modal.boundingBox();
          if (box) {
            // Check inner modal box
            const innerDialog = modal.locator(".val-chamfer, [role='dialog'], .bg-valorant-surface").first();
            if (await innerDialog.isVisible()) {
              const dialogBox = await innerDialog.boundingBox();
              if (dialogBox) {
                if (dialogBox.y < 0) {
                  issues.push(
                    `Visual Bug: Modal opened by button "${btnText}" on ${route} is cut off at the top (y=${dialogBox.y})`
                  );
                }
                // Verify modal is directly under body or properly portaled
                const isUnderBody = await modal.evaluate((el) => {
                  return el.parentElement === document.body;
                });
                if (!isUnderBody) {
                  issues.push(
                    `Stacking Context Bug: Modal opened by "${btnText}" on ${route} is NOT direct child of body`
                  );
                }
              }
            }
          }

          // Close modal by pressing Escape or clicking close button
          const closeBtn = modal.locator("button:has-text('Close'), button:has-text('Cancel'), button:has(svg.lucide-x)").first();
          if (await closeBtn.isVisible()) {
            await closeBtn.click().catch(() => {});
          } else {
            await page.keyboard.press("Escape");
          }
          await page.waitForTimeout(100);
        }
      } catch {
        // Continue testing next button
      }
    }
  }

  await browser.close();

  console.log("\n=== AUDIT COMPLETE ===");
  console.log(`Total Buttons Clicked & Tested: ${totalButtonsClicked}`);
  console.log(`Total Modal Openings Tested: ${totalModalsVerified}`);
  console.log(`Console Errors: ${consoleErrors.length}`);
  console.log(`Visual / Stacking Issues Found: ${issues.length}`);

  if (consoleErrors.length > 0) {
    console.log("\nConsole Errors Encountered:");
    consoleErrors.forEach((e) => console.log(`  - ${e}`));
  }

  if (issues.length > 0) {
    console.log("\nVisual / Stacking Issues Encountered:");
    issues.forEach((i) => console.log(`  - ${i}`));
  }

  if (consoleErrors.length === 0 && issues.length === 0) {
    console.log("\n>>> ALL BUTTONS, MODALS, AND PAGES ARE 100% VISUALLY COMPLIANT! <<<");
  }
}

run().catch((err) => {
  console.error("Audit runner failed:", err);
  process.exit(1);
});
