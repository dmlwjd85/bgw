// 2초 자랑 영상 만들기: 캔버스에 같은 움직임(poseAt)을 그려서 MediaRecorder 로 녹화(mp4, 안 되면 webm). GIF 는 골랐을 때만.
import { FEET_ORIGIN, ORIGIN, blinkFrameAt, characterPoseAt, motionPlan, pickVideoMime, poseAt, shimmerAt } from './motion.js'

export const BRAG_MS = 2000

export function loadImage(src) {
  return new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src })
}

const GLITTER = [[0.18, 0.2, 0], [0.82, 0.28, 400], [0.12, 0.58, 800], [0.86, 0.66, 200], [0.5, 0.1, 600], [0.3, 0.82, 1000]]

// scene: { w, h, bg, char, pieces: [{ img, p:{x,y,w,h}, type, blink? }] } — blink 조각은 그 순간 눈 모양일 때만 그림 (스테이지 px). t: 저장 누른 뒤 ms
export function drawFrame(g, scene, t, k, plan = motionPlan(false)) {
  const { w, h } = scene
  g.save()
  g.clearRect(0, 0, w * k, h * k)
  g.fillStyle = '#fffdf8'; g.fillRect(0, 0, w * k, h * k)
  if (scene.bg) drawCover(g, scene.bg, w * k, h * k)
  g.scale(k, k)
  // 바닥 그림자(숨쉬듯 커졌다 작아짐)
  const sh = plan.idle ? poseAt('pulse', t) : { sx: 1, op: 1 }
  g.save(); g.globalAlpha = 0.18 + 0.1 * (sh.op - 0.55); g.fillStyle = '#5b2d45'
  g.beginPath(); g.ellipse(w * 0.5, h * 0.945, 70 * sh.sx, 9 * sh.sx, 0, 0, Math.PI * 2); g.fill(); g.restore()
  // 캐릭터 전체(발끝 기준)
  const c = characterPoseAt(scene.char, t, plan)
  const eye = blinkFrameAt(t, plan)
  g.save()
  applyPose(g, c, w * FEET_ORIGIN.x, h * FEET_ORIGIN.y)
  for (const pc of scene.pieces) {
    if (pc.blink && pc.blink !== eye) continue
    const q = plan.idle ? poseAt(pc.type, t) : { tx: 0, ty: 0, rot: 0, sx: 1, sy: 1, op: 1 }
    const o = ORIGIN[pc.type] || ORIGIN.none
    g.save()
    if (pc.type !== 'none') applyPose(g, q, pc.p.x + pc.p.w * o.x, pc.p.y + pc.p.h * o.y)
    g.globalAlpha = q.op ?? 1
    g.drawImage(pc.img, pc.p.x, pc.p.y, pc.p.w, pc.p.h)
    g.restore()
  }
  g.restore()
  // 반짝이
  if (plan.idle) for (const [gx, gy, lag] of GLITTER) { const q = poseAt('pulse', t + lag); star(g, gx * w, gy * h, 7 * q.sx, q.op) }
  // 홀로그램 반짝 빛 한 번
  const s = shimmerAt(t)
  if (s != null) {
    g.save(); g.globalCompositeOperation = 'lighter'
    if (plan.shimmer === 'sweep') {
      const x = -w * 0.6 + s * w * 2.2
      const gr = g.createLinearGradient(x - 60, 0, x + 60, h * 0.25)
      gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.35, 'rgba(255,140,220,.14)'); gr.addColorStop(0.5, 'rgba(255,255,255,.26)'); gr.addColorStop(0.65, 'rgba(120,220,255,.14)'); gr.addColorStop(1, 'rgba(255,255,255,0)')
      g.fillStyle = gr
    } else g.fillStyle = `rgba(255,255,255,${0.25 * Math.sin(Math.PI * s)})`
    g.fillRect(0, 0, w, h); g.restore()
  }
  g.restore()
}

function applyPose(g, q, ox, oy) {
  g.translate(ox + q.tx, oy + q.ty); g.rotate((q.rot * Math.PI) / 180); g.scale(q.sx, q.sy); g.translate(-ox, -oy)
}
function drawCover(g, img, W, H) {
  const r = Math.max(W / img.width, H / img.height)
  const iw = img.width * r, ih = img.height * r
  g.drawImage(img, (W - iw) / 2, (H - ih) / 2, iw, ih)
}
function star(g, x, y, r, a) {
  g.save(); g.globalAlpha = Math.max(0, Math.min(1, a)); g.fillStyle = '#fff6a8'; g.shadowColor = '#ffffff'; g.shadowBlur = 6
  g.beginPath()
  for (let i = 0; i < 8; i++) { const rr = i % 2 ? r * 0.35 : r; const an = (i * Math.PI) / 4 - Math.PI / 2; g.lineTo(x + rr * Math.cos(an), y + rr * Math.sin(an)) }
  g.closePath(); g.fill(); g.restore()
}

// 기본: mp4(지원하면) 또는 webm 2초 영상. 결과 { blob, ext, mime }
export async function recordBrag(scene, { k = 2, fps = 30, ms = BRAG_MS, plan } = {}) {
  const MR = typeof MediaRecorder !== 'undefined' ? MediaRecorder : null
  const mime = MR && pickVideoMime((m) => MR.isTypeSupported(m))
  if (!mime) throw new Error('no-recorder')
  const cv = document.createElement('canvas')
  cv.width = Math.round(scene.w * k / 2) * 2; cv.height = Math.round(scene.h * k / 2) * 2
  const g = cv.getContext('2d')
  drawFrame(g, scene, 0, k, plan)
  const stream = cv.captureStream(fps)
  const rec = new MR(stream, { mimeType: mime, videoBitsPerSecond: 4_000_000 })
  const chunks = []
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data)
  const done = new Promise((ok) => { rec.onstop = ok })
  rec.start(250)
  const t0 = performance.now()
  await new Promise((ok) => {
    const tick = () => {
      const t = performance.now() - t0
      drawFrame(g, scene, Math.min(t, ms), k, plan)
      if (t >= ms) return ok()
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
  rec.stop(); stream.getTracks().forEach((tr) => tr.stop())
  await done
  const type = mime.split(';')[0]
  return { blob: new Blob(chunks, { type }), ext: type === 'video/mp4' ? 'mp4' : 'webm', mime: type }
}

// 골랐을 때만: GIF(작게, 15fps). gifenc 는 이때만 불러온다.
export async function makeGif(scene, { k = 1, fps = 15, ms = BRAG_MS, plan } = {}) {
  const { GIFEncoder, quantize, applyPalette } = await import('gifenc')
  const cv = document.createElement('canvas')
  cv.width = Math.round(scene.w * k); cv.height = Math.round(scene.h * k)
  const g = cv.getContext('2d', { willReadFrequently: true })
  const enc = GIFEncoder()
  const n = Math.round((ms / 1000) * fps)
  for (let i = 0; i < n; i++) {
    drawFrame(g, scene, (i * 1000) / fps, k, plan)
    const { data } = g.getImageData(0, 0, cv.width, cv.height)
    const pal = quantize(data, 256)
    enc.writeFrame(applyPalette(data, pal), cv.width, cv.height, { palette: pal, delay: Math.round(1000 / fps) })
    if (i % 5 === 4) await new Promise((r) => setTimeout(r))
  }
  enc.finish()
  return { blob: new Blob([enc.bytes()], { type: 'image/gif' }), ext: 'gif', mime: 'image/gif' }
}
