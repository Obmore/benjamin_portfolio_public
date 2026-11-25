/** One jump pill: the words (the ones already on the page) and the id of the part of the page it leads to. */
export interface Ugras {
  felirat: string
  cel: string
}

/**
 * The jump pills under a page's introduction (/munkaim/, /megrendeles/): one in-page link for each part of the page, in the page's order. A pill is operable (a key's face in a
 * pill, 44 px high, src/site/elemek/ugrasok.css); the words are the page's own headings and names, so the row adds no claim of its own.
 */
export function Ugrasok({ elemek }: { elemek: readonly Ugras[] }) {
  return (
    <ul className="ank">
      {elemek.map((u) => (
        <li key={u.cel}>
          <a className="ank-a" href={`#${u.cel}`}>
            {u.felirat}
          </a>
        </li>
      ))}
    </ul>
  )
}
