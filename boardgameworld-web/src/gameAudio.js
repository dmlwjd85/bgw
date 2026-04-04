/**
 * 게임 효과음 — Web Audio API (외부 미디어 파일 없이 동작)
 * 배경음악(BGM)은 사용하지 않습니다.
 */

const STORAGE_KEY = 'bgw-audio-muted';

let ctx = null;
let muted = false;

function getCtx() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return ctx;
}

export function getMuted() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function initMutedFromStorage() {
  muted = getMuted();
}

/** 사용자 제스처 이후 호출 (브라우저 자동 재생 정책) */
export function resumeAudioContext() {
  const c = getCtx();
  if (c.state === 'suspended') return c.resume();
  return Promise.resolve();
}

export function setMuted(next) {
  muted = next;
  try {
    localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
  } catch {
    /* 무시 */
  }
}

const sfxGain = (c, peak, dur) => {
  const g = c.createGain();
  const t = c.currentTime;
  g.gain.setValueAtTime(peak, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  return g;
};

export function playSfx(name) {
  if (muted) return;
  const c = getCtx();
  if (c.state === 'suspended') c.resume();
  const t = c.currentTime;

  if (name === 'win') {
    const freqs = [523.25, 659.25, 783.99, 987.77];
    freqs.forEach((f, i) => {
      const o = c.createOscillator();
      const g = sfxGain(c, 0.09, 0.45);
      o.type = 'sine';
      o.frequency.value = f;
      o.connect(g);
      g.connect(c.destination);
      o.start(t + i * 0.06);
      o.stop(t + i * 0.06 + 0.5);
    });
    return;
  }

  const o = c.createOscillator();
  const g = c.createGain();
  o.connect(g);
  g.connect(c.destination);

  if (name === 'draw') {
    o.type = 'triangle';
    o.frequency.setValueAtTime(420, t);
    o.frequency.exponentialRampToValueAtTime(140, t + 0.14);
    g.gain.setValueAtTime(0.11, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    o.start(t);
    o.stop(t + 0.18);
  } else if (name === 'play') {
    o.type = 'sine';
    o.frequency.setValueAtTime(480, t);
    o.frequency.exponentialRampToValueAtTime(920, t + 0.09);
    g.gain.setValueAtTime(0.1, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
    o.start(t);
    o.stop(t + 0.12);
  } else if (name === 'uno') {
    o.type = 'square';
    o.frequency.setValueAtTime(740, t);
    o.frequency.linearRampToValueAtTime(990, t + 0.04);
    g.gain.setValueAtTime(0.045, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    o.start(t);
    o.stop(t + 0.2);
  } else if (name === 'turn') {
    o.type = 'sine';
    o.frequency.setValueAtTime(660, t);
    g.gain.setValueAtTime(0.085, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    o.start(t);
    o.stop(t + 0.15);
  } else {
    o.frequency.value = 440;
    g.gain.setValueAtTime(0.06, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    o.start(t);
    o.stop(t + 0.09);
  }
}
