import type { Page } from '@playwright/test'

/** Properties whose animation moves, scales or rotates something. Not allowed under reduced motion (owner decision, 2026-11-13). */
const MOVING = ['transform', 'translate', 'scale', 'rotate']

/** Everything on the page that moves under the current media settings: animations and transitions of a moving property, and infinite loops. */
export function movingAnimations(page: Page): Promise<string[]> {
  return page.evaluate((moving) => {
    const out: string[] = []
    for (const animation of document.getAnimations()) {
      const effect = animation.effect as KeyframeEffect | null
      const target = effect?.target as Element | null | undefined
      const where = `${target?.tagName.toLowerCase() ?? '?'}.${target?.className ?? ''}`
      const name = (animation as CSSAnimation).animationName ?? (animation as CSSTransition).transitionProperty ?? ''
      for (const frame of effect?.getKeyframes() ?? []) {
        for (const key of Object.keys(frame)) if (moving.includes(key)) out.push(`${name} animates ${key} on ${where}`)
      }
      if (effect?.getComputedTiming().iterations === Infinity) out.push(`${name} loops forever on ${where}`)
    }
    return out
  }, MOVING)
}
