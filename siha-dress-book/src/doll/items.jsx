/** 슬롯은 한 장만 붙습니다. 원피스를 붙이면 상의·하의는 떼고, 그 반대도 같습니다. */

const ink = 'rgba(92, 52, 62, 0.2)'

function Bow({ x, y, fill = '#E45B86', knot = '#FFE08A', scale = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <ellipse cx="-14" cy="0" rx="14" ry="9" fill={fill} />
      <ellipse cx="14" cy="0" rx="14" ry="9" fill={fill} />
      <circle r="5.5" fill={knot} />
      <path d="M-6 4 L-10 16 L-2 10 Z" fill={fill} />
      <path d="M6 4 L10 16 L2 10 Z" fill={fill} />
    </g>
  )
}

export const ITEMS = [
  {
    id: 'hair-twin',
    slot: 'hair',
    category: 'hair',
    codes: ['school'],
    name: '양갈래 리본',
    back: (
      <g>
        <path d="M132 148 C68 176 52 280 96 362 C122 378 148 300 152 214 C150 180 142 158 132 148 Z" fill="#FF5C9A" />
        <path d="M268 148 C332 176 348 280 304 362 C278 378 252 300 248 214 C250 180 258 158 268 148 Z" fill="#FF5C9A" />
        <path d="M118 200 C96 230 100 300 124 330" fill="none" stroke="#FFD0E4" strokeWidth="8" strokeLinecap="round" opacity="0.45" />
        <path d="M282 200 C304 230 300 300 276 330" fill="none" stroke="#FFD0E4" strokeWidth="8" strokeLinecap="round" opacity="0.45" />
      </g>
    ),
    front: (
      <g>
        <path d="M138 118 C162 92 238 92 262 118 C246 140 154 140 138 118 Z" fill="#FF5C9A" />
        <path d="M136 128 C118 160 122 206 146 214 C152 176 154 148 136 128 Z" fill="#E23078" />
        <path d="M264 128 C282 160 278 206 254 214 C248 176 246 148 264 128 Z" fill="#E23078" />
        <ellipse cx="168" cy="112" rx="22" ry="10" fill="#fff" opacity="0.22" />
        <Bow x={112} y={208} />
        <Bow x={288} y={208} />
      </g>
    ),
  },
  {
    id: 'hair-bob',
    slot: 'hair',
    category: 'hair',
    codes: ['school'],
    name: '단정 단발',
    back: (
      <g>
        <ellipse cx="200" cy="176" rx="104" ry="112" fill="#C2185B" />
        <ellipse cx="200" cy="168" rx="90" ry="96" fill="#E23B78" />
      </g>
    ),
    front: (
      <g>
        <path d="M132 124 C158 96 242 96 268 124 C250 146 150 146 132 124 Z" fill="#C2185B" />
        <path d="M128 132 C112 168 118 214 150 228 C156 186 156 150 128 132 Z" fill="#9C1248" />
        <path d="M272 132 C288 168 282 214 250 228 C244 186 244 150 272 132 Z" fill="#9C1248" />
        <ellipse cx="176" cy="114" rx="26" ry="9" fill="#fff" opacity="0.16" />
        <Bow x={248} y={118} fill="#F2C14E" knot="#FFF6D4" scale={0.72} />
      </g>
    ),
  },
  {
    id: 'hair-wave',
    slot: 'hair',
    category: 'hair',
    codes: ['party'],
    name: '긴 분홍 머리',
    back: (
      <g>
        <path d="M118 140 C40 190 28 320 70 430 C110 470 150 390 156 250 C150 190 140 150 118 140 Z" fill="#FF4E93" />
        <path d="M282 140 C360 190 372 320 330 430 C290 470 250 390 244 250 C250 190 260 150 282 140 Z" fill="#FF4E93" />
        <path d="M150 120 C120 150 130 210 156 230 C170 180 176 140 150 120 Z" fill="#FF9BC4" />
        <path d="M250 120 C280 150 270 210 244 230 C230 180 224 140 250 120 Z" fill="#FF9BC4" />
        <path d="M90 240 C70 300 86 380 120 410" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" opacity="0.28" />
      </g>
    ),
    front: (
      <g>
        <path d="M140 116 C166 90 234 90 260 116 C242 138 158 138 140 116 Z" fill="#FF4E93" />
        <path d="M134 126 C116 158 124 198 152 206 C156 168 158 142 134 126 Z" fill="#E23078" />
        <path d="M266 126 C284 158 276 198 248 206 C244 168 242 142 266 126 Z" fill="#E23078" />
        <ellipse cx="186" cy="108" rx="24" ry="8" fill="#fff" opacity="0.35" />
      </g>
    ),
  },
  {
    id: 'hair-updo',
    slot: 'hair',
    category: 'hair',
    codes: ['party'],
    name: '파티 업스타일',
    back: (
      <g>
        <ellipse cx="200" cy="150" rx="86" ry="84" fill="#FF7AAF" />
      </g>
    ),
    front: (
      <g>
        <ellipse cx="200" cy="78" rx="34" ry="28" fill="#FF7AAF" />
        <ellipse cx="168" cy="96" rx="22" ry="16" fill="#FFC0DC" />
        <ellipse cx="232" cy="96" rx="22" ry="16" fill="#E24B88" />
        <path d="M142 124 C168 104 232 104 258 124 C240 142 160 142 142 124 Z" fill="#FF7AAF" />
        <path d="M136 130 C154 168 158 176 150 196" fill="none" stroke="#E24B88" strokeWidth="10" strokeLinecap="round" />
        <path d="M264 130 C246 168 242 176 250 196" fill="none" stroke="#E24B88" strokeWidth="10" strokeLinecap="round" />
        <ellipse cx="188" cy="70" rx="12" ry="6" fill="#fff" opacity="0.4" />
        <circle cx="214" cy="64" r="4" fill="#F7E7A1" />
        <circle cx="186" cy="86" r="3" fill="#fff6d2" />
      </g>
    ),
  },
  {
    id: 'hair-pony',
    slot: 'hair',
    category: 'hair',
    codes: ['outing'],
    name: '높은 포니',
    back: (
      <g>
        <path d="M230 96 C280 80 318 150 300 240 C286 310 250 300 246 210 C260 150 250 110 230 96 Z" fill="#FF6FA8" />
        <ellipse cx="286" cy="118" rx="28" ry="22" fill="#FFA4CC" />
      </g>
    ),
    front: (
      <g>
        <path d="M132 122 C160 96 250 92 270 120 C246 146 150 148 132 122 Z" fill="#FF6FA8" />
        <path d="M128 130 C112 164 120 208 150 216 C154 176 156 148 128 130 Z" fill="#E24B88" />
        <ellipse cx="248" cy="92" rx="22" ry="16" fill="#FFA4CC" />
        <Bow x={248} y={96} fill="#7ED0C0" knot="#FFF4C4" scale={0.8} />
        <ellipse cx="170" cy="112" rx="20" ry="8" fill="#fff" opacity="0.28" />
      </g>
    ),
  },
  {
    id: 'hair-side',
    slot: 'hair',
    category: 'hair',
    codes: ['outing'],
    name: '옆머리 묶음',
    back: (
      <g>
        <ellipse cx="200" cy="162" rx="92" ry="96" fill="#FF7A9C" />
        <path d="M112 176 C70 210 74 300 112 332 C132 300 140 230 128 190 Z" fill="#E85A84" />
      </g>
    ),
    front: (
      <g>
        <path d="M136 120 C170 98 246 108 266 132 C236 150 156 146 136 120 Z" fill="#FF7A9C" />
        <ellipse cx="108" cy="188" rx="26" ry="22" fill="#FFA8C0" />
        <Bow x={108} y={188} fill="#FF4E93" knot="#FFE7A8" scale={0.85} />
        <path d="M250 140 C276 170 270 210 246 214" fill="none" stroke="#E23078" strokeWidth="12" strokeLinecap="round" />
      </g>
    ),
  },
  {
    id: 'top-blouse',
    slot: 'top',
    category: 'top',
    codes: ['school'],
    name: '하얀 블라우스',
    mid: (
      <g>
        <ellipse cx="126" cy="286" rx="36" ry="28" fill="#FFFcf8" stroke="#E6D5CC" />
        <ellipse cx="274" cy="286" rx="36" ry="28" fill="#FFFcf8" stroke="#E6D5CC" />
        <path d="M158 234 C150 286 156 338 172 360 L228 360 C244 338 250 286 242 234 C218 220 182 220 158 234 Z" fill="#FFFcf8" stroke="#E6D5CC" />
        <path d="M176 238 L200 274 L224 238" fill="#fff" stroke="#D9C3BA" strokeWidth="3" />
        <path d="M168 300 H232" stroke="#F3E4DC" strokeWidth="3" />
        <circle cx="200" cy="248" r="3" fill="#E7B9AE" />
      </g>
    ),
  },
  {
    id: 'top-cardigan',
    slot: 'top',
    category: 'top',
    codes: ['outing'],
    name: '살구 가디건',
    mid: (
      <g>
        <path d="M166 246 C160 300 166 340 178 356 L222 356 C234 340 240 300 234 246 C214 236 186 236 166 246 Z" fill="#FFF6EA" />
        <path d="M188 268 L200 286 L212 268 L206 300 H194 Z" fill="#F0C14D" />
        <path d="M150 242 C112 262 104 330 126 368 C142 352 150 310 162 292 L168 248 Z" fill="#F2B48A" stroke="#E09A70" />
        <path d="M250 242 C288 262 296 330 274 368 C258 352 250 310 238 292 L232 248 Z" fill="#F2B48A" stroke="#E09A70" />
        <path d="M156 248 C168 270 176 340 170 358" fill="none" stroke="#FFE0C2" strokeWidth="6" strokeLinecap="round" />
        <path d="M244 248 C232 270 224 340 230 358" fill="none" stroke="#FFE0C2" strokeWidth="6" strokeLinecap="round" />
        <circle cx="176" cy="300" r="3" fill="#fff" />
        <circle cx="176" cy="322" r="3" fill="#fff" />
        <circle cx="224" cy="300" r="3" fill="#fff" />
        <circle cx="224" cy="322" r="3" fill="#fff" />
      </g>
    ),
  },
  {
    id: 'top-tee',
    slot: 'top',
    category: 'top',
    codes: ['outing'],
    name: '민트 티셔츠',
    mid: (
      <g>
        <path d="M112 268 C130 250 156 246 168 258 L162 300 C140 292 122 286 112 268 Z" fill="#7ED0C0" />
        <path d="M288 268 C270 250 244 246 232 258 L238 300 C260 292 278 286 288 268 Z" fill="#7ED0C0" />
        <path d="M160 240 C154 292 160 342 176 360 L224 360 C240 342 246 292 240 240 C218 228 182 228 160 240 Z" fill="#8FDDCD" stroke="#6FC4B4" />
        <path d="M176 242 Q200 268 224 242" fill="#D8FFF4" />
        <circle cx="200" cy="300" r="10" fill="#fff" opacity="0.9" />
        <path d="M200 292 L203 298 H210 L205 302 L207 309 L200 305 L193 309 L195 302 L190 298 H197 Z" fill="#F2C14E" />
      </g>
    ),
  },
  {
    id: 'bottom-pleat',
    slot: 'bottom',
    category: 'bottom',
    codes: ['school'],
    name: '남색 플리츠',
    mid: (
      <g>
        <path d="M148 332 L112 446 L288 446 L252 332 Q200 350 148 332 Z" fill="#2C3E72" />
        <path d="M156 338 L128 446 H148 L176 338 Z" fill="#3E5594" />
        <path d="M188 336 L176 446 H198 L210 336 Z" fill="#3E5594" />
        <path d="M224 336 L214 446 H236 L252 338 Z" fill="#3E5594" />
        <path d="M148 332 Q200 352 252 332" fill="none" stroke="#1E2C55" strokeWidth="4" />
        <path d="M120 434 H280" stroke="#F2C14E" strokeWidth="4" />
      </g>
    ),
  },
  {
    id: 'bottom-shorts',
    slot: 'bottom',
    category: 'bottom',
    codes: ['outing'],
    name: '크림 반바지',
    mid: (
      <g>
        <path d="M160 334 C150 360 152 402 168 412 L196 406 L198 338 Z" fill="#F6E2C4" stroke="#E4CBA6" />
        <path d="M202 338 L204 406 L232 412 C248 402 250 360 240 334 Z" fill="#F6E2C4" stroke="#E4CBA6" />
        <path d="M168 348 H232" stroke="#E7C89A" strokeWidth="3" />
        <path d="M196 360 V400" stroke="#E7C89A" strokeWidth="2" />
        <circle cx="186" cy="352" r="2.4" fill="#C9844A" />
        <circle cx="214" cy="352" r="2.4" fill="#C9844A" />
      </g>
    ),
  },
  {
    id: 'bottom-jeans',
    slot: 'bottom',
    category: 'bottom',
    codes: ['outing'],
    name: '연청 바지',
    mid: (
      <g>
        <path d="M164 332 C156 390 154 440 166 468 L196 468 L198 338 Z" fill="#8EB4D6" stroke="#6E97BA" />
        <path d="M202 338 L204 468 L234 468 C246 440 244 390 236 332 Z" fill="#8EB4D6" stroke="#6E97BA" />
        <path d="M176 350 H196" stroke="#F4FBFF" strokeWidth="3" opacity="0.7" />
        <path d="M206 350 H226" stroke="#F4FBFF" strokeWidth="3" opacity="0.7" />
        <path d="M170 400 H194" stroke="#D7E9F6" strokeWidth="4" />
        <path d="M206 420 H232" stroke="#D7E9F6" strokeWidth="4" />
        <path d="M188 334 H212 L206 348 H194 Z" fill="#F4D27A" />
      </g>
    ),
  },
  {
    id: 'dress-pink',
    slot: 'dress',
    category: 'dress',
    codes: ['party'],
    name: '분홍 파티 드레스',
    mid: (
      <g>
        <path d="M120 286 C146 250 164 240 176 252 L168 292 Z" fill="#FF8FB8" />
        <path d="M280 286 C254 250 236 240 224 252 L232 292 Z" fill="#FF8FB8" />
        <path d="M160 236 C154 280 160 312 176 324 L224 324 C240 312 246 280 240 236 C216 222 184 222 160 236 Z" fill="#FF9EC4" stroke="#F27AAA" />
        <path d="M148 312 C110 360 86 410 104 446 L296 446 C314 410 290 360 252 312 Q200 334 148 312 Z" fill="#FF8FB8" />
        <path d="M108 430 Q200 456 292 430 L296 446 Q200 468 104 446 Z" fill="#FFF6FB" />
        <path d="M168 330 Q200 390 232 330" fill="none" stroke="#fff" strokeWidth="3" opacity="0.45" />
        <Bow x={200} y={318} fill="#FFF6FB" knot="#F2C14E" scale={0.9} />
        <circle cx="148" cy="400" r="3" fill="#fff" opacity="0.7" />
        <circle cx="250" cy="430" r="2.5" fill="#fff" opacity="0.8" />
        <circle cx="180" cy="450" r="2" fill="#fff" opacity="0.7" />
      </g>
    ),
  },
  {
    id: 'dress-mint',
    slot: 'dress',
    category: 'dress',
    codes: ['party'],
    name: '민트 플레어',
    mid: (
      <g>
        <path d="M158 238 C152 286 160 318 176 328 L224 328 C240 318 248 286 242 238 C216 224 184 224 158 238 Z" fill="#BFEEDD" stroke="#8ED9C4" />
        <path d="M176 236 Q200 270 224 236" fill="#fff" opacity="0.85" />
        <path d="M154 320 L128 448 H272 L246 320 Q200 340 154 320 Z" fill="#A9E6D2" />
        <path d="M136 418 H264" stroke="#fff" strokeWidth="8" opacity="0.55" />
        <path d="M146 436 H254" stroke="#F2C14E" strokeWidth="3" />
        <circle cx="200" cy="300" r="5" fill="#F2C14E" />
      </g>
    ),
  },
  {
    id: 'dress-lavender',
    slot: 'dress',
    category: 'dress',
    codes: ['party'],
    name: '라벤더 리본 드레스',
    mid: (
      <g>
        <path d="M160 236 C154 284 162 320 178 332 L222 332 C238 320 246 284 240 236 C216 222 184 222 160 236 Z" fill="#C9B6F4" stroke="#B09AE6" />
        <path d="M150 324 C118 370 108 420 120 448 L280 448 C292 420 282 370 250 324 Q200 344 150 324 Z" fill="#BBA4EE" />
        <path d="M156 360 H244" stroke="#F7E7A1" strokeWidth="8" strokeLinecap="round" />
        <Bow x={200} y={360} fill="#F7E7A1" knot="#FFF" scale={0.8} />
        <path d="M132 432 Q200 446 268 432" fill="none" stroke="#fff" strokeWidth="4" opacity="0.5" />
      </g>
    ),
  },
  {
    id: 'shoes-loafer',
    slot: 'shoes',
    category: 'shoes',
    codes: ['school'],
    name: '갈색 로퍼',
    mid: (
      <g>
        <path d="M166 418 H198 C202 418 204 448 198 456 H168 C160 448 162 422 166 418 Z" fill="#fff" />
        <path d="M204 418 H236 C242 424 240 448 232 456 H204 C198 448 200 422 204 418 Z" fill="#fff" />
        <ellipse cx="182" cy="478" rx="26" ry="14" fill="#6B4423" stroke={ink} />
        <ellipse cx="220" cy="478" rx="26" ry="14" fill="#6B4423" stroke={ink} />
        <path d="M164 470 H200" stroke="#F2C14E" strokeWidth="3" />
        <path d="M202 470 H238" stroke="#F2C14E" strokeWidth="3" />
        <ellipse cx="182" cy="474" rx="12" ry="5" fill="#8A5A32" />
        <ellipse cx="220" cy="474" rx="12" ry="5" fill="#8A5A32" />
      </g>
    ),
  },
  {
    id: 'shoes-mary',
    slot: 'shoes',
    category: 'shoes',
    codes: ['party'],
    name: '스트랩 구두',
    mid: (
      <g>
        <path d="M164 448 H200 L196 464 H160 Z" fill="#F7C1D4" />
        <path d="M202 448 H238 L242 464 H206 Z" fill="#F7C1D4" />
        <ellipse cx="182" cy="480" rx="26" ry="13" fill="#F4A0BE" stroke="#E57AA0" />
        <ellipse cx="220" cy="480" rx="26" ry="13" fill="#F4A0BE" stroke="#E57AA0" />
        <path d="M166 462 H198" stroke="#FFF6FB" strokeWidth="3" />
        <path d="M204 462 H236" stroke="#FFF6FB" strokeWidth="3" />
        <circle cx="182" cy="458" r="3" fill="#F2C14E" />
        <circle cx="220" cy="458" r="3" fill="#F2C14E" />
      </g>
    ),
  },
  {
    id: 'shoes-sneaker',
    slot: 'shoes',
    category: 'shoes',
    codes: ['outing'],
    name: '운동화',
    mid: (
      <g>
        <path d="M166 430 H198 V458 H168 Z" fill="#fff" />
        <path d="M204 430 H236 V458 H206 Z" fill="#fff" />
        <path d="M158 468 H206 L200 490 H154 Z" fill="#7ED0C0" stroke="#5BB5A6" />
        <path d="M196 468 H246 L248 490 H202 Z" fill="#7ED0C0" stroke="#5BB5A6" />
        <path d="M160 480 H204" stroke="#fff" strokeWidth="3" />
        <path d="M200 480 H244" stroke="#fff" strokeWidth="3" />
        <path d="M170 458 L182 446 L194 458" fill="none" stroke="#F28B6A" strokeWidth="3" />
        <path d="M208 458 L220 446 L232 458" fill="none" stroke="#F28B6A" strokeWidth="3" />
      </g>
    ),
  },
  {
    id: 'shoes-boots',
    slot: 'shoes',
    category: 'shoes',
    codes: ['outing'],
    name: '숏부츠',
    mid: (
      <g>
        <path d="M162 420 H200 L196 468 H158 Z" fill="#5C463C" />
        <path d="M202 420 H240 L244 468 H206 Z" fill="#5C463C" />
        <ellipse cx="180" cy="482" rx="28" ry="14" fill="#3E2E2A" />
        <ellipse cx="222" cy="482" rx="28" ry="14" fill="#3E2E2A" />
        <path d="M166 436 H196" stroke="#E7C39A" strokeWidth="3" />
        <path d="M206 436 H236" stroke="#E7C39A" strokeWidth="3" />
      </g>
    ),
  },
  {
    id: 'neck-ribbon',
    slot: 'neck',
    category: 'extra',
    codes: ['school'],
    name: '교복 리본',
    mid: <Bow x={200} y={246} fill="#E23B4A" knot="#FFF1C9" scale={1.05} />,
  },
  {
    id: 'bag-school',
    slot: 'bag',
    category: 'extra',
    codes: ['school'],
    name: '책가방',
    mid: (
      <g>
        <path d="M292 300 H336 V360 H292 Z" fill="#F4C56B" stroke="#D9A44A" strokeWidth="2" rx="8" />
        <rect x="292" y="300" width="44" height="60" rx="8" fill="#F4C56B" stroke="#D9A44A" />
        <path d="M300 300 V286 H328 V300" fill="none" stroke="#D9A44A" strokeWidth="3" />
        <rect x="304" y="318" width="20" height="14" rx="3" fill="#FFF6D8" />
        <path d="M248 292 C270 300 290 310 300 324" fill="none" stroke="#C9844A" strokeWidth="4" />
      </g>
    ),
  },
  {
    id: 'hat-tiara',
    slot: 'hat',
    category: 'extra',
    codes: ['party'],
    name: '작은 티아라',
    mid: (
      <g>
        <path d="M150 96 L168 70 L186 98 L200 62 L214 98 L232 70 L250 96" fill="none" stroke="#F7E7A1" strokeWidth="4" strokeLinejoin="round" />
        <circle cx="200" cy="62" r="4" fill="#fff" />
        <circle cx="168" cy="74" r="3" fill="#fff" />
        <circle cx="232" cy="74" r="3" fill="#fff" />
      </g>
    ),
  },
  {
    id: 'neck-pearl',
    slot: 'neck',
    category: 'extra',
    codes: ['party'],
    name: '진주 목걸이',
    mid: (
      <g>
        {[-28, -14, 0, 14, 28].map((dx) => (
          <circle key={dx} cx={200 + dx} cy={236 + Math.abs(dx) * 0.15} r="4.2" fill="#FFF8EE" stroke="#E6D3C4" />
        ))}
        <circle cx="200" cy="248" r="6" fill="#F7E7A1" stroke="#E6C56A" />
      </g>
    ),
  },
  {
    id: 'wings',
    slot: 'wings',
    category: 'extra',
    codes: ['party'],
    name: '반짝 날개',
    mid: (
      <g opacity="0.95">
        <ellipse cx="78" cy="268" rx="52" ry="74" fill="#FFF6FB" stroke="#F3C6DA" transform="rotate(-18 78 268)" />
        <ellipse cx="96" cy="286" rx="28" ry="46" fill="#FFE3F0" transform="rotate(-18 96 286)" />
        <ellipse cx="322" cy="268" rx="52" ry="74" fill="#FFF6FB" stroke="#F3C6DA" transform="rotate(18 322 268)" />
        <ellipse cx="304" cy="286" rx="28" ry="46" fill="#FFE3F0" transform="rotate(18 304 286)" />
        <circle cx="70" cy="230" r="3" fill="#fff" />
        <circle cx="336" cy="246" r="2.4" fill="#fff" />
        <circle cx="54" cy="300" r="2" fill="#F7E7A1" />
      </g>
    ),
  },
  {
    id: 'hat-beret',
    slot: 'hat',
    category: 'extra',
    codes: ['outing'],
    name: '베레모',
    mid: (
      <g>
        <ellipse cx="206" cy="92" rx="62" ry="22" fill="#F28B6A" />
        <ellipse cx="198" cy="78" rx="40" ry="24" fill="#E56B55" />
        <circle cx="236" cy="84" r="5" fill="#7ED0C0" />
      </g>
    ),
  },
  {
    id: 'glasses',
    slot: 'glasses',
    category: 'extra',
    codes: ['outing'],
    name: '동그란 안경',
    mid: (
      <g fill="none" stroke="#5C463C" strokeWidth="3">
        <circle cx="170" cy="156" r="18" fill="rgba(255,255,255,0.18)" />
        <circle cx="230" cy="156" r="18" fill="rgba(255,255,255,0.18)" />
        <path d="M188 156 H212" />
        <path d="M152 152 L138 146" />
        <path d="M248 152 L262 146" />
      </g>
    ),
  },
  {
    id: 'bag-cross',
    slot: 'bag',
    category: 'extra',
    codes: ['outing'],
    name: '크로스백',
    mid: (
      <g>
        <path d="M156 240 C210 300 250 320 292 360" fill="none" stroke="#C9844A" strokeWidth="4" />
        <rect x="262" y="334" width="46" height="36" rx="10" fill="#F28B6A" stroke="#D96B4E" />
        <circle cx="285" cy="352" r="4" fill="#F7E7A1" />
      </g>
    ),
  },
  {
    id: 'hat-flower',
    slot: 'hat',
    category: 'extra',
    codes: ['school', 'party'],
    name: '꽃 머리핀',
    mid: (
      <g transform="translate(246 104)">
        <circle cx="-8" cy="0" r="6" fill="#F28BAA" />
        <circle cx="8" cy="0" r="6" fill="#F28BAA" />
        <circle cx="0" cy="-8" r="6" fill="#F28BAA" />
        <circle cx="0" cy="8" r="6" fill="#F28BAA" />
        <circle r="4" fill="#F7E7A1" />
      </g>
    ),
  },
]

