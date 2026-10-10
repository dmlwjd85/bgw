/** 슬롯은 한 장만 붙습니다. 원피스를 붙이면 상의·하의는 떼고, 그 반대도 같습니다. */

function Bow({ x, y, fill = '#E23B70', knot = '#FFE7A8', scale = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <ellipse cx="-13" cy="0" rx="13" ry="8" fill={fill} />
      <ellipse cx="13" cy="0" rx="13" ry="8" fill={fill} />
      <ellipse cx="-13" cy="-2" rx="7" ry="3" fill="#fff" opacity="0.28" />
      <ellipse cx="13" cy="-2" rx="7" ry="3" fill="#fff" opacity="0.28" />
      <circle r="5" fill={knot} />
      <path d="M-5 4 L-9 15 L-1 9 Z" fill={fill} />
      <path d="M5 4 L9 15 L1 9 Z" fill={fill} />
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
        <path d="M134 160 C96 190 88 280 112 380 C128 400 150 330 154 220 C150 186 144 168 134 160 Z" fill="#FF5C9A" />
        <path d="M266 160 C304 190 312 280 288 380 C272 400 250 330 246 220 C250 186 256 168 266 160 Z" fill="#FF5C9A" />
        <path d="M108 220 C92 270 100 340 124 370" fill="none" stroke="#FFD0E6" strokeWidth="7" strokeLinecap="round" opacity="0.55" />
        <path d="M292 220 C308 270 300 340 276 370" fill="none" stroke="#FFD0E6" strokeWidth="7" strokeLinecap="round" opacity="0.55" />
      </g>
    ),
    front: (
      <g>
        <path d="M132 150 C118 100 160 68 200 70 C246 72 286 108 270 150 C244 118 160 114 142 148 Z" fill="#FF5C9A" />
        <path d="M134 128 C116 164 120 210 146 222 C154 176 156 146 134 128 Z" fill="#E23078" />
        <path d="M266 128 C284 164 280 210 254 222 C246 176 244 146 266 128 Z" fill="#E23078" />
        <path d="M160 86 C180 76 198 80 214 94" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity="0.55" />
        <Bow x={118} y={214} scale={0.9} />
        <Bow x={282} y={214} scale={0.9} />
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
        <path d="M118 150 C96 120 108 90 150 78 C200 64 292 86 286 150 C300 210 286 280 250 300 C210 318 150 300 128 250 C108 210 108 170 118 150 Z" fill="#D4256C" />
        <path d="M140 168 C150 250 168 292 200 300 C232 292 250 250 260 168" fill="none" stroke="#FF8FBE" strokeWidth="8" strokeLinecap="round" opacity="0.35" />
      </g>
    ),
    front: (
      <g>
        <path d="M136 146 C124 96 164 70 200 72 C244 74 280 104 266 146 C240 118 162 116 144 146 Z" fill="#E23B78" />
        <path d="M130 132 C116 170 124 220 154 236 C160 186 158 150 130 132 Z" fill="#B81E5C" />
        <path d="M270 132 C284 170 276 220 246 236 C240 186 242 150 270 132 Z" fill="#B81E5C" />
        <path d="M162 90 C184 80 206 86 220 100" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity="0.4" />
        <Bow x={246} y={112} fill="#F2C14E" knot="#FFF6D4" scale={0.7} />
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
        <path d="M146 168 C108 200 96 300 118 450 C140 490 168 430 172 260 C168 210 160 180 146 168 Z" fill="#FF4D8D" />
        <path d="M254 168 C292 200 304 300 282 450 C260 490 232 430 228 260 C232 210 240 180 254 168 Z" fill="#FF4D8D" />
        <path d="M128 250 C118 320 126 390 146 440" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" opacity="0.4" />
        <path d="M158 210 C150 280 156 360 168 430" fill="none" stroke="#E02270" strokeWidth="8" strokeLinecap="round" opacity="0.28" />
      </g>
    ),
    front: (
      <g>
        <path d="M130 156 C116 98 158 64 200 66 C256 68 290 108 274 154 C246 116 162 112 140 152 Z" fill="#FF4D8D" />
        <path d="M128 134 C104 176 110 240 140 274 C156 226 160 168 144 134 Z" fill="#E02270" />
        <path d="M272 130 C294 168 286 214 260 226 C252 180 256 148 272 130 Z" fill="#E02270" />
        <path d="M198 60 C188 40 216 36 210 58" fill="none" stroke="#FF4D8D" strokeWidth="7" strokeLinecap="round" />
        <path d="M160 88 C180 76 204 82 218 96" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" opacity="0.65" />
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
        <path d="M140 150 C124 110 160 86 200 88 C246 90 280 116 264 156 C250 140 156 138 140 150 Z" fill="#FF7AAF" />
      </g>
    ),
    front: (
      <g>
        <ellipse cx="200" cy="74" rx="32" ry="24" fill="#FF7AAF" />
        <ellipse cx="172" cy="92" rx="20" ry="14" fill="#FFC4DE" />
        <ellipse cx="230" cy="90" rx="20" ry="14" fill="#E24B88" />
        <path d="M138 140 C160 112 244 112 264 140 C240 128 162 128 138 140 Z" fill="#FF7AAF" />
        <path d="M136 132 C152 168 156 180 148 196" fill="none" stroke="#E24B88" strokeWidth="9" strokeLinecap="round" />
        <path d="M264 132 C248 168 244 180 252 196" fill="none" stroke="#E24B88" strokeWidth="9" strokeLinecap="round" />
        <ellipse cx="188" cy="66" rx="12" ry="6" fill="#fff" opacity="0.45" />
        <circle cx="214" cy="58" r="3.5" fill="#F7E7A1" />
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
        <path d="M228 92 C286 78 324 140 308 230 C294 310 256 300 248 200 C258 140 248 108 228 92 Z" fill="#FF6FA8" />
        <ellipse cx="286" cy="112" rx="26" ry="20" fill="#FFA4CC" />
        <path d="M270 120 C292 160 286 240 268 280" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" opacity="0.4" />
      </g>
    ),
    front: (
      <g>
        <path d="M134 148 C122 102 168 72 214 78 C250 84 278 112 268 146 C240 118 160 116 142 146 Z" fill="#FF6FA8" />
        <path d="M130 130 C112 166 118 214 148 224 C156 180 158 148 130 130 Z" fill="#E24B88" />
        <ellipse cx="248" cy="86" rx="20" ry="14" fill="#FFA4CC" />
        <Bow x={248} y={90} fill="#7ED0C0" knot="#FFF4C4" scale={0.75} />
        <path d="M164 96 C184 86 206 92 218 104" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity="0.5" />
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
        <path d="M132 156 C110 110 160 78 210 84 C260 90 286 124 270 160 C250 140 156 138 132 156 Z" fill="#FF7A9C" />
        <path d="M112 176 C72 210 74 300 114 336 C134 300 142 230 128 188 Z" fill="#E85A84" />
      </g>
    ),
    front: (
      <g>
        <path d="M136 142 C158 104 230 100 268 132 C236 118 160 120 140 146 Z" fill="#FF7A9C" />
        <ellipse cx="108" cy="188" rx="24" ry="20" fill="#FFA8C0" />
        <Bow x={108} y={188} fill="#FF4E93" knot="#FFE7A8" scale={0.82} />
        <path d="M250 138 C274 168 268 210 246 216" fill="none" stroke="#E23078" strokeWidth="11" strokeLinecap="round" />
        <path d="M168 108 C190 98 214 104 226 118" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity="0.45" />
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
        <path d="M150 248 C132 262 118 292 124 324 C136 316 146 292 156 276 L164 248 Z" fill="#FFFCF8" stroke="#E7D5CC" />
        <path d="M250 248 C268 262 282 292 276 324 C264 316 254 292 244 276 L236 248 Z" fill="#FFFCF8" stroke="#E7D5CC" />
        <path d="M166 228 C158 276 166 322 178 342 L222 342 C234 322 242 276 234 228 C216 214 184 214 166 228 Z" fill="#FFFCF8" stroke="#E4D2C8" />
        <path d="M178 232 L200 268 L222 232" fill="#fff" stroke="#E7C8BE" strokeWidth="2" />
        <path d="M186 300 H214" stroke="#F3E0D8" strokeWidth="3" />
        <circle cx="200" cy="248" r="2.4" fill="#E7B0A4" />
        <path d="M176 250 C190 270 210 270 224 250" fill="none" stroke="#fff" strokeWidth="4" opacity="0.7" />
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
        <path d="M172 242 C166 286 172 322 182 338 L218 338 C228 322 234 286 228 242 C214 232 186 232 172 242 Z" fill="#FFF4E8" />
        <path d="M190 262 L200 278 L210 262 L205 300 H195 Z" fill="#F0C14D" />
        <path d="M158 236 C124 256 112 310 128 348 C142 332 150 300 160 284 L168 242 Z" fill="#F2B48A" stroke="#E09A70" />
        <path d="M242 236 C276 256 288 310 272 348 C258 332 250 300 240 284 L232 242 Z" fill="#F2B48A" stroke="#E09A70" />
        <path d="M164 250 C172 280 176 320 170 346" fill="none" stroke="#FFE4C8" strokeWidth="5" strokeLinecap="round" />
        <path d="M236 250 C228 280 224 320 230 346" fill="none" stroke="#FFE4C8" strokeWidth="5" strokeLinecap="round" />
        <circle cx="178" cy="292" r="2.6" fill="#fff" />
        <circle cx="178" cy="312" r="2.6" fill="#fff" />
        <circle cx="222" cy="292" r="2.6" fill="#fff" />
        <circle cx="222" cy="312" r="2.6" fill="#fff" />
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
        <path d="M148 258 C132 246 158 236 170 248 L164 286 Z" fill="#7ED0C0" />
        <path d="M252 258 C268 246 242 236 230 248 L236 286 Z" fill="#7ED0C0" />
        <path d="M166 232 C160 280 166 324 178 342 L222 342 C234 324 240 280 234 232 C216 220 184 220 166 232 Z" fill="#8FDDCD" stroke="#6FC4B4" />
        <path d="M180 236 Q200 262 220 236" fill="#E9FFF8" />
        <circle cx="200" cy="292" r="11" fill="#fff" />
        <path d="M200 284 L203 290 H210 L204 294 L206 301 L200 297 L194 301 L196 294 L190 290 H197 Z" fill="#F2C14E" />
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
        <path d="M158 328 L124 456 H276 L242 328 Q200 346 158 328 Z" fill="#2C3E72" />
        <path d="M166 334 L140 456 H158 L186 334 Z" fill="#3E5594" />
        <path d="M196 332 L184 456 H216 L206 332 Z" fill="#4C68AA" />
        <path d="M214 334 L228 456 H258 L244 334 Z" fill="#3E5594" />
        <path d="M158 328 Q200 348 242 328" fill="none" stroke="#1C2C58" strokeWidth="4" />
        <path d="M132 442 H268" stroke="#F2C14E" strokeWidth="4" />
        <path d="M170 360 L156 430" stroke="#fff" strokeWidth="2" opacity="0.2" />
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
        <path d="M170 330 C160 358 162 400 176 412 L198 404 L196 332 Z" fill="#F6E2C4" stroke="#E4CBA6" />
        <path d="M204 332 L202 404 L224 412 C238 400 240 358 230 330 Z" fill="#F6E2C4" stroke="#E4CBA6" />
        <path d="M176 348 H224" stroke="#E7C89A" strokeWidth="3" />
        <path d="M198 360 V398" stroke="#E7C89A" strokeWidth="2" />
        <circle cx="188" cy="350" r="2.2" fill="#C9844A" />
        <circle cx="212" cy="350" r="2.2" fill="#C9844A" />
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
        <path d="M172 328 C164 390 162 470 172 508 L196 508 L198 332 Z" fill="#8EB4D6" stroke="#6E97BA" />
        <path d="M202 332 L204 508 L228 508 C238 470 236 390 228 328 Z" fill="#8EB4D6" stroke="#6E97BA" />
        <path d="M180 360 H196" stroke="#F4FBFF" strokeWidth="3" opacity="0.75" />
        <path d="M206 378 H224" stroke="#F4FBFF" strokeWidth="3" opacity="0.75" />
        <path d="M176 430 H194" stroke="#D7E9F6" strokeWidth="4" />
        <path d="M192 330 H208 L204 344 H196 Z" fill="#F4D27A" />
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
        <path d="M146 262 C132 248 156 232 172 246 L166 292 Z" fill="#FF8FB8" />
        <path d="M254 262 C268 248 244 232 228 246 L234 292 Z" fill="#FF8FB8" />
        <path d="M168 226 C160 270 166 308 180 324 L220 324 C234 308 240 270 232 226 C214 212 186 212 168 226 Z" fill="#FF9EC4" stroke="#F27AAA" />
        <path d="M186 230 Q200 258 214 230" fill="#fff" opacity="0.85" />
        <path d="M152 312 C112 360 86 430 104 492 L296 492 C314 430 288 360 248 312 Q200 334 152 312 Z" fill="#FF7AAF" />
        <path d="M168 330 Q200 400 232 330" fill="none" stroke="#fff" strokeWidth="3" opacity="0.35" />
        <path d="M112 470 Q200 498 288 470 L296 492 Q200 514 104 492 Z" fill="#FFF6FB" />
        <path d="M120 478 Q200 492 280 478" fill="none" stroke="#F7E7A1" strokeWidth="2" opacity="0.8" />
        <Bow x={200} y={318} fill="#FFF6FB" knot="#F2C14E" scale={0.85} />
        <circle cx="200" cy="268" r="5" fill="#F7E7A1" stroke="#E6C56A" />
        <circle cx="156" cy="400" r="2.4" fill="#fff" opacity="0.75" />
        <circle cx="246" cy="440" r="2" fill="#fff" opacity="0.8" />
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
        <path d="M168 228 C160 276 168 312 180 326 L220 326 C232 312 240 276 232 228 C214 216 186 216 168 228 Z" fill="#C9F3E4" stroke="#8ED9C4" />
        <path d="M182 232 Q200 264 218 232" fill="#fff" opacity="0.9" />
        <path d="M156 318 L128 488 H272 L244 318 Q200 338 156 318 Z" fill="#A9E6D2" />
        <path d="M140 450 H260" stroke="#fff" strokeWidth="8" opacity="0.5" />
        <path d="M148 468 H252" stroke="#F2C14E" strokeWidth="3" />
        <circle cx="200" cy="292" r="4.5" fill="#F2C14E" />
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
        <path d="M168 226 C160 274 168 314 180 328 L220 328 C232 314 240 274 232 226 C214 214 186 214 168 226 Z" fill="#D4C4F8" stroke="#B09AE6" />
        <path d="M154 320 C122 372 108 440 122 490 L278 490 C292 440 278 372 246 320 Q200 342 154 320 Z" fill="#C2ADF0" />
        <path d="M160 372 H240" stroke="#F7E7A1" strokeWidth="8" strokeLinecap="round" />
        <Bow x={200} y={372} fill="#F7E7A1" knot="#fff" scale={0.78} />
        <path d="M136 468 Q200 484 264 468" fill="none" stroke="#fff" strokeWidth="4" opacity="0.55" />
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
        <path d="M168 468 H198 C202 468 204 500 198 508 H170 C162 500 164 472 168 468 Z" fill="#fff" />
        <path d="M204 468 H234 C240 474 238 500 230 508 H206 C200 500 202 472 204 468 Z" fill="#fff" />
        <ellipse cx="184" cy="522" rx="24" ry="13" fill="#6B4423" />
        <ellipse cx="218" cy="522" rx="24" ry="13" fill="#6B4423" />
        <ellipse cx="184" cy="518" rx="14" ry="5" fill="#8A5A32" />
        <ellipse cx="218" cy="518" rx="14" ry="5" fill="#8A5A32" />
        <path d="M166 514 H200" stroke="#F2C14E" strokeWidth="3" />
        <path d="M202 514 H236" stroke="#F2C14E" strokeWidth="3" />
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
        <path d="M166 496 H200 L196 512 H162 Z" fill="#F7C1D4" />
        <path d="M202 496 H236 L240 512 H206 Z" fill="#F7C1D4" />
        <ellipse cx="184" cy="524" rx="24" ry="12" fill="#F4A0BE" stroke="#E57AA0" />
        <ellipse cx="218" cy="524" rx="24" ry="12" fill="#F4A0BE" stroke="#E57AA0" />
        <path d="M168 510 H198" stroke="#FFF6FB" strokeWidth="3" />
        <path d="M204 510 H234" stroke="#FFF6FB" strokeWidth="3" />
        <circle cx="184" cy="504" r="2.6" fill="#F2C14E" />
        <circle cx="218" cy="504" r="2.6" fill="#F2C14E" />
        <ellipse cx="178" cy="520" rx="6" ry="3" fill="#fff" opacity="0.35" />
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
        <path d="M170 486 H198 V508 H172 Z" fill="#fff" />
        <path d="M204 486 H232 V508 H206 Z" fill="#fff" />
        <path d="M160 512 H204 L198 534 H156 Z" fill="#7ED0C0" stroke="#5BB5A6" />
        <path d="M198 512 H244 L246 534 H202 Z" fill="#7ED0C0" stroke="#5BB5A6" />
        <path d="M162 524 H202" stroke="#fff" strokeWidth="3" />
        <path d="M204 524 H242" stroke="#fff" strokeWidth="3" />
        <path d="M172 508 L184 496 L196 508" fill="none" stroke="#F28B6A" strokeWidth="3" />
        <path d="M208 508 L220 496 L232 508" fill="none" stroke="#F28B6A" strokeWidth="3" />
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
        <path d="M166 470 H200 L196 516 H160 Z" fill="#5C463C" />
        <path d="M202 470 H236 L242 516 H206 Z" fill="#5C463C" />
        <ellipse cx="182" cy="526" rx="26" ry="13" fill="#3E2E2A" />
        <ellipse cx="220" cy="526" rx="26" ry="13" fill="#3E2E2A" />
        <path d="M170 488 H196" stroke="#E7C39A" strokeWidth="3" />
        <path d="M206 488 H234" stroke="#E7C39A" strokeWidth="3" />
        <path d="M172 478 H194" stroke="#fff" strokeWidth="2" opacity="0.25" />
      </g>
    ),
  },
  {
    id: 'neck-ribbon',
    slot: 'neck',
    category: 'extra',
    codes: ['school'],
    name: '교복 리본',
    mid: <Bow x={200} y={236} fill="#E23B4A" knot="#FFF1C9" scale={1.02} />,
  },
  {
    id: 'bag-school',
    slot: 'bag',
    category: 'extra',
    codes: ['school'],
    name: '책가방',
    mid: (
      <g>
        <path d="M246 286 C268 300 286 314 298 330" fill="none" stroke="#C9844A" strokeWidth="4" />
        <rect x="286" y="312" width="42" height="56" rx="8" fill="#F4C56B" stroke="#D9A44A" />
        <path d="M296 312 V298 H318 V312" fill="none" stroke="#D9A44A" strokeWidth="3" />
        <rect x="296" y="328" width="22" height="14" rx="3" fill="#FFF6D8" />
        <path d="M292 324 H322" stroke="#fff" strokeWidth="2" opacity="0.35" />
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
        <path d="M156 96 L172 72 L188 98 L200 60 L212 98 L228 72 L244 96" fill="none" stroke="#F7E7A1" strokeWidth="3.4" strokeLinejoin="round" />
        <circle cx="200" cy="60" r="3.6" fill="#fff" />
        <circle cx="172" cy="74" r="2.6" fill="#fff" />
        <circle cx="228" cy="74" r="2.6" fill="#fff" />
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
        {[-26, -13, 0, 13, 26].map((dx) => (
          <circle key={dx} cx={200 + dx} cy={228 + Math.abs(dx) * 0.12} r="3.8" fill="#FFF8EE" stroke="#E6D3C4" />
        ))}
        <circle cx="200" cy="240" r="5.5" fill="#F7E7A1" stroke="#E6C56A" />
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
      <g>
        <ellipse cx="86" cy="270" rx="48" ry="70" fill="#FFF6FB" stroke="#F3C6DA" transform="rotate(-16 86 270)" />
        <ellipse cx="102" cy="286" rx="26" ry="42" fill="#FFE3F0" transform="rotate(-16 102 286)" />
        <ellipse cx="314" cy="270" rx="48" ry="70" fill="#FFF6FB" stroke="#F3C6DA" transform="rotate(16 314 270)" />
        <ellipse cx="298" cy="286" rx="26" ry="42" fill="#FFE3F0" transform="rotate(16 298 286)" />
        <circle cx="74" cy="230" r="2.6" fill="#fff" />
        <circle cx="328" cy="246" r="2.2" fill="#fff" />
        <circle cx="64" cy="300" r="2" fill="#F7E7A1" />
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
        <ellipse cx="206" cy="92" rx="58" ry="20" fill="#F28B6A" />
        <ellipse cx="198" cy="78" rx="36" ry="22" fill="#E56B55" />
        <ellipse cx="186" cy="74" rx="14" ry="6" fill="#fff" opacity="0.25" />
        <circle cx="232" cy="82" r="4.5" fill="#7ED0C0" />
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
      <g fill="none" stroke="#5C463C" strokeWidth="2.6">
        <circle cx="176" cy="146" r="16" fill="rgba(255,255,255,0.15)" />
        <circle cx="224" cy="146" r="16" fill="rgba(255,255,255,0.15)" />
        <path d="M192 146 H208" />
        <path d="M160 142 L146 136" />
        <path d="M240 142 L254 136" />
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
        <path d="M164 236 C210 290 246 320 286 356" fill="none" stroke="#C9844A" strokeWidth="3.5" />
        <rect x="258" y="338" width="44" height="34" rx="10" fill="#F28B6A" stroke="#D96B4E" />
        <circle cx="280" cy="355" r="3.5" fill="#F7E7A1" />
        <path d="M266 346 H294" stroke="#fff" strokeWidth="2" opacity="0.3" />
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
      <g transform="translate(248 104)">
        <circle cx="-7" cy="0" r="5.5" fill="#F28BAA" />
        <circle cx="7" cy="0" r="5.5" fill="#F28BAA" />
        <circle cx="0" cy="-7" r="5.5" fill="#F28BAA" />
        <circle cx="0" cy="7" r="5.5" fill="#F28BAA" />
        <circle r="3.6" fill="#F7E7A1" />
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

/** 몸보다 뒤에 깔리는 레이어와, 몸 위에 붙는 레이어를 나눕니다. */
export function SplitLayers({ equipped, part }) {
  return <LayerStack equipped={equipped} order={part === 'back' ? BACK_LAYERS : FRONT_LAYERS} />
}
