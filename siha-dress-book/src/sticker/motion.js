// 저장하면 스티커북이 움직여요: 레이어별 움직임 설정(layers.json "motion") → Web Animations API 키프레임 / 캔버스 영상 프레임.
// 모든 움직임은 poseAt(type, t) 하나에서 나와서, 화면 애니메이션과 자랑 영상이 똑같이 움직인다.
// 몸(body) 그림은 좌표·크기를 절대 바꾸지 않고, 캐릭터 전체(character) 변형으로만 같이 움직인다.

export const MOTION_TYPES = ['none', 'breathe', 'sway', 'sway-late', 'bob', 'hop', 'pulse']
export const SAVE_HOP_MS = 700
export const SHIMMER_MS = 1100
export const FEET_ORIGIN = { x: 0.5, y: 0.94 } // 캐릭터 전체는 발끝을 기준으로 숨쉰다

// 변형 기준점(조각 안 비율)
export const ORIGIN = {
  none: { x: 0.5, y: 0.5 },
  breathe: FEET_ORIGIN,
  sway: { x: 0.5, y: 0.08 },
  'sway-late': { x: 0.5, y: 0.08 },
  bob: { x: 0.5, y: 0.5 },
  hop: { x: 0.5, y: 1 },
  pulse: { x: 0.5, y: 0.5 },
}

// 한 바퀴 길이(ms)
export const PERIOD = { none: 1000, breathe: 2400, sway: 2400, 'sway-late': 2400, bob: 1200, hop: 1600, pulse: 1400 }

const ALIASES = { breath: 'breathe', breathing: 'breathe', swing: 'sway', 'sway-delayed': 'sway-late', float: 'bob', jump: 'hop', glow: 'pulse', off: 'none', false: 'none' }

export function normalizeType(v) {
  if (v == null) return null
  const k = String(v).trim().toLowerCase()
  const t = ALIASES[k] || k
  return MOTION_TYPES.includes(t) ? t : null
}

// layers.json → { character, byLayer: {layer: type} }. 모르는 값·_note 같은 키는 무시. 몸은 항상 none.
export function parseMotionConfig(layersJson) {
  const raw = (layersJson && typeof layersJson.motion === 'object' && layersJson.motion) || {}
  const byLayer = {}
  for (const [layer, v] of Object.entries(raw)) {
    if (layer.startsWith('_') || layer === 'character') continue
    const t = normalizeType(typeof v === 'object' && v ? v.type : v)
    if (t) byLayer[layer] = t
  }
  byLayer.body = 'none'
  const character = normalizeType(raw.character) || 'none'
  return { character, byLayer }
}

// 조각 하나의 움직임: 부품/조각 JSON의 motion 이 먼저, 없으면 레이어 기본값. 몸은 언제나 none.
export function motionFor(cfg, layer, override) {
  if (layer === 'body') return 'none'
  return normalizeType(override) || cfg.byLayer[layer] || 'none'
}

// 움직임 줄이기: 'full' | 'minimal'. minimal = 뛰기·흔들기 없음, 반짝 빛만 제자리에서 한 번(위치 안 바뀜)
export function motionPlan(reduce) {
  if (reduce) return { level: 'minimal', hop: false, idle: false, blink: false, shimmer: 'fade', vibrate: false }
  return { level: 'full', hop: true, idle: true, blink: true, shimmer: 'sweep', vibrate: true }
}

export function prefersReducedMotion(win = typeof window !== 'undefined' ? window : undefined) {
  try { return Boolean(win?.matchMedia?.('(prefers-reduced-motion: reduce)').matches) } catch { return false }
}

const wave = (t, p, lag = 0) => (1 - Math.cos((2 * Math.PI * (t - lag)) / p)) / 2 // 0→1→0

export const REST = { tx: 0, ty: 0, rot: 0, sx: 1, sy: 1, op: 1 }

// t(ms)일 때 자세. tx/ty 는 스테이지 px.
export function poseAt(type, t) {
  const p = PERIOD[type] || 1000
  const tt = ((t % p) + p) % p
  switch (type) {
    case 'breathe': { const s = wave(tt, p); return { ...REST, sx: 1 - 0.004 * s, sy: 1 + 0.012 * s } }
    case 'sway': return { ...REST, rot: 1.6 * Math.sin((2 * Math.PI * tt) / p) }
    case 'sway-late': return { ...REST, rot: 1.2 * Math.sin((2 * Math.PI * (tt - 260)) / p) }
    case 'bob': return { ...REST, ty: -4 * wave(tt, p) }
    case 'hop': {
      const u = tt / 520
      if (u >= 1) return { ...REST }
      const up = Math.sin(Math.PI * u)
      return { ...REST, ty: -12 * up, sx: 1 - 0.03 * up, sy: 1 + 0.04 * up }
    }
    case 'pulse': { const s = wave(tt, p); return { ...REST, op: 0.55 + 0.45 * s, sx: 1 + 0.08 * s, sy: 1 + 0.08 * s } }
    default: return { ...REST }
  }
}

