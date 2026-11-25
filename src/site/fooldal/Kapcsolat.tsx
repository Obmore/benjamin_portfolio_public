import { JEL } from '@/content/fooldal'
import { Cimmezo } from '../elemek/Cimmezo'

/** Contact: the H2 and the shared contact end (the address field with its copy key, the reply promise, the two text links). */
export function Kapcsolat() {
  const K = JEL.kapcsolat
  return (
    <section className="tsec sec-contact" id="kapcsolat" aria-labelledby="h-kapcsolat">
      <div className="in">
        <h2 className="h2" id="h-kapcsolat">
          {K.cim}
        </h2>
        <Cimmezo szoveg={K} />
      </div>
    </section>
  )
}
