import { useId } from 'react'

/**
 * 드레스업 공통 골격.
 * 머리 정수리 70 · 눈 148 · 턱 214 · 허리 330 · 발목 508 · 발 532
 * 세 몸은 색만 다르고 같은 자리에 옷이 붙습니다.
 */
export const CHARACTERS = [
  {
    id: 'peach',
    name: '복숭아',
    skin: '#FFE3D6',
    skinDeep: '#F0B5A4',
    blush: '#FF8FB8',
    mouth: '#E25484',
    suit: '#FFF7FB',
    shorts: '#FFD4E6',
    hair: '#FF4D8D',
    hairDeep: '#E02270',
    hairShine: '#FFD0E4',
    iris: '#FF5C98',
    irisDeep: '#D43274',
    lash: '#5A2848',
  },
  {
    id: 'milk',
    name: '우유',
    skin: '#FFF3EE',
    skinDeep: '#F4C8BC',
    blush: '#F3B4D8',
    mouth: '#E07AAA',
    suit: '#F8F7FF',
    shorts: '#E6D8FF',
    hair: '#F7A4D4',
    hairDeep: '#E07CB8',
    hairShine: '#FFE4F4',
    iris: '#B48BFF',
    irisDeep: '#7A4AD4',
    lash: '#4C3468',
  },
  {
    id: 'chestnut',
    name: '밤톨',
    skin: '#F8D2C0',
    skinDeep: '#E2A88E',
    blush: '#F09898',
    mouth: '#D45474',
    suit: '#FFF6F3',
    shorts: '#FFD0D8',
    hair: '#E43778',
    hairDeep: '#B01858',
    hairShine: '#FFB4D0',
    iris: '#FF7A78',
    irisDeep: '#D43A62',
    lash: '#5A2438',
  },
]

function Eye({ cx, cy, iris, irisDeep, lash }) {
  return (
    <g>
      <path
        d={`M${cx - 19} ${cy + 2} C ${cx - 17} ${cy - 15}, ${cx - 6} ${cy - 18}, ${cx + 1} ${cy - 15} C ${cx + 10} ${cy - 18}, ${cx + 19} ${cy - 10}, ${cx + 17} ${cy + 3} C ${cx + 14} ${cy + 16}, ${cx + 1} ${cy + 17}, ${cx - 19} ${cy + 2} Z`}
        fill="#fff"
      />
      <ellipse cx={cx + 0.5} cy={cy + 2.5} rx="10.2" ry="11.4" fill={iris} />
      <path
        d={`M${cx - 10} ${cy + 4} Q ${cx} ${cy + 16} ${cx + 11} ${cy + 4}`}
        fill={irisDeep}
      />
      <ellipse cx={cx + 0.4} cy={cy + 3.2} rx="5.1" ry="6.1" fill="#24101c" />
      <ellipse cx={cx - 3.4} cy={cy - 2.4} rx="3.3" ry="4" fill="#fff" />
      <circle cx={cx + 4.2} cy={cy + 5.2} r="1.45" fill="#fff" />
      <path
        d={`M${cx - 18} ${cy - 1} Q ${cx - 2} ${cy - 20} ${cx + 16} ${cy - 3}`}
        fill="none"
        stroke={lash}
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d={`M${cx + 12} ${cy - 7} l3.5 -4.5 M${cx + 15} ${cy - 2} l4.5 -1.5 M${cx + 14} ${cy + 4} l4 2`}
        fill="none"
        stroke={lash}
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      <path
        d={`M${cx - 14} ${cy - 22} Q ${cx - 2} ${cy - 28} ${cx + 12} ${cy - 20}`}
        fill="none"
        stroke={irisDeep}
        strokeWidth="1.7"
        strokeLinecap="round"
        opacity="0.85"
      />
    </g>
  )
}

