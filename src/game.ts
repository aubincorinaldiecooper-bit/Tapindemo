import { betchuDareCards, classicCards, shotOClockCards, wildCardsList } from './data'

export type Mode = 'classic' | 'betchu'
export type CardKind = 'classic' | 'betchu' | 'shotoclock' | 'wildcard' | 'duel'

export interface DrawnCard {
  id: number
  index: number
  kind: CardKind
  text: string
  spiceLabel: string
  spiceClass: string
  isIcebreaker: boolean
}

let drawCounter = 0

const spiceClassFor = (spice: string) =>
  spice === 'Wild' ? 'spice-wild' : spice === 'Spicy' ? 'spice-spicy' : spice === 'Icebreaker' ? 'spice-icebreaker' : 'spice-mild'

export function drawCard(mode: Mode, first = false, allowDuel = false, duelChance = 0.12): DrawnCard {
  const id = ++drawCounter
  // Head-to-head: two players get the same dare on live video. ~12% of draws once the party has 2+ phones.
  if (allowDuel && !first && Math.random() < duelChance) {
    const pool = mode === 'betchu' ? betchuDareCards : classicCards.filter((c) => c.spice !== 'Icebreaker').map((c) => c.text)
    const text = pool[Math.floor(Math.random() * pool.length)]
    return { id, index: 0, kind: 'duel', text, spiceLabel: 'HEAD TO HEAD', spiceClass: 'spice-duel', isIcebreaker: false }
  }
  const pool = first || mode === 'classic' ? classicCards.length : betchuDareCards.length
  const index = Math.floor(Math.random() * pool)

  if (mode === 'betchu') {
    return { id, index, kind: 'betchu', text: betchuDareCards[index % betchuDareCards.length], spiceLabel: 'STRICT DARE', spiceClass: 'spice-betchu-dare', isIcebreaker: false }
  }

  // Shot O'Clock < 10% of draws, Wildcards ~15%.
  const roll = Math.random()
  if (roll < 0.08) {
    const card = shotOClockCards[Math.floor(Math.random() * shotOClockCards.length)]
    return { id, index, kind: 'shotoclock', text: card.text, spiceLabel: "SHOT O'CLOCK", spiceClass: 'spice-shotoclock', isIcebreaker: false }
  }
  if (roll < 0.23) {
    const card = wildCardsList[Math.floor(Math.random() * wildCardsList.length)]
    return { id, index, kind: 'wildcard', text: card.text, spiceLabel: 'WILDCARD', spiceClass: 'spice-wildcard', isIcebreaker: false }
  }
  const card = classicCards[index % classicCards.length]
  return { id, index, kind: 'classic', text: card.text, spiceLabel: card.spice, spiceClass: spiceClassFor(card.spice), isIcebreaker: card.spice === 'Icebreaker' }
}
