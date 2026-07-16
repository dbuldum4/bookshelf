import { defineConfig, devices } from '@playwright/test'

const basePath = process.env.VITE_BASE || '/bookshelf/'
const normalizedBase = basePath.endsWith('/') ? basePath : `${basePath}/`
const origin = 'http://127.0.0.1:4173'

export default defineConfig({
  testDir: './e2e',
  // WebGL/Rapier scenes are GPU-heavy; running several full canvases in one
  // browser process makes interaction tests race with scene teardown.
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: `${origin}${normalizedBase}`,
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
    url: `${origin}${normalizedBase}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
