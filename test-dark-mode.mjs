import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const page = await browser.newPage();

  console.log('🌐 Opening application...');
  await page.goto('http://localhost:3000');

  // Wait for the app to load
  await page.waitForSelector('header');
  console.log('✅ Application loaded');

  // Find theme toggle button
  const themeToggle = page.locator('button:has(i.fa-sun, i.fa-moon, i.fa-gear)');
  await themeToggle.waitFor({ state: 'visible' });

  const initialLabel = await themeToggle.textContent();
  console.log(`🎨 Initial theme: ${initialLabel.trim()}`);

  // Take screenshot of initial state
  await page.screenshot({ path: 'dark-mode-initial.png', fullPage: true });
  console.log('📸 Screenshot saved: dark-mode-initial.png');

  // Test cycling through themes
  console.log('\n🔄 Testing theme cycle...');

  // Click to light mode
  await themeToggle.click();
  await page.waitForTimeout(500);
  const lightLabel = await themeToggle.textContent();
  console.log(`☀️ After 1st click: ${lightLabel.trim()}`);
  await page.screenshot({ path: 'dark-mode-light.png', fullPage: true });

  // Click to system mode
  await themeToggle.click();
  await page.waitForTimeout(500);
  const systemLabel = await themeToggle.textContent();
  console.log(`⚙️ After 2nd click: ${systemLabel.trim()}`);
  await page.screenshot({ path: 'dark-mode-system.png', fullPage: true });

  // Click back to dark mode
  await themeToggle.click();
  await page.waitForTimeout(500);
  const finalLabel = await themeToggle.textContent();
  console.log(`🌙 After 3rd click: ${finalLabel.trim()}`);
  await page.screenshot({ path: 'dark-mode-final.png', fullPage: true });

  // Verify theme attribute on html element
  const htmlElement = page.locator('html');
  const finalTheme = await htmlElement.getAttribute('data-theme');
  console.log(`\n📊 Final data-theme attribute: ${finalTheme}`);

  console.log('\n✅ Manual test completed! Check the screenshots for visual verification.');

  // Keep browser open for manual inspection
  console.log('\n⏸️  Browser will remain open for 10 seconds...');
  await page.waitForTimeout(10000);

  await browser.close();
})();