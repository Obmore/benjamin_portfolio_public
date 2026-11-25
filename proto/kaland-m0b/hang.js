// Optional sound: off until the visitor presses the key (a browser also requires that gesture). No audio file: two oscillators sing the TRUE value
// under the camera, quantized to a pentatonic scale over two octaves, and the sound is silent while the visitor is not moving (it is their reading).
// Deterministic: the same depth always gives the same note.
const FOK = [0, 2, 4, 7, 9]   // major pentatonic, semitones
const ALAP_HZ = 146.83        // D3

export class Hang {
  constructor() { this.ctx = null; this.on = false }
  async be() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext
      if (!AC) return false
      this.ctx = new AC()
      const c = this.ctx
      this.o1 = c.createOscillator(); this.o1.type = 'sine'
      this.o2 = c.createOscillator(); this.o2.type = 'triangle'; this.o2.detune.value = 7
      this.lp = c.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.frequency.value = 900
      this.g = c.createGain(); this.g.gain.value = 0
      this.o1.connect(this.lp); this.o2.connect(this.lp); this.lp.connect(this.g); this.g.connect(c.destination)
      this.o1.start(); this.o2.start()
    }
    await this.ctx.resume()
    this.on = true
    return true
  }
  ki() {
    this.on = false
    if (this.ctx) this.g.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05)
  }
  /** vn: the true value's place between the series minimum and maximum (0..1); mozgas: how fast the visitor is moving (0..1). */
  hang(vn, mozgas) {
    if (!this.on || !this.ctx) return
    const t = this.ctx.currentTime
    const lepcso = Math.min(9, Math.max(0, Math.round(vn * 9)))
    const fok = FOK[lepcso % 5] + 12 * Math.floor(lepcso / 5)
    const hz = ALAP_HZ * 2 ** (fok / 12)
    this.o1.frequency.setTargetAtTime(hz, t, 0.04)
    this.o2.frequency.setTargetAtTime(hz * 2, t, 0.04)
    this.lp.frequency.setTargetAtTime(500 + 900 * vn, t, 0.1)
    this.g.gain.setTargetAtTime(0.05 * Math.min(1, mozgas * 6), t, 0.12)
  }
}
