import { buildRollinScene, STAGE_MS, type RollinStage } from './scene'
import { SZOVEG } from './szoveg'

const SORREND: RollinStage[] = ['signal', 'open', 'leaving', 'ride', 'return', 'locking', 'charge']
/** The step key a stage belongs to (0 Dokkolva, 1 Nyitás, 2 Úton, 3 Töltés); the page's key row has the photo's key in front of these four. */
const FAZIS: Record<RollinStage, number> = { docked: 0, signal: 1, open: 1, leaving: 2, ride: 2, return: 2, locking: 3, charge: 3 }
const FOLYAMATBAN: RollinStage[] = ['signal', 'open', 'leaving', 'return', 'locking']
/** A key's whole sequence ends within this time (ms): the stages' own durations are scaled down when they add up to more. */
const SOROZAT_MS = 1200

// Hands the main thread back between scene build steps. Where supported,
// scheduler.yield() keeps the continuation ahead of other queued tasks.
const yieldToMain = () => globalThis.scheduler?.yield?.() ?? new Promise<void>((resolve) => setTimeout(resolve))
// Build steps rarely take over 5 ms even at 8x CPU throttling, so tasks that
// stop taking steps after sliceMs stay far below the 50 ms long-task budget.
const sliceMs = 4

/**
 * Builds the drawing into the page's own drawing box (`[data-rollin-rajz]`, hidden until a step key is pressed) in short steps, then arms the keys of `[data-rollin-vez]`.
 * Key 0 ("Fénykép") shows the photo with its caption; keys 1 to 4 show the drawing at that step. The keys, the status line and the live region are in the page already (src/site/pages/Munkaim.tsx),
 * so loading this chunk moves nothing. On an error the parts wired so far are taken down and the error is thrown on; the caller removes the keys and the box, and the photo stays.
 * On success it returns the function that takes everything down again.
 */
