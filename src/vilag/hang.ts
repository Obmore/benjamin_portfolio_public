// Optional sound: off until the visitor presses the key (a browser requires that gesture anyway), and no audio file. Two oscillators sing the TRUE value under the camera, quantised to a
// pentatonic scale over two octaves, and they are silent while the visitor is not moving (the sound is their reading, not a soundtrack). The same depth always gives the same note.

/** Major pentatonic, semitones above the root. */
const FOK = [0, 2, 4, 7, 9] as const
/** The root: D3. */
const ALAP_HZ = 146.83

/** The note for a value's place between the series' minimum and maximum (0..1): the step on the ten-step scale and its frequency in Hz. Pure and deterministic. */
export function hangNota(vn: number): { lepcso: number; hz: number } {
  const lepcso = Math.min(9, Math.max(0, Math.round(vn * 9)))
  const fok = FOK[lepcso % 5] + 12 * Math.floor(lepcso / 5)
  return { lepcso, hz: ALAP_HZ * 2 ** (fok / 12) }
}

interface Lanc {
  ctx: AudioContext
  o1: OscillatorNode
  o2: OscillatorNode
  lp: BiquadFilterNode
  g: GainNode
}

export class Hang {
  /** The key is on: the world is allowed to make sound. */
  on = false
  private lanc: Lanc | null = null

  /** Starts (or resumes) the sound. Resolves false where the browser has no Web Audio or refuses. */
  async be(): Promise<boolean> {
    if (!this.lanc) {
      const AC: typeof AudioContext | undefined = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return false
      const ctx = new AC()
      const o1 = ctx.createOscillator()
      o1.type = 'sine'
      const o2 = ctx.createOscillator()
      o2.type = 'triangle'
      o2.detune.value = 7
      const lp = ctx.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 900
      const g = ctx.createGain()
      g.gain.value = 0
      o1.connect(lp)
      o2.connect(lp)
      lp.connect(g)
      g.connect(ctx.destination)
      o1.start()
      o2.start()
      this.lanc = { ctx, o1, o2, lp, g }
    }
    try {
      await this.lanc.ctx.resume()
    } catch {
      return false
    }
    this.on = true
    return true
  }

  /** Fades to silence and stops making sound until the key is pressed again. */
  ki(): void {
    this.on = false
    if (this.lanc) this.lanc.g.gain.setTargetAtTime(0, this.lanc.ctx.currentTime, 0.05)
  }

  /** The tab is hidden or the world closed: the audio clock stops (no sound, no wake-ups); `folytat` resumes it if the key is still on. */
  szuntet(): void {
    if (this.lanc && this.lanc.ctx.state === 'running') void this.lanc.ctx.suspend()
  }
  folytat(): void {
    if (this.on && this.lanc && this.lanc.ctx.state === 'suspended') void this.lanc.ctx.resume()
  }

  /** vn: the true value's place between the series' minimum and maximum (0..1); mozgas: how fast the visitor is moving (0..1). Call every frame. */
  hang(vn: number, mozgas: number): void {
    if (!this.on || !this.lanc) return
    const { ctx, o1, o2, lp, g } = this.lanc
    const t = ctx.currentTime
    const { hz } = hangNota(vn)
    o1.frequency.setTargetAtTime(hz, t, 0.04)
    o2.frequency.setTargetAtTime(hz * 2, t, 0.04)
    lp.frequency.setTargetAtTime(500 + 900 * vn, t, 0.1)
    g.gain.setTargetAtTime(0.05 * Math.min(1, mozgas * 6), t, 0.12)
  }

  /** Frees the audio graph. */
  megsemmisit(): void {
    this.on = false
    if (this.lanc) {
      try {
        this.lanc.o1.stop()
        this.lanc.o2.stop()
      } catch {
        /* already stopped */
      }
      void this.lanc.ctx.close()
      this.lanc = null
    }
  }
}