export const ITEM_MAP = Object.fromEntries(ITEMS.map((item) => [item.id, item]))

export const CATEGORIES = [
  { id: 'hair', label: '헤어' },
  { id: 'top', label: '상의' },
  { id: 'bottom', label: '하의' },
  { id: 'dress', label: '원피스' },
  { id: 'shoes', label: '신발' },
  { id: 'extra', label: '소품' },
]

export const DRESS_CODES = [
  {
    id: 'school',
    label: '교실',
    hint: '블라우스, 플리츠, 로퍼',
    required: ['hair', 'top', 'bottom', 'shoes'],
  },
  {
    id: 'party',
    label: '파티',
    hint: '드레스, 구두, 티아라',
    required: ['hair', 'dress', 'shoes'],
  },
  {
    id: 'outing',
    label: '나들이',
    hint: '상의, 하의, 신발',
    required: ['hair', 'top', 'bottom', 'shoes'],
  },
]

export const PRESETS = {
  school: {
    hair: 'hair-twin',
    top: 'top-blouse',
    bottom: 'bottom-pleat',
    shoes: 'shoes-loafer',
    neck: 'neck-ribbon',
    bag: 'bag-school',
  },
  party: {
    hair: 'hair-wave',
    dress: 'dress-pink',
    shoes: 'shoes-mary',
    hat: 'hat-tiara',
    neck: 'neck-pearl',
    wings: 'wings',
  },
  outing: {
    hair: 'hair-pony',
    top: 'top-cardigan',
    bottom: 'bottom-shorts',
    shoes: 'shoes-sneaker',
    hat: 'hat-beret',
    glasses: 'glasses',
    bag: 'bag-cross',
  },
}

const BACK_LAYERS = [
  ['wings', 'mid'],
  ['hair', 'back'],
]

const FRONT_LAYERS = [
  ['bottom', 'mid'],
  ['top', 'mid'],
  ['shoes', 'mid'],
  ['dress', 'mid'],
  ['neck', 'mid'],
  ['bag', 'mid'],
  ['hair', 'front'],
  ['hat', 'mid'],
  ['glasses', 'mid'],
]

function LayerStack({ equipped, order }) {
  return order.map(([slot, layer]) => {
    const item = ITEM_MAP[equipped[slot]]
    const node = item?.[layer]
    if (!node) return null
    return <g key={`${item.id}-${layer}`}>{node}</g>
  })
}

export function WornLayers({ equipped }) {
  return (
    <>
      <LayerStack equipped={equipped} order={BACK_LAYERS} />
      <LayerStack equipped={equipped} order={FRONT_LAYERS} />
    </>
  )
}

/** 몸보다 뒤에 깔리는 레이어와, 몸 위에 붙는 레이어를 나눕니다. */
export function SplitLayers({ equipped, part }) {
  return <LayerStack equipped={equipped} order={part === 'back' ? BACK_LAYERS : FRONT_LAYERS} />
}
