import { defineConfig, devices } from '@playwright/test'
import config from './playwright.config'

// Functional checks across engines; the site has no pixel baselines.
// The list is manual: a new cross-engine spec must be added to `testMatch` by hand.
export default defineConfig({
  ...config,
  testMatch: ['privacy.spec.ts', 'megrendeles.spec.ts', 'site.spec.ts', 'rollin.spec.ts', 'lapcsere.spec.ts', 'kontraszt-sortores-compat.spec.ts', 'kontraszt-nagy-betu.spec.ts', 'jogi-linkek.spec.ts', 'elso-resz-garancia.spec.ts', 'mozgas.spec.ts', 'fooldal-compat.spec.ts', 'horgony.spec.ts', 'retegek.spec.ts'],
  projects: [
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
})