// 저장 순간 통통 뛰기 (캐릭터 전체, 발끝 기준). t>=SAVE_HOP_MS 이면 제자리.
export function savePoseAt(t) {
  const u = t / SAVE_HOP_MS
  if (u <= 0 || u >= 1) return { ...REST }
  if (u < 0.15) { const k = u / 0.15; return { ...REST, sx: 1 + 0.06 * k, sy: 1 - 0.08 * k } } // 웅크림
  if (u < 0.7) { const k = (u - 0.15) / 0.55; const up = Math.sin(Math.PI * k); return { ...REST, ty: -26 * up, sx: 1 + 0.06 * (1 - k) - 0.03 * up, sy: 1 - 0.08 * (1 - k) + 0.05 * up } }
  const k = (u - 0.7) / 0.3; const b = Math.sin(Math.PI * k) // 착지 출렁
  return { ...REST, sx: 1 + 0.05 * b, sy: 1 - 0.05 * b }
}

// 캐릭터 전체 자세: 저장 뛰기 → 숨쉬기
export function characterPoseAt(type, t, plan = motionPlan(false)) {
  if (plan.hop && t < SAVE_HOP_MS) return savePoseAt(t)
  if (!plan.idle) return { ...REST }
  return poseAt(type, t - (plan.hop ? SAVE_HOP_MS : 0))
}

export function shimmerAt(t) { // 0..1 진행, 끝나면 null
  if (t < 0 || t > SHIMMER_MS) return null
  return 1 - (1 - t / SHIMMER_MS) ** 2
}

// WAAPI 키프레임: 한 바퀴를 촘촘히 샘플링. box 는 조각 크기(스테이지 px) — translate % 로 바꾼다.
export function keyframesFor(type, box, steps = 24, poseFn) {
  const p = poseFn ? SAVE_HOP_MS : PERIOD[type] || 1000
  const f = poseFn || ((t) => poseAt(type, t))
  const out = []
  for (let i = 0; i <= steps; i++) {
    const q = f((p * i) / steps)
    out.push({ offset: i / steps, transform: transformCss(q, box), opacity: q.op })
  }
  return out
}

const r = (n) => Math.round(n * 1000) / 1000
export function transformCss(q, box) {
  const tx = box?.w ? (q.tx / box.w) * 100 : 0
  const ty = box?.h ? (q.ty / box.h) * 100 : 0
  return `translate(${r(tx)}%, ${r(ty)}%) rotate(${r(q.rot)}deg) scale(${r(q.sx)}, ${r(q.sy)})`
}

export const originCss = (type) => { const o = ORIGIN[type] || ORIGIN.none; return `${o.x * 100}% ${o.y * 100}%` }

// 영상 형식 고르기: 기본은 mp4, 안 되면 webm. GIF 는 따로 골랐을 때만.
export function pickVideoMime(isSupported) {
  const list = ['video/mp4;codecs=avc1.42E01E', 'video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
  for (const m of list) { try { if (isSupported(m)) return m } catch { /* 지원 안 함 */ } }
  return null
}

// 눈 깜빡임: 몸 위 겹침 그림(반 감음/감음)을 잠깐만 보여 준다. 뜬 눈 = 겹침 없음.
// 한 번 = 140ms (반 35ms → 감음 70ms → 반 35ms). 저장 뒤 2초 안에 두 번, 그 뒤엔 BLINK_REPEAT_MS 마다 한 번.
export const BLINK_MS = 140
export const BLINK_STEPS = [[0, 'half'], [35, 'closed'], [105, 'half'], [140, 'open']]
export const SAVE_BLINKS = [900, 1640] // 저장 누른 뒤 시작 시각(ms) — 통통 뛰기(700ms)가 끝난 뒤
export const BLINK_REPEAT_MS = 3600

export function blinkStarts(until) {
  const out = SAVE_BLINKS.filter((s) => s < until)
  for (let s = SAVE_BLINKS[SAVE_BLINKS.length - 1] + BLINK_REPEAT_MS; s < until; s += BLINK_REPEAT_MS) out.push(s)
  return out
}

// t(ms)일 때 눈: 'open' | 'half' | 'closed'
export function blinkFrameAt(t, plan = motionPlan(false)) {
  if (!plan.blink || !(t >= 0)) return 'open'
  let s = SAVE_BLINKS.find((b) => t >= b && t < b + BLINK_MS)
  if (s == null) {
    const last = SAVE_BLINKS[SAVE_BLINKS.length - 1]
    if (t >= last + BLINK_REPEAT_MS) { const k = (t - last) % BLINK_REPEAT_MS; if (k < BLINK_MS) s = t - k }
  }
  if (s == null) return 'open'
  const u = t - s
  let f = 'open'
  for (const [at, name] of BLINK_STEPS) if (u >= at) f = name
  return f
}

// WAAPI 키프레임: 한 겹침 그림(frame)이 보이는 동안만 opacity 1. from..from+dur ms 를 계단식(step-end)으로.
// 반복용: blinkLoopStart() 부터 BLINK_REPEAT_MS 길이를 무한 반복하면 blinkFrameAt 과 똑같다.
export function blinkKeyframes(frame, dur, plan = motionPlan(false), from = 0, stepMs = 5) {
  const out = []
  let prev = null
  for (let t = 0; t <= dur; t += stepMs) {
    const v = blinkFrameAt(from + t, plan) === frame ? 1 : 0
    if (v !== prev) { out.push({ offset: t / dur, opacity: v, easing: 'step-end' }); prev = v }
  }
  if (!out.length || out[0].offset !== 0) out.unshift({ offset: 0, opacity: 0, easing: 'step-end' })
  out.push({ offset: 1, opacity: prev ?? 0 })
  return out
}

export const blinkLoopStart = () => SAVE_BLINKS[SAVE_BLINKS.length - 1] + BLINK_REPEAT_MS