export async function mountRollin(blokk: HTMLElement): Promise<() => void> {
  const vez = blokk.querySelector<HTMLElement>('[data-rollin-vez]')!
  const rajz = blokk.querySelector<HTMLElement>('[data-rollin-rajz]')!
  const ter = rajz.parentElement!
  let task = -Infinity
  const proceed = async () => {
    if (performance.now() - task >= sliceMs) {
      await yieldToMain()
      task = performance.now()
    }
  }
  const build = buildRollinScene(rajz.querySelector<SVGSVGElement>('svg.rd-render')!)
  let step
  do {
    await proceed()
    step = build.next()
  } while (!step.done)
  const scene = step.value
  await proceed()

  const cleanups: (() => void)[] = []
  let alive = true
  const teardown = () => {
    alive = false
    scene.destroy()
    for (const cleanup of cleanups.splice(0).reverse()) cleanup()
  }
  try {
    const buttons = [...vez.querySelectorAll<HTMLButtonElement>('[role="radio"]')]
    const status = vez.querySelector<HTMLElement>('.mb-allapot')!
    const announcer = vez.querySelector<HTMLElement>('.mb-bejelentes')!
    const caption = status.dataset.alairas ?? ''
    // What the photo stands for while the drawing shows: it is hidden from assistive technology then, so only one picture is described at a time.
    const photo = [...ter.children].filter((el) => el !== rajz)
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    let mode: 'photo' | 'drawing' = 'photo'
    let stage: RollinStage = 'docked'
    let goal: RollinStage = 'docked'
    let pending: number | null = null
    let focused = 0

    const busy = () => FOLYAMATBAN.includes(stage)
    const checked = () => (mode === 'photo' ? 0 : FAZIS[stage] + 1)
    const rove = (index: number) => buttons.forEach((button, i) => (button.tabIndex = i === index ? 0 : -1))
    // The visible line follows every stage; the live region only gets the first and the final one of a run.
    const sync = (announce: boolean) => {
      const text = mode === 'photo' ? caption : SZOVEG.allapot[stage]
      status.textContent = text
      if (announce) announcer.textContent = text
      const on = checked()
      buttons.forEach((button, i) => {
        button.setAttribute('aria-checked', String(i === on))
        // aria-disabled keeps keyboard focus while preventing overlapping actions.
        button.setAttribute('aria-disabled', String(busy()))
      })
      rove(vez.contains(document.activeElement) ? focused : on)
      vez.dataset.stage = stage
      vez.dataset.nezet = mode
    }
    const showDrawing = () => {
      if (mode === 'drawing') return
      mode = 'drawing'
      for (const el of photo) el.setAttribute('aria-hidden', 'true')
      rajz.hidden = false
      // (re)starts the reveal of munkaim.css, which is a CSS animation of this attribute
      delete rajz.dataset.nyit
      void rajz.offsetWidth
      rajz.dataset.nyit = ''
    }
    const showPhoto = () => {
      mode = 'photo'
      for (const el of photo) el.removeAttribute('aria-hidden')
      delete rajz.dataset.nyit
      rajz.hidden = true
    }
    const set = (next: RollinStage, animate = false, complete?: () => void, announce = true, scale = 1) => {
      if (!alive) return
      stage = next
      sync(announce)
      scene.show(next, animate, complete, scale)
    }
    // Plays the stages after the current one up to the goal; "ride" and "charge" are resting poses.
    const next = (queue: RollinStage[], first: boolean, scale: number) => {
      const [head, ...rest] = queue
      if (!head) {
        const wanted = pending
        pending = null
        if (wanted !== null) choose(wanted)
        return
      }
      set(head, head !== 'ride' && head !== 'charge', () => next(rest, false, scale), first || rest.length === 0, scale)
    }
    const go = (end: RollinStage) => {
      goal = end
      if (media.matches) return set(end)
      const queue = SORREND.slice(SORREND.indexOf(stage) + 1, SORREND.indexOf(end) + 1)
      const total = queue.reduce((sum, s) => sum + STAGE_MS[s], 0)
      next(queue, true, total > SOROZAT_MS ? SOROZAT_MS / total : 1)
    }
    // `index` is the key's place in the row: 0 the photo, 1 to 4 the steps.
    const choose = (index: number) => {
      // The photo's key takes effect at once: a running sequence jumps to its end pose (hidden behind the photo anyway).
      if (index === 0 && busy()) settle()
      // Any other press during a running sequence is remembered and followed once the sequence has ended.
      if (busy()) {
        pending = index
        return
      }
      pending = null
      if (index === 0) {
        if (mode === 'photo') return
        showPhoto()
        return sync(true)
      }
      const fresh = mode === 'photo'
      showDrawing()
      if (index === 1) return set('docked', false, undefined, true)
      if (index === 4) {
        if (stage !== 'charge') go('charge')
        else if (fresh) sync(true)
        return
      }
      if (index === 3 && stage === 'charge') return set('ride')
      if (index === 2 && stage !== 'docked') set('docked', false, undefined, false)
      if (stage === 'docked') go('ride')
      else if (fresh) sync(true)
    }
    // A running sequence jumps to its end pose (the block left the screen, the tab was hidden, motion was turned off).
    const settle = () => {
      if (!busy()) return
      pending = null
      set(goal)
    }

    buttons.forEach((button, i) => {
      const onClick = () => choose(i)
      const onFocus = () => {
        focused = i
        rove(i)
      }
      // The arrows only move the focus (Space and Enter press, as on any button); the row is one tab stop that follows the focus.
      const onKey = (event: KeyboardEvent) => {
        const delta = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0
        if (!delta) return
        event.preventDefault()
        buttons[(i + delta + buttons.length) % buttons.length]!.focus()
      }
      const onBlur = (event: FocusEvent) => {
        if (!vez.contains(event.relatedTarget as Node | null)) rove(checked())
      }
      button.addEventListener('click', onClick)
      button.addEventListener('focus', onFocus)
      button.addEventListener('keydown', onKey)
      button.addEventListener('blur', onBlur)
      cleanups.push(() => {
        button.removeEventListener('click', onClick)
        button.removeEventListener('focus', onFocus)
        button.removeEventListener('keydown', onKey)
        button.removeEventListener('blur', onBlur)
      })
    })

    const viewport = new IntersectionObserver(([entry]) => {
      if (!entry!.isIntersecting) settle()
    })
    viewport.observe(blokk)
    cleanups.push(() => viewport.disconnect())
    const onHidden = () => {
      if (document.hidden) settle()
    }
    const onMotion = () => {
      if (media.matches) settle()
    }
    document.addEventListener('visibilitychange', onHidden)
    window.addEventListener('pagehide', settle)
    media.addEventListener('change', onMotion)
    cleanups.push(() => {
      document.removeEventListener('visibilitychange', onHidden)
      window.removeEventListener('pagehide', settle)
      media.removeEventListener('change', onMotion)
    })

    // Ready: enable the keys and make the announcer live. Its text does not change here, so nothing is announced unprompted.
    sync(false)
    for (const button of buttons) button.disabled = false
    announcer.setAttribute('role', 'status')
    announcer.setAttribute('aria-live', 'polite')
    announcer.setAttribute('aria-atomic', 'true')
    vez.dataset.allapot = 'kesz'
  } catch (error) {
    teardown()
    throw error
  }
  return () => {
    teardown()
    vez.remove()
    rajz.remove()
  }
}
