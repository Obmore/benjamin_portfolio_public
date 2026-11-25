import { readFile } from 'node:fs/promises'
import { expect, test, type Page } from '@playwright/test'

const DEMO = '/demos/adatgyujto/'

// Every non-empty text the live region gets, in order (the region is cleared before each write).
async function logStatus(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { statusLog: string[] }
    w.statusLog = []
    document.addEventListener('DOMContentLoaded', () => {
      const el = document.getElementById('status')
      if (!el) return
      new MutationObserver(() => {
        if (el.textContent) w.statusLog.push(el.textContent)
      }).observe(el, { childList: true, characterData: true, subtree: true })
    })
  })
  return () => page.evaluate(() => (window as unknown as { statusLog: string[] }).statusLog)
}

test.describe('adatgyujto demo', () => {
  test('loads three machines, a 60-minute chart and the shift report without external requests', async ({ page, baseURL }) => {
    const foreign: string[] = []
    const errors: string[] = []
    page.on('request', (req) => {
      if (!req.url().startsWith(`${baseURL}/`)) foreign.push(req.url())
    })
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto(DEMO)
    await expect(page.locator('.machine')).toHaveCount(3)
    await expect(page.locator('#simTime')).toHaveText(/^\d{1,2}:\d{2}$/)
    const points = await page.locator('#chart polyline').getAttribute('points')
    expect(points?.trim().split(/\s+/)).toHaveLength(60)
    await expect(page.locator('#report tr')).toHaveCount(3)
    await expect(page.locator('#chartCaption')).toContainText('CNC-1')
    expect(foreign).toEqual([])
    expect(errors).toEqual([])
  })

  test('a simulated fault raises an alarm, stops the machine and is counted in the report', async ({ page }) => {
    await page.goto(`${DEMO}?tempo=20`)
    await page.locator('#fault').click()
    const cnc = page.locator('.machine[data-machine="cnc1"]')
    await expect(cnc.locator('.state')).toContainText('Hiba', { timeout: 10_000 })
    await expect(page.locator('#alarms li').filter({ hasText: 'CNC-1: hiba' })).toHaveCount(1)
    await expect(page.locator('#alarms li').filter({ hasText: 'CNC-1: orsóhőmérséklet' })).toHaveCount(1)
    const alarmCell = page.locator('#report tr').first().locator('td').last()
    expect(Number(await alarmCell.textContent())).toBeGreaterThanOrEqual(2)
    // the machine restarts after the fault and the alarm is marked as cleared
    await expect(cnc.locator('.state')).not.toContainText('Hiba', { timeout: 10_000 })
    await expect(page.locator('#alarms li.cleared').filter({ hasText: 'CNC-1: hiba' })).toHaveCount(1)
  })

  test('pause stops the simulated clock and a fault waits for resume with feedback', async ({ page }) => {
    await page.goto(`${DEMO}?tempo=20`)
    await page.locator('#pause').click()
    await expect(page.locator('#pause')).toHaveText('Szimuláció folytatása')
    await expect(page.locator('#runState')).toHaveText('Megállítva')
    const t = await page.locator('#simTime').textContent()
    await page.locator('#fault').click()
    await expect(page.locator('#status')).toContainText('a folytatás után')
    await page.waitForTimeout(600)
    await expect(page.locator('#simTime')).toHaveText(t ?? '')
    await page.locator('#pause').click()
    await expect(page.locator('#simTime')).not.toHaveText(t ?? '')
    await expect(page.locator('.machine[data-machine="cnc1"] .state')).toContainText('Hiba', { timeout: 10_000 })
  })

  test('the fault button and the temperature signal follow the selected machine', async ({ page }) => {
    await page.goto(DEMO)
    await expect(page.locator('#fault')).toHaveText('Hiba szimulálása: CNC-1')
    await expect(page.locator('#chartSignal option[value="temp"]')).toHaveText('Orsóhőmérséklet (°C)')
    await page.locator('#chartMachine').selectOption('pres2')
    await expect(page.locator('#fault')).toHaveText('Hiba szimulálása: Prés-2')
    await expect(page.locator('#chartSignal option[value="temp"]')).toHaveText('Olajhőmérséklet (°C)')
    await expect(page.locator('#chartCaption')).toContainText('Prés-2 · Olajhőmérséklet')
  })

  test('the simulation runs on across a shift change and restarts the shift report', async ({ page }) => {
    const statusLog = await logStatus(page)
    // 10 minutes per second from 13:50: about a second of margin before the change
    await page.goto(`${DEMO}?tempo=10&kezdes=1350`)
    // the change itself is proven by the announcement below; reading the morning label first would race the clock
    await expect(page.locator('#shift')).toHaveText('délután, 14:00–22:00', { timeout: 10_000 })
    await expect.poll(async () => (await statusLog()).some((l) => l.includes('14:00 – Műszakváltás: délután'))).toBe(true)
    // right after the change the report counts only the new shift's minutes
    const run = await page.locator('#report tr').first().locator('td').nth(2).textContent()
    expect(run).toMatch(/^0:\d{2}$/)
    await expect(page.locator('#runState')).toHaveText('Fut')
    await page.locator('#fault').click()
    await expect(page.locator('.machine[data-machine="cnc1"] .state')).toContainText('Hiba', { timeout: 10_000 })
  })

  test('after a shift change the CSV keeps alarms that overlap the new shift, marked, and every event is announced', async ({ page }) => {
    const statusLog = await logStatus(page)
    // 2 minutes per second from 13:54: the fault starts in the morning shift and clears in the afternoon one
    await page.goto(`${DEMO}?tempo=2&kezdes=1354`)
    await page.locator('#fault').click()
    await expect(page.locator('#shift')).toHaveText('délután, 14:00–22:00', { timeout: 15_000 })
    await expect(page.locator('#alarms li.cleared').filter({ hasText: 'CNC-1: hiba' })).toHaveCount(1, { timeout: 15_000 })
    await page.locator('#pause').click()
    const toMin = (hhmm: string) => {
      const [h, m] = hhmm.split(':').map(Number)
      return h * 60 + m
    }
    // what the page shows: start, end (null = active) and text of every alarm
    const shown = await page.locator('#alarms li').evaluateAll((lis) => lis.map((li) => {
      const t = li.querySelector('time')?.textContent ?? ''
      return { time: t, text: (li.textContent ?? '').slice(t.length) }
    }))
    const ui = shown.map(({ time, text }) => {
      const m = /^(\d{1,2}:\d{2})(?: – megszűnt (\d{1,2}:\d{2})| · aktív)$/.exec(time)
      expect(m, time).not.toBeNull()
      return { start: toMin(m![1]), end: m![2] ? toMin(m![2]) : null, text }
    })
    const shiftStart = 14 * 60
    const expected = ui.filter((a) => a.start >= shiftStart || a.end === null || a.end >= shiftStart)
    expect(ui.some((a) => a.start < shiftStart && a.end !== null && a.end >= shiftStart)).toBe(true) // the overlapping case exists
    const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#csv').click()])
    const lines = (await readFile((await download.path()) as string, 'utf8')).slice(1).split('\r\n')
    const head = lines.indexOf('Riasztás kezdete;Gép;Üzenet;Megszűnt;Megjegyzés')
    expect(head).toBeGreaterThan(0)
    const rows = lines.slice(head + 1).filter((l) => l).map((l) => l.split(';'))
    expect(rows).toHaveLength(expected.length)
    for (const r of rows) {
      expect(r[4]).toBe(toMin(r[0]) < shiftStart ? 'előző műszakból' : '')
    }
    // the per-machine count is the alarms that started in this shift
    const cnc = lines.find((l) => l.startsWith('CNC-1;'))?.split(';') ?? []
    expect(rows.filter((r) => r[1] === 'CNC-1' && r[4] === '').length).toBe(Number(cnc[6]))
    // both the shift change and the fault were announced, the fault with its own start time
    const log = await statusLog()
    expect(log.some((l) => l.includes('Műszakváltás: délután'))).toBe(true)
    const fault = ui.find((a) => a.text.startsWith('CNC-1: hiba'))!
    const hhmm = `${Math.floor(fault.start / 60)}:${String(fault.start % 60).padStart(2, '0')}`
    expect(log.some((l) => l.startsWith(`${hhmm} – `) && l.includes('Riasztás: CNC-1: hiba'))).toBe(true)
    // a repeated, identical message is written again, so it is announced again
    await page.locator('#chartMachine').selectOption('pres2')
    await page.locator('#fault').click()
    await expect(page.locator('#status')).toContainText('Prés-2: hiba szimulálva')
    await page.locator('#fault').click()
    await expect(page.locator('#status')).toContainText('már folyamatban van.')
    await page.locator('#fault').click()
    await expect.poll(async () => (await statusLog()).filter((l) => l.endsWith('Prés-2: a hiba szimulálása már folyamatban van.')).length).toBe(2)
  })

  test('at the fastest tempo no announcement is lost', async ({ page }) => {
    const statusLog = await logStatus(page)
    await page.goto(`${DEMO}?tempo=20&kezdes=1000`)
    await page.locator('#fault').click()
    await expect(page.locator('#alarms li').filter({ hasText: 'CNC-1: hiba' })).toHaveCount(1, { timeout: 10_000 })
    await page.locator('#pause').click()
    const raised = await page.locator('#alarms li').evaluateAll((lis) => lis.map((li) => {
      const t = li.querySelector('time')?.textContent ?? ''
      return { at: t.split(/ [–·] /)[0], text: (li.textContent ?? '').slice(t.length) }
    }))
    await expect.poll(async () => {
      const log = (await statusLog()).join(' ')
      return raised.filter((a) => !log.includes(`${a.at} – Riasztás: ${a.text}`)).map((a) => a.text)
    }).toEqual([])
  })

  test('an early start time wraps around midnight on the clock and the chart', async ({ page }) => {
    await page.goto(`${DEMO}?kezdes=0010`)
    await expect(page.locator('#simTime')).toHaveText(/^0:1\d$/)
    await expect(page.locator('#shift')).toHaveText('éjszaka, 22:00–6:00')
    const labels = await page.locator('#chart text.axis').allTextContents()
    expect(labels.some((l) => /^23:1\d$/.test(l))).toBe(true)
    expect(labels.join(' ')).not.toContain('-')
  })

  test('CSV export has a BOM, a header, one line per machine and the alarm list', async ({ page }) => {
    await page.goto(DEMO)
    const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#csv').click()])
    expect(download.suggestedFilename()).toMatch(/^muszakjelentes_minta-gepgyar_\d{4}-\d{2}-\d{2}_(de|du|ej)_\d{4}\.csv$/)
    const text = await readFile((await download.path()) as string, 'utf8')
    expect(text.startsWith('﻿')).toBe(true)
    const lines = text.slice(1).split('\r\n')
    expect(lines[0]).toMatch(/^Műszak;délelőtt, 6:00–14:00;Bemutatóidő;\d{1,2}:\d{2}$/)
    expect(lines[2]).toBe('Gép;Típus;Darab;Üzemidő (perc);Állásidő (perc);Hibaidő (perc);Riasztások;Utolsó hőmérséklet (°C);Utolsó áramfelvétel (A)')
    expect(lines.slice(3, 6).map((l) => l.split(';')[0])).toEqual(['CNC-1', 'Prés-2', 'Hegesztő-3'])
    expect(lines).toContain('Riasztás kezdete;Gép;Üzenet;Megszűnt;Megjegyzés')
  })

  test('fits a 390 px wide phone screen without horizontal scrolling', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(DEMO)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })
})
