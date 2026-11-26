// The home page's entry to the 3D world (thread V7a). Runs the gate at idle after load; when the setup passes, reveals the button, prefetches the world module as text under the
// warm-up rule, and on pointer/focus/touch intent or click evaluates it once and opens the dialog. The ordinary page is complete without it, so every failure hides the button again.
import vilagUrl from 'virtual:vilag-url'
import { bemelegitesIndok, kapuProba } from '../vilag/kapu.ts'
import type { Beallitas, BezarOk, Proba, Vilag } from '../vilag/tipusok.ts'

declare global {
  interface Window {
    __vilagProba?: Proba
  }
}

interface VilagModul {
  keszit: (beallitas: Beallitas) => Vilag
}

type Kapcsolat = {
  saveData?: boolean
  effectiveType?: string
}

function uresjarat(cb: () => void): void {
  if (typeof requestIdleCallback === 'function') requestIdleCallback(cb, { timeout: 2000 })
  else setTimeout(cb, 200)
}

export function vilagBelepoIndit(): void {
  const gomb = document.querySelector<HTMLButtonElement>('[data-vilag-belepo]')
  if (!gomb) return

  let letoltes: Promise<string> | null = null
  let vilagIgeret: Promise<Vilag | null> | null = null

  const hiba = (): void => {
    gomb.hidden = true
    gomb.setAttribute('data-vilag-belepo', 'hiba')
  }

  const bezarva = (ok: BezarOk): void => {
    if (ok === 'letra' || ok === 'kontextus' || ok === 'hiba') hiba()
  }

  const letolt = (): Promise<string> => {
    letoltes ??= fetch(vilagUrl).then((res) => {
      if (!res.ok) throw new Error(`vilag: ${res.status}`)
      return res.text()
    })
    return letoltes
  }

  const modulBetolt = async (): Promise<VilagModul> => {
    if (import.meta.env.DEV) {
      return (await import(/* @vite-ignore */ vilagUrl)) as VilagModul
    }
    const szoveg = await letolt()
    const blobUrl = URL.createObjectURL(new Blob([szoveg], { type: 'text/javascript' }))
    try {
      return (await import(/* @vite-ignore */ blobUrl)) as VilagModul
    } finally {
      URL.revokeObjectURL(blobUrl)
    }
  }

  const masodikLepcsotIndit = (): Promise<Vilag | null> => {
    vilagIgeret ??= (async () => {
      try {
        const m = await modulBetolt()
        const vilag = m.keszit({
          lap: document.getElementById('top'),
          nyito: gomb,
          proba: window.__vilagProba,
          bezarva,
        })
        vilag.elokeszit().catch(() => {})
        return vilag
      } catch {
        hiba()
        return null
      }
    })()
    return vilagIgeret
  }

  const bemelegitesEllenorzes = (): void => {
    const kapcsolat = (navigator as Navigator & { connection?: Kapcsolat }).connection
    const mentesiAdat = !!kapcsolat?.saveData || matchMedia('(prefers-reduced-data: reduce)').matches
    const bemelegites = bemelegitesIndok({
      mentesiAdat,
      tipus: kapcsolat?.effectiveType,
      lathato: document.visibilityState === 'visible',
      kapuElutasitotta: false,
    })
    if (bemelegites === null) {
      letolt()
        .then(() => {
          gomb.setAttribute('data-vilag-bemelegites', 'kesz')
        })
        .catch(() => {})
      return
    }
    if (bemelegites === 'tab-hidden') {
      const onLathato = (): void => {
        if (document.visibilityState !== 'visible') return
        document.removeEventListener('visibilitychange', onLathato)
        bemelegitesEllenorzes()
      }
      document.addEventListener('visibilitychange', onLathato)
      return
    }
    const ok = bemelegites.split(':')[0]!.trim()
    gomb.setAttribute('data-vilag-bemelegites', 'kihagyva')
    gomb.setAttribute('data-vilag-bemelegites-ok', ok)
  }

  const kapuEllenorzes = (): void => {
    const proba = window.__vilagProba
    const { indok } = kapuProba(!!proba?.szoftveres)
    if (indok !== null) {
      gomb.setAttribute('data-vilag-belepo', 'elutasitva')
      return
    }
    gomb.hidden = false
    gomb.setAttribute('data-vilag-belepo', 'lathato')

    const szandek = (): void => {
      masodikLepcsotIndit()
    }
    gomb.addEventListener('pointerenter', szandek, { once: true })
    gomb.addEventListener('focus', szandek, { once: true })
    gomb.addEventListener('touchstart', szandek, { once: true, passive: true })
    gomb.addEventListener('click', () => {
      masodikLepcsotIndit().then((vilag) => {
        vilag?.megnyit().catch(() => {})
      })
    })

    bemelegitesEllenorzes()
  }

  if (document.readyState === 'complete') uresjarat(kapuEllenorzes)
  else window.addEventListener('load', () => uresjarat(kapuEllenorzes), { once: true })
}
