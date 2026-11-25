// The theme choice's key and valid values, DOM-free so the build side (jel-fej.ts, vite.config.ts) can import them; the behaviour is in tema-tar.ts.

/** The localStorage key of the visitor's theme choice. */
export const TEMA_KULCS = 'jel-tema'
/** The two valid values of the stored choice. */
export const TEMA_ERTEKEK = ['sotet', 'vilagos'] as const
export type Tema = (typeof TEMA_ERTEKEK)[number]
