const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000');
  
  // Wait for the app to load
  await page.waitForSelector('header');
  
  // Test initial dark mode (should be dark by default)
  const htmlElement = await page.locator('html');
  const initialTheme = await htmlElement.getAttribute('data-theme');
  console.log('Initial theme:', initialTheme);
  
  // Find and click the theme toggle button
  const themeToggle = await page.locator('button:has(i.fa-sun, i.fa-moon, i.fa-gear)');
  await themeToggle.waitFor({ state: 'visible' });
  
  const initialLabel = await themeToggle.textContent();
  console.log('Initial theme label:', initialLabel.trim());
  
  // Click to cycle through themes
  await themeToggle.click();
  await page.waitForTimeout(100);
  const afterFirstClick = await htmlElement.getAttribute('data-theme');
  const labelAfterFirst = await themeToggle.textContent();
  console.log('After first click - Theme:', afterFirstClick, 'Label:', labelAfterFirst.trim());
  
  await themeToggle.click();
  await page.waitForTimeout(100);
  const afterSecondClick = await htmlElement.getAttribute('data-theme');
  const labelAfterSecond = await themeToggle.textContent();
  console.log('After second click - Theme:', afterSecondClick, 'Label:', labelAfterSecond.trim());
  
  await themeToggle.click();
  await page.waitForTimeout(100);
  const afterThirdClick = await htmlElement.getAttribute('data-theme');
  const labelAfterThird = await themeToggle.textContent();
  console.log('After third click - Theme:', afterThirdClick, 'Label:', labelAfterThird.trim());
  
  // Verify we're back to initial state
  if (initialTheme === afterThirdClick && initialLabel.trim() === labelAfterThird.trim()) {
    console.log('\n✅ Dark mode toggle test PASSED!');
  } else {
    console.log('\n❌ Dark mode toggle test FAILED!');
  }
  
  await browser.close();
})();
