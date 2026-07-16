import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  // WebGL/Rapier scenes are GPU-heavy; running several full canvases in one
  // browser process makes interaction tests race with scene teardown.
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: { args: ['--enable-webgl', '--use-angle=swiftshader'] },
      },
    },
  ],
  webServer: {
    command: 'bun run build && bun run preview --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
  },
})
