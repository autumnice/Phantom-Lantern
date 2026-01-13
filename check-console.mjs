import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Collect console messages
  const logs = [];
  page.on('console', msg => {
    logs.push(`[${msg.type()}] ${msg.text()}`);
  });

  page.on('pageerror', error => {
    logs.push(`[ERROR] ${error.message}`);
  });

  console.log('Opening application...');
  await page.goto('http://localhost:3000');

  await page.waitForSelector('header');
  await page.waitForTimeout(2000);

  console.log('\nConsole logs:');
  if (logs.length === 0) {
    console.log('No logs captured');
  } else {
    logs.forEach(log => console.log(log));
  }

  // Check theme toggle
  try {
    const toggle = page.locator('button:has(i.fa-sun, i.fa-moon, i.fa-gear)');
    await toggle.waitFor({ state: 'visible' });
    const label = await toggle.textContent();
    console.log(`\nTheme toggle found: ${label.trim()}`);
  } catch (e) {
    console.log('\nTheme toggle not found');
  }

  await page.waitForTimeout(5000);
  await browser.close();
})();