// The loader scene's counter: the stages of preparing the world, declared up front so "n / N" is honest from the first moment, and ticked off only when the real work is done
// (the module is here, the context exists, each program has compiled and linked, the textures are built, the first frame has been drawn). Never a fake progress bar.
// Pure: no DOM (the node tests import it); hud.ts draws it.

export class Lepesek {
  private readonly nevek: string[]
  private readonly keszek = new Set<string>()
  private readonly figyelo: () => void

  constructor(nevek: readonly string[], figyelo: () => void = () => {}) {
    this.nevek = [...nevek]
    this.figyelo = figyelo
  }

  /** Marks a declared stage done. A name that was not declared, or was already done, changes nothing (a stage never counts twice). */
  kesz(nev: string): void {
    if (!this.nevek.includes(nev) || this.keszek.has(nev)) return
    this.keszek.add(nev)
    this.figyelo()
  }

  get osszes(): number {
    return this.nevek.length
  }
  get kesznek(): number {
    return this.keszek.size
  }
  get vege(): boolean {
    return this.keszek.size === this.nevek.length
  }
  get lista(): readonly string[] {
    return this.nevek
  }
  /** 0..1, for the thread. */
  get arany(): number {
    return this.nevek.length === 0 ? 1 : this.keszek.size / this.nevek.length
  }
}

/** The stages of the particle world, in the order they usually finish (the loader scene's own program is the first compile: it is what the visitor watches while the rest compiles). Chapters added later declare their own stages the same way. */
export const LEPESEK = ['module', 'context', 'loader', 'bright', 'blur', 'composite', 'shaft', 'particles', 'comets', 'grid', 'textures', 'frame'] as const
