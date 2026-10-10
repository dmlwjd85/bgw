import { CHARACTERS, Body } from './Body.jsx'
import { SplitLayers } from './items.jsx'

export function Doll({ characterId, equipped, className = '' }) {
  const character = CHARACTERS.find((c) => c.id === characterId) ?? CHARACTERS[0]
  return (
    <svg className={`doll-svg ${className}`} viewBox="40 40 320 480" role="img" aria-label={`${character.name} 인형`}>
      <ellipse cx="200" cy="500" rx="78" ry="14" fill="rgba(120, 72, 64, 0.16)" />
      <SplitLayers equipped={equipped} part="back" />
      <Body
        character={character}
        coverTop={Boolean(equipped.top || equipped.dress)}
        coverBottom={Boolean(equipped.bottom || equipped.dress)}
        showDefaultHair={!equipped.hair}
      />
      <SplitLayers equipped={equipped} part="front" />
    </svg>
  )
}
