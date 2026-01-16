import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E 测试配置
 *
 * 测试策略：
 * - 默认运行在 mock-server 环境下
 * - 不依赖真实 Gemini API
 * - 只覆盖关键路径
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // 顺序执行，避免 mock-server 状态冲突
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // 单 worker，避免端口冲突
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // 自动启动前端和 mock-server
  webServer: [
    {
      command: 'npm run mock-server',
      url: 'http://localhost:3001/health',
      reuseExistingServer: !process.env.CI,
      timeout: 10000,
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
    },
  ],
});
