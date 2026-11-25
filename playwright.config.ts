import { defineConfig, devices } from '@playwright/test'
import './e2e/support/mail-guard'

// One local port per checkout: E2E_PORT lets a second worktree run its own preview server (4173 is the default and what CI uses).
const PORT = Number(process.env.E2E_PORT ?? 4173)

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    // vite preview only serves an existing build; dist/ is not committed, so a clean checkout needs one.
    command: `npm run build && npm run preview -- --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}/megrendeles/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      // One browser project, on Linux: no page uses WebGL (Rollin is Zdog on a 2D canvas).
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