function DefaultHair({ character, part }) {
  const main = character.hair
  const deep = character.hairDeep
  const shine = character.hairShine
  if (part === 'back') {
    return (
      <g>
        <path d="M146 168 C108 200 96 300 118 450 C140 490 168 430 172 260 C168 210 160 180 146 168 Z" fill={main} />
        <path d="M254 168 C292 200 304 300 282 450 C260 490 232 430 228 260 C232 210 240 180 254 168 Z" fill={main} />
        <path d="M158 200 C150 280 156 360 168 430" fill="none" stroke={deep} strokeWidth="10" strokeLinecap="round" opacity="0.28" />
        <path d="M242 200 C250 280 244 360 232 430" fill="none" stroke={deep} strokeWidth="10" strokeLinecap="round" opacity="0.28" />
        <path d="M128 250 C118 320 126 390 146 440" fill="none" stroke={shine} strokeWidth="6" strokeLinecap="round" opacity="0.45" />
      </g>
    )
  }
  return (
    <g>
      <path
        d="M128 158 C114 96 156 62 200 64 C258 66 292 108 274 156 C248 118 164 112 140 152 C132 160 128 160 128 158 Z"
        fill={main}
      />
      <path d="M132 132 C108 170 112 236 142 268 C156 222 160 164 146 132 Z" fill={deep} />
      <path d="M270 128 C292 162 286 208 260 220 C252 176 256 146 270 128 Z" fill={deep} />
      <path d="M196 62 C186 42 214 38 208 60" fill="none" stroke={main} strokeWidth="7" strokeLinecap="round" />
      <path d="M158 88 C176 78 196 80 210 92" fill="none" stroke={shine} strokeWidth="6" strokeLinecap="round" opacity="0.7" />
      <circle cx="250" cy="108" r="5.5" fill="#fff" />
      <circle cx="250" cy="108" r="2.6" fill={deep} />
    </g>
  )
}

export function Body({ character, coverTop = false, coverBottom = false, showDefaultHair = true }) {
  const skin = character.skin
  const line = 'rgba(120, 64, 84, 0.16)'
  const uid = useId().replace(/:/g, '')
  return (
    <g>
      {showDefaultHair && <DefaultHair character={character} part="back" />}
      {/* 팔 */}
      <path d="M162 236 C132 250 112 286 108 328 C118 340 132 332 136 314 C146 278 156 256 174 242 Z" fill={skin} stroke={line} />
      <path d="M238 236 C268 250 288 286 292 328 C282 340 268 332 264 314 C254 278 244 256 226 242 Z" fill={skin} stroke={line} />
      <ellipse cx="112" cy="336" rx="13" ry="12" fill={skin} stroke={line} />
      <ellipse cx="100" cy="330" rx="5" ry="6.5" fill={skin} />
      <ellipse cx="288" cy="336" rx="13" ry="12" fill={skin} stroke={line} />
      <ellipse cx="300" cy="330" rx="5" ry="6.5" fill={skin} />
      {/* 다리 */}
      <path d="M176 340 C170 400 166 460 170 508 L196 508 C198 460 196 400 194 340 Z" fill={skin} stroke={line} />
      <path d="M206 340 C204 400 202 460 204 508 L230 508 C234 460 230 400 224 340 Z" fill={skin} stroke={line} />
      {/* 몸통 */}
      <path
        d="M164 230 C156 268 166 312 176 340 L224 340 C234 312 244 268 236 230 C222 216 178 216 164 230 Z"
        fill={skin}
        stroke={line}
      />
      {(!coverTop || !coverBottom) && (
        <g>
          {!coverTop && (
            <path
              d="M170 246 C164 280 170 318 180 336 L220 336 C230 318 236 280 230 246 C214 236 186 236 170 246 Z"
              fill={character.suit}
            />
          )}
          {!coverBottom && (
            <g>
              <path d="M176 332 C170 358 170 392 180 404 L198 398 L196 334 Z" fill={character.shorts} />
              <path d="M204 334 L202 398 L220 404 C230 392 230 358 224 332 Z" fill={character.shorts} />
            </g>
          )}
        </g>
      )}
      <path d="M188 206 H212 V230 H188 Z" fill={skin} />
      <path d="M186 206 Q200 198 214 206 L212 228 Q200 236 188 228 Z" fill={skin} />
      {/* 얼굴 */}
      <path
        d="M200 78 C252 80 270 112 266 150 C262 184 244 210 200 216 C156 210 138 184 134 150 C130 112 148 80 200 78 Z"
        fill={skin}
        stroke={line}
      />
      <ellipse cx="168" cy="112" rx="22" ry="12" fill="#fff" opacity="0.28" />
      <ellipse cx="154" cy="172" rx="12" ry="7" fill={character.blush} opacity="0.75" />
      <ellipse cx="246" cy="172" rx="12" ry="7" fill={character.blush} opacity="0.75" />
      <Eye cx={176} cy={146} iris={character.iris} irisDeep={character.irisDeep} lash={character.lash} />
      <Eye cx={224} cy={146} iris={character.iris} irisDeep={character.irisDeep} lash={character.lash} />
      <path d="M196 168 Q200 171 204 168" fill="none" stroke={character.skinDeep} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M188 186 Q200 196 212 186" fill="none" stroke={character.mouth} strokeWidth="2.3" strokeLinecap="round" />
      {showDefaultHair && <DefaultHair character={character} part="front" />}
      <g id={uid} />
    </g>
  )
}
