import { useId } from 'react'

/** 세 기본 몸이 같은 골격이라 옷·헤어가 같은 자리에 붙습니다. 큰 눈·분홍 머리의 소녀 비율. */
export const CHARACTERS = [
  {
    id: 'peach',
    name: '복숭아',
    skin: '#FFE0D2',
    skinDeep: '#F3B7A8',
    blush: '#FF8FB6',
    mouth: '#E25A86',
    suit: '#FFF4F8',
    shorts: '#FFD0E4',
    hair: '#FF4E93',
    hairDeep: '#E23078',
    irisTop: '#FF8AB8',
    irisBottom: '#C43B86',
  },
  {
    id: 'milk',
    name: '우유',
    skin: '#FFF1EA',
    skinDeep: '#F6C9BE',
    blush: '#F7B4D4',
    mouth: '#E07AA8',
    suit: '#F7FBFF',
    shorts: '#E4D6FF',
    hair: '#F7A0D0',
    hairDeep: '#E07AB8',
    irisTop: '#D7B6FF',
    irisBottom: '#8B5AD6',
  },
  {
    id: 'chestnut',
    name: '밤톨',
    skin: '#F6CDB8',
    skinDeep: '#E3A88E',
    blush: '#F09A9A',
    mouth: '#D45A78',
    suit: '#FFF6F2',
    shorts: '#FFD0DC',
    hair: '#E43774',
    hairDeep: '#B41E5C',
    irisTop: '#FF9A8A',
    irisBottom: '#D23B6A',
  },
]

function HeroEye({ cx, cy, irisId }) {
  return (
    <g>
      <path
        d={`M${cx - 20} ${cy + 4} Q${cx - 18} ${cy - 20} ${cx} ${cy - 18} Q${cx + 18} ${cy - 20} ${cx + 20} ${cy + 4} Q${cx} ${cy + 22} ${cx - 20} ${cy + 4} Z`}
        fill="#fff"
      />
      <ellipse cx={cx} cy={cy + 2} rx="12.5" ry="14.5" fill={`url(#${irisId})`} />
      <ellipse cx={cx} cy={cy + 4} rx="6.6" ry="8.2" fill="#2c1228" />
      <ellipse cx={cx - 3.6} cy={cy - 3} rx="4.2" ry="5" fill="#fff" />
      <circle cx={cx + 4.5} cy={cy + 6} r="1.8" fill="#fff" />
      <path
        d={`M${cx - 21} ${cy - 6} Q${cx - 2} ${cy - 26} ${cx + 20} ${cy - 8}`}
        fill="none"
        stroke="#5a304c"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d={`M${cx + 14} ${cy + 10} l5 6 M${cx + 17} ${cy + 4} l6 3`}
        fill="none"
        stroke="#5a304c"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </g>
  )
}

function DefaultHair({ character, part }) {
  const main = character.hair
  const deep = character.hairDeep
  if (part === 'back') {
    return (
      <g>
        <path d="M120 146 C42 198 30 330 82 430 C124 468 158 372 162 236 C154 186 140 156 120 146 Z" fill={main} />
        <path d="M280 146 C358 198 370 330 318 430 C276 468 242 372 238 236 C246 186 260 156 280 146 Z" fill={main} />
        <ellipse cx="200" cy="148" rx="92" ry="84" fill={deep} />
        <path d="M96 250 C78 320 96 390 128 420" fill="none" stroke="#fff" strokeWidth="8" strokeLinecap="round" opacity="0.28" />
      </g>
    )
  }
  return (
    <g>
      <path
        d="M124 156 C112 96 150 62 200 64 C262 66 292 108 276 150 C250 118 168 112 140 150 C132 156 128 158 124 156 Z"
        fill={main}
      />
      <path d="M126 140 C102 176 106 236 136 262 C150 220 156 168 144 138 Z" fill={deep} />
      <path d="M272 132 C292 164 284 204 258 214 C250 172 256 146 272 132 Z" fill={deep} />
      <ellipse cx="176" cy="92" rx="22" ry="8" fill="#fff" opacity="0.38" />
      <circle cx="246" cy="108" r="5" fill="#fff" />
      <circle cx="246" cy="108" r="2.3" fill={deep} />
    </g>
  )
}

export function Body({ character, coverTop = false, coverBottom = false, showDefaultHair = true }) {
  const skin = character.skin
  const line = 'rgba(120, 60, 84, 0.2)'
  const uid = useId().replace(/:/g, '')
  const irisId = `iris-${uid}`
  return (
    <g>
      <defs>
        <linearGradient id={irisId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={character.irisTop} />
          <stop offset="100%" stopColor={character.irisBottom} />
        </linearGradient>
      </defs>
      {showDefaultHair && <DefaultHair character={character} part="back" />}
      <path
        d="M158 248 C118 262 98 314 110 360 C120 378 140 372 144 352 C154 308 164 276 178 256 Z"
        fill={skin}
        stroke={line}
        strokeWidth="1.5"
      />
      <path
        d="M242 248 C282 262 302 314 290 360 C280 378 260 372 256 352 C246 308 236 276 222 256 Z"
        fill={skin}
        stroke={line}
        strokeWidth="1.5"
      />
      <ellipse cx="118" cy="366" rx="15" ry="14" fill={skin} stroke={line} />
      <ellipse cx="282" cy="366" rx="15" ry="14" fill={skin} stroke={line} />
      <path d="M172 346 C164 400 162 438 170 470 L198 470 C200 428 198 388 196 346 Z" fill={skin} stroke={line} />
      <path d="M204 346 C202 388 200 428 202 470 L230 470 C238 438 236 400 228 346 Z" fill={skin} stroke={line} />
      <path
        d="M156 236 C148 292 154 332 172 354 L228 354 C246 332 252 292 244 236 C220 220 180 220 156 236 Z"
        fill={skin}
        stroke={line}
        strokeWidth="1.5"
      />
      {(!coverTop || !coverBottom) && (
        <g>
          {!coverTop && (
            <path
              d="M162 248 C156 292 162 328 176 344 L224 344 C238 328 244 292 238 248 C214 238 186 238 162 248 Z"
              fill={character.suit}
            />
          )}
          {!coverBottom && (
            <g>
              <path d="M168 338 C160 360 158 392 170 404 L196 400 L196 342 Z" fill={character.shorts} />
              <path d="M204 342 L204 400 L230 404 C242 392 240 360 232 338 Z" fill={character.shorts} />
            </g>
          )}
        </g>
      )}
      <rect x="186" y="210" width="28" height="30" rx="12" fill={skin} />
      <ellipse cx="126" cy="160" rx="12" ry="16" fill={skin} stroke={line} />
      <ellipse cx="274" cy="160" rx="12" ry="16" fill={skin} stroke={line} />
      <ellipse cx="200" cy="150" rx="74" ry="78" fill={skin} stroke={line} strokeWidth="1.5" />
      <ellipse cx="168" cy="124" rx="26" ry="14" fill="#fff" opacity="0.35" />
      <ellipse cx="146" cy="184" rx="14" ry="8" fill={character.blush} opacity="0.72" />
      <ellipse cx="254" cy="184" rx="14" ry="8" fill={character.blush} opacity="0.72" />
      <HeroEye cx={168} cy={154} irisId={irisId} />
      <HeroEye cx={232} cy={154} irisId={irisId} />
      <path d="M196 176 Q200 179 204 176" fill="none" stroke={character.skinDeep} strokeWidth="2" strokeLinecap="round" />
      <path
        d="M188 196 Q200 206 212 196"
        fill="none"
        stroke={character.mouth}
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      {showDefaultHair && <DefaultHair character={character} part="front" />}
    </g>
  )
}
