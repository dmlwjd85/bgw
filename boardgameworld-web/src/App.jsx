import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, updateDoc, getDoc } from 'firebase/firestore';
import {
  startBgm,
  stopBgm,
  resumeAudioContext,
  playSfx,
  setMuted as setAudioMutedGlobal,
  getMuted,
  initMutedFromStorage
} from './gameAudio.js';

// --- Firebase 초기화 (Vite 환경 변수 또는 __firebase_config 폴백) ---
function loadFirebaseConfig() {
  try {
    const raw = import.meta.env.VITE_FIREBASE_CONFIG;
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Firebase 설정 파싱 오류:', e);
  }
  if (typeof __firebase_config !== 'undefined' && __firebase_config) {
    return typeof __firebase_config === 'string' ? JSON.parse(__firebase_config) : __firebase_config;
  }
  return {};
}
const firebaseConfig = loadFirebaseConfig();
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId =
  import.meta.env.VITE_APP_ID ||
  (typeof __app_id !== 'undefined' ? __app_id : 'board-game-app');

/** 더 마인드 공식: 마지막 목표 레벨 */
const THE_MIND_MAX_LEVEL = 12;

/** 가상 플레이어: 낼 카드 숫자 1~100에 비례해 최대 20초까지 대기 후 플레이 */
const THE_MIND_AI_DELAY_MAX_MS = 20000;
/** 레벨 시작 직후: 사람이 1·2 카드에 반응할 시간 */
const THE_MIND_LEVEL_START_GRACE_MS = 1000;
/** 인간 패가 모두 비었을 때만 AI끼리 남은 경우 — 빠르게 레벨 종료 */
const THE_MIND_ONLY_AI_DELAY_CAP_MS = 220;

const getTheMindAiPlayDelayMs = (cardValue) => {
  const n = Math.max(1, Math.min(100, Number(cardValue) || 1));
  return Math.min(THE_MIND_AI_DELAY_MAX_MS, Math.max(250, (n / 100) * THE_MIND_AI_DELAY_MAX_MS));
};

/** 우노 AI: 행동 사이 대기(인지하기 쉽게) */
const UNO_AI_STEP_DELAY_MS = 1050;
const UNO_AI_AFTER_DECLARE_MS = 750;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const MIND_CONFETTI_COLORS = ['#f472b6', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa', '#fb7185', '#fde047', '#4ade80', '#f97316'];

/** 레벨 클리어 축하 컨페티(팡팡) */
function triggerMindLevelConfetti(container) {
  if (!container || typeof document === 'undefined') return;
  container.innerHTML = '';
  const count = 100;
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    const left = Math.random() * 100;
    const delay = Math.random() * 0.55;
    const duration = 2.2 + Math.random() * 2.2;
    const drift = (Math.random() - 0.5) * 160;
    const rot = Math.random() * 1080 - 540;
    const w = 5 + Math.random() * 9;
    const h = 7 + Math.random() * 14;
    el.className = 'mind-confetti-piece';
    el.style.left = `${left}%`;
    el.style.width = `${w}px`;
    el.style.height = `${h}px`;
    el.style.background = MIND_CONFETTI_COLORS[i % MIND_CONFETTI_COLORS.length];
    el.style.animationDuration = `${duration}s`;
    el.style.animationDelay = `${delay}s`;
    el.style.setProperty('--mind-drift', `${drift}px`);
    el.style.setProperty('--mind-rot', `${rot}deg`);
    container.appendChild(el);
  }
  window.setTimeout(() => {
    if (container) container.innerHTML = '';
  }, 5200);
}

// --- 유틸리티 함수 ---
const generateRoomCode = () => Math.random().toString(36).substring(2, 6).toUpperCase();

const shuffleArray = (array) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

/** 테이블 최대 인원 (인간 + AI 합산) */
const MAX_TABLE_PLAYERS = 6;

const generateAiUid = () => `ai-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

/** 게임 중 플레이어가 나가 AI로 바뀔 때 gameState의 uid 참조를 옮깁니다. */
const migrateGameStateUid = (oldUid, newUid, gs, gameType) => {
  if (!gs) return gs;
  const next = { ...gs, hands: { ...gs.hands } };
  if (next.hands[oldUid] !== undefined) {
    next.hands[newUid] = next.hands[oldUid];
    delete next.hands[oldUid];
  }
  if (gameType === 'themind') {
    next.shurikenVotes = (gs.shurikenVotes || []).map((u) => (u === oldUid ? newUid : u));
  }
  if (gameType === 'uno') {
    next.unoDeclared = gs.unoDeclared ? { ...gs.unoDeclared } : {};
    if (next.unoDeclared[oldUid] !== undefined) {
      next.unoDeclared[newUid] = next.unoDeclared[oldUid];
      delete next.unoDeclared[oldUid];
    }
    if (next.drawPhase?.uid === oldUid) {
      next.drawPhase = { ...next.drawPhase, uid: newUid };
    }
    if (next.pendingWild4) {
      next.pendingWild4 = { ...next.pendingWild4 };
      if (next.pendingWild4.victimUid === oldUid) next.pendingWild4.victimUid = newUid;
      if (next.pendingWild4.targetUid === oldUid) next.pendingWild4.targetUid = newUid;
    }
  }
  return next;
};

// --- 게임 로직: 더 마인드 ---
const initTheMind = (players, level = 1, lives = null, shurikens = null) => {
  let deck = Array.from({ length: 100 }, (_, i) => i + 1);
  deck = shuffleArray(deck);

  const hands = {};
  players.forEach((p) => {
    hands[p.uid] = deck.splice(0, level).sort((a, b) => a - b);
  });

  return {
    game: 'themind',
    status: 'playing',
    level,
    lives: lives !== null ? lives : players.length,
    shurikens: shurikens !== null ? shurikens : 1,
    shurikenVotes: [],
    playedCards: [],
    hands,
    message: `${level}레벨 시작 — 아무 말 없이 가장 작은 수부터 놓으세요.`
  };
};

// --- 게임 로직: 우노 ---
const COLORS = ['red', 'blue', 'green', 'yellow'];

/** 초보 AI용: 패에서 낼 만한 우노 카드 인덱스 (없으면 -1) */
const findBeginnerUnoPlayIndex = (hand, topCard, currentColor, drawPhase) => {
  if (!hand?.length) return -1;
  if (drawPhase) {
    const c = hand[drawPhase.cardIndex];
    if (c && canPlayUnoCard(c, topCard, currentColor)) return drawPhase.cardIndex;
    return -1;
  }
  for (let i = 0; i < hand.length; i++) {
    if (canPlayUnoCard(hand[i], topCard, currentColor)) return i;
  }
  return -1;
};

/** 초보 AI: 와일드 플레이 시 선호 색 (패에 가장 많은 색) */
const pickUnoWildColorForAi = (hand, excludeIndex) => {
  const counts = { red: 0, blue: 0, green: 0, yellow: 0 };
  hand.forEach((c, i) => {
    if (i === excludeIndex || c.color === 'black') return;
    if (counts[c.color] !== undefined) counts[c.color]++;
  });
  let best = 'red';
  let m = -1;
  COLORS.forEach((c) => {
    if (counts[c] > m) {
      m = counts[c];
      best = c;
    }
  });
  return best;
};

const generateUnoDeck = () => {
  const deck = [];
  COLORS.forEach((color) => {
    deck.push({ color, value: '0', id: `${color}-0` });
    for (let i = 1; i <= 9; i++) {
      deck.push({ color, value: String(i), id: `${color}-${i}-a` });
      deck.push({ color, value: String(i), id: `${color}-${i}-b` });
    }
    ['skip', 'reverse', 'draw2'].forEach((special) => {
      deck.push({ color, value: special, id: `${color}-${special}-a` });
      deck.push({ color, value: special, id: `${color}-${special}-b` });
    });
  });
  for (let i = 0; i < 4; i++) {
    deck.push({ color: 'black', value: 'wild', id: `wild-${i}` });
    deck.push({ color: 'black', value: 'wild4', id: `wild4-${i}` });
  }
  return shuffleArray(deck);
};

/** 상단 패와 현재 선언 색으로 낼 수 있는지 (공식 규칙) */
const canPlayUnoCard = (card, topCard, currentColor) => {
  if (card.color === 'black') return true;
  if (topCard.color === 'black') return card.color === currentColor;
  return card.color === currentColor || card.value === topCard.value;
};

/** 우노 초보용: 다음 행동 안내 메시지 + 하이라이트 대상 */
function getUnoPlayerHint(state, roomData, userId, wildColorOpen) {
  if (!state || state.status !== 'playing') return null;
  if (wildColorOpen) {
    return { message: '이어질 색을 하나 선택하세요.', highlight: 'wildModal', cardIndices: [] };
  }
  const isMyTurn = roomData.players[state.turnIndex]?.uid === userId;
  const myHand = state.hands[userId] || [];
  const topCard = state.discardPile[state.discardPile.length - 1];

  if (!isMyTurn) {
    return { message: '상대 플레이어 차례입니다. 잠시만 기다려 주세요.', highlight: null, cardIndices: [] };
  }

  if (state.pendingWild4?.targetUid === userId) {
    return { message: 'Wild +4 — 「4장 받기」 또는 「도전」을 눌러 주세요.', highlight: 'wild4', cardIndices: [] };
  }

  if (state.needsInitialWildColor) {
    return { message: '첫 카드가 와일드입니다. 아래 색 버튼으로 시작 색을 고르세요.', highlight: 'colors', cardIndices: [] };
  }

  if (state.drawPhase?.uid === userId) {
    const idx = findBeginnerUnoPlayIndex(myHand, topCard, state.currentColor, state.drawPhase);
    if (idx >= 0) {
      return { message: '방금 뽑은 카드를 내려면 그 카드를 누르세요.', highlight: 'hand', cardIndices: [idx] };
    }
    return { message: '낼 수 없으면 「턴 넘기기」를 눌러 주세요.', highlight: 'pass', cardIndices: [] };
  }

  if (myHand.length === 1 && !state.unoDeclared?.[userId]) {
    return { message: '카드 한 장만 남았습니다! 먼저 노란 「UNO!」 버튼을 누르세요.', highlight: 'uno', cardIndices: [] };
  }

  const playableIndices = [];
  for (let i = 0; i < myHand.length; i++) {
    const ok =
      canPlayUnoCard(myHand[i], topCard, state.currentColor) &&
      (!state.drawPhase || (state.drawPhase.uid === userId && i === state.drawPhase.cardIndex));
    if (ok) playableIndices.push(i);
  }

  if (playableIndices.length > 0) {
    const winningPlay = myHand.length === 1 && state.unoDeclared?.[userId];
    return {
      message: winningPlay ? '이 카드를 내고 승리해 보세요!' : '규칙에 맞는 카드를 한 장 눌러 내세요.',
      highlight: 'hand',
      cardIndices: playableIndices
    };
  }

  return { message: '낼 카드가 없습니다. 왼쪽 빨간 덱을 눌러 카드를 가져가세요.', highlight: 'deck', cardIndices: [] };
}

const replenishDeck = (deck, discardPile) => {
  let d = [...deck];
  let disc = [...discardPile];
  if (d.length === 0 && disc.length > 1) {
    const top = disc[disc.length - 1];
    const rest = disc.slice(0, -1);
    d = shuffleArray(rest);
    disc = [top];
  }
  return { deck: d, discardPile: disc };
};

/**
 * 첫 카드 규칙 반영: Wild Draw 4는 시작 카드로 불가(덱에 다시 넣고 섞음).
 * 스킵/리버스/+2/와일드는 효과 적용.
 */
const initUno = (players) => {
  let deck = generateUnoDeck();
  const hands = {};
  players.forEach((p) => {
    hands[p.uid] = deck.splice(0, 7);
  });

  let topCard;
  while (true) {
    if (deck.length === 0) {
      deck = generateUnoDeck();
      players.forEach((p) => {
        hands[p.uid] = deck.splice(0, 7);
      });
    }
    topCard = deck.pop();
    if (topCard.value === 'wild4') {
      deck.push(topCard);
      deck = shuffleArray(deck);
      continue;
    }
    break;
  }

  const discardPile = [topCard];
  let turnIndex = 0;
  let direction = 1;
  let currentColor = topCard.color === 'black' ? 'red' : topCard.color;
  let needsInitialWildColor = topCard.color === 'black';
  let message = '우노를 시작합니다. 같은 숫자·같은 색 또는 검은 카드를 내세요.';

  const n = players.length;
  const nextIdx = (idx, delta = 1) => (idx + delta * direction + n * 16) % n;

  if (topCard.value === 'skip') {
    turnIndex = nextIdx(turnIndex, 1);
    message = '첫 카드 스킵! 첫 플레이어가 한 턴 건너뜁니다.';
  } else if (topCard.value === 'reverse') {
    direction = -1;
    if (n === 2) {
      turnIndex = nextIdx(turnIndex, 1);
    } else {
      turnIndex = nextIdx(turnIndex, -1);
    }
    message = '첫 카드 리버스! 진행 방향이 바뀝니다.';
  } else if (topCard.value === 'draw2') {
    const firstUid = players[0].uid;
    let d = [...deck];
    let rep = replenishDeck(d, discardPile);
    d = rep.deck;
    const draw2 = d.splice(0, 2);
    hands[firstUid] = [...hands[firstUid], ...draw2];
    turnIndex = nextIdx(turnIndex, 1);
    message = '첫 카드 +2! 첫 플레이어가 2장 먹고 턴이 넘어갑니다.';
    deck = d;
  } else if (topCard.value === 'wild') {
    needsInitialWildColor = true;
    message = '첫 카드 와일드! 차례인 플레이어가 색을 고릅니다.';
  }

  const unoDeclared = {};
  players.forEach((p) => {
    unoDeclared[p.uid] = false;
  });

  return {
    game: 'uno',
    status: 'playing',
    hands,
    deck,
    discardPile,
    currentColor,
    turnIndex,
    direction,
    needsInitialWildColor,
    drawPhase: null,
    unoDeclared,
    pendingWild4: null,
    message
  };
};

// --- 메인 앱 컴포넌트 ---
export default function App() {
  const [user, setUser] = useState(null);
  const [userName, setUserName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [roomData, setRoomData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [wildColorSelector, setWildColorSelector] = useState(null);
  const hostAiTimerRef = useRef(null);
  const mindAiDelayRef = useRef(null);
  const mindCelebrationRef = useRef(null);
  const lastMindCelebrateKeyRef = useRef(null);
  const [audioMuted, setAudioMuted] = useState(() => getMuted());
  /** 우노: 하스스톤식 전투 연출 */
  const [unoShake, setUnoShake] = useState(null);
  const [unoBattleFlash, setUnoBattleFlash] = useState(null);
  const [unoBattleBanner, setUnoBattleBanner] = useState(null);
  const [discardSlamKey, setDiscardSlamKey] = useState(0);
  const [unoTurnPulseIndex, setUnoTurnPulseIndex] = useState(null);
  const unoPrevSnapRef = useRef(null);
  const sfxDiscardLenRef = useRef(0);
  const sfxTurnRef = useRef(null);
  const sfxMindPlayedRef = useRef(0);
  const sfxHandLenRef = useRef(null);
  const sfxGameOverRef = useRef(false);

  /** 넷플릭스 틴 스타일 + 게임별 포인트 컬러 */
  const tableStyle = useMemo(() => {
    if (roomData?.game === 'uno') {
      return {
        background:
          'radial-gradient(ellipse 100% 70% at 50% 0%, rgba(229, 9, 20, 0.14), transparent 55%), linear-gradient(180deg, #0a0a0a 0%, #141414 45%, #050505 100%)',
        boxShadow: 'inset 0 0 100px rgba(0,0,0,0.5)'
      };
    }
    if (roomData?.game === 'themind') {
      return {
        background:
          'radial-gradient(ellipse 90% 60% at 70% 10%, rgba(99, 102, 241, 0.16), transparent 50%), linear-gradient(185deg, #0c0c12 0%, #14141c 50%, #060608 100%)',
        boxShadow: 'inset 0 0 100px rgba(0,0,0,0.55)'
      };
    }
    return {
      background: 'linear-gradient(180deg, #0d0d0d 0%, #141414 100%)',
      boxShadow: 'inset 0 0 80px rgba(0,0,0,0.45)'
    };
  }, [roomData?.game]);

  const toggleAudioMute = useCallback(() => {
    const next = !audioMuted;
    setAudioMuted(next);
    setAudioMutedGlobal(next);
  }, [audioMuted]);

  useEffect(() => {
    initMutedFromStorage();
  }, []);

  useEffect(() => {
    const fn = () => resumeAudioContext();
    window.addEventListener('pointerdown', fn, { once: true });
    return () => window.removeEventListener('pointerdown', fn);
  }, []);

  /** 화면(로비·플레이)에 맞춰 BGM 전환 */
  useEffect(() => {
    if (loading) return;
    if (!roomData) {
      startBgm('lobby');
      return () => stopBgm();
    }
    if (roomData.status === 'lobby') {
      startBgm('lobby');
      return () => stopBgm();
    }
    if (roomData.status === 'playing' && roomData.game === 'uno') {
      startBgm('uno');
      return () => stopBgm();
    }
    if (roomData.status === 'playing' && roomData.game === 'themind') {
      startBgm('themind');
      return () => stopBgm();
    }
    startBgm('lobby');
    return () => stopBgm();
  }, [loading, roomData?.status, roomData?.game, roomData]);

  /** 우노: 덱에 카드가 쌓이면 효과음 */
  useEffect(() => {
    if (roomData?.game !== 'uno' || roomData?.gameState?.status !== 'playing') return;
    const len = roomData.gameState?.discardPile?.length ?? 0;
    if (len > sfxDiscardLenRef.current && sfxDiscardLenRef.current > 0) {
      playSfx('play');
    }
    sfxDiscardLenRef.current = len;
  }, [roomData?.game, roomData?.gameState?.discardPile?.length, roomData?.gameState?.status]);

  /** 우노: 내 차례가 되면 효과음 */
  useEffect(() => {
    if (roomData?.game !== 'uno' || !user?.uid || roomData?.gameState?.status !== 'playing') return;
    const uid = roomData.players[roomData.gameState.turnIndex]?.uid;
    const ti = roomData.gameState.turnIndex;
    if (uid === user.uid && sfxTurnRef.current !== null && sfxTurnRef.current !== ti) {
      playSfx('turn');
    }
    sfxTurnRef.current = ti;
  }, [roomData?.game, roomData?.gameState?.turnIndex, roomData?.players, user?.uid, roomData?.gameState?.status]);

  /** 우노: 패가 늘어나면(뽑기) 효과음 */
  useEffect(() => {
    if (roomData?.game !== 'uno' || !user?.uid) return;
    const h = roomData.gameState?.hands?.[user.uid]?.length;
    if (h === undefined) return;
    if (sfxHandLenRef.current !== null && h > sfxHandLenRef.current) {
      playSfx('draw');
    }
    sfxHandLenRef.current = h;
  }, [roomData?.game, roomData?.gameState?.hands, user?.uid]);

  /** 더 마인드: 카드가 놓일 때 효과음 */
  useEffect(() => {
    if (roomData?.game !== 'themind') return;
    const n = roomData?.gameState?.playedCards?.length ?? 0;
    if (n > sfxMindPlayedRef.current && sfxMindPlayedRef.current > 0) {
      playSfx('play');
    }
    sfxMindPlayedRef.current = n;
  }, [roomData?.game, roomData?.gameState?.playedCards?.length]);

  /** 게임 오버 시 짧은 승리/종료 멜로디 */
  useEffect(() => {
    if (roomData?.gameState?.status === 'gameover' && !sfxGameOverRef.current) {
      sfxGameOverRef.current = true;
      playSfx('win');
    }
    if (roomData?.gameState?.status === 'playing') {
      sfxGameOverRef.current = false;
    }
  }, [roomData?.gameState?.status]);

  useEffect(() => {
    sfxDiscardLenRef.current = 0;
    sfxTurnRef.current = null;
    sfxMindPlayedRef.current = 0;
    sfxHandLenRef.current = null;
    sfxGameOverRef.current = false;
    unoPrevSnapRef.current = null;
    setUnoShake(null);
    setUnoBattleFlash(null);
    setUnoBattleBanner(null);
    setUnoTurnPulseIndex(null);
    setDiscardSlamKey(0);
  }, [roomCode]);

  /** 우노: 카드 플레이·턴 이동 감지 → 진동·플래시·배너 (직관적 공격/턴 흐름) */
  useEffect(() => {
    if (roomData?.game !== 'uno' || !roomData.gameState || roomData.gameState.status !== 'playing') {
      unoPrevSnapRef.current = null;
      return;
    }
    const gs = roomData.gameState;
    const players = roomData.players;
    const n = players.length;
    if (!n || !gs.discardPile?.length) return;

    const snap = {
      discardLen: gs.discardPile.length,
      turnIndex: gs.turnIndex,
      direction: gs.direction
    };

    const prev = unoPrevSnapRef.current;
    if (!prev) {
      unoPrevSnapRef.current = snap;
      return;
    }

    const nextIdx = (i, dir, step = 1) => (i + step * dir + n * 32) % n;

    if (snap.discardLen > prev.discardLen) {
      const card = gs.discardPile[gs.discardPile.length - 1];
      const playedBy = prev.turnIndex;
      const fromName = players[playedBy]?.name ?? '?';

      let shake = 'light';
      let from = playedBy;
      let to = null;
      let banner = `${fromName}님이 카드를 냈습니다`;

      if (card.value === 'draw2') {
        shake = 'heavy';
        to = nextIdx(playedBy, prev.direction, 1);
        banner = `⚔ ${fromName} → ${players[to]?.name ?? '?'} : 드로우 2!`;
      } else if (card.value === 'wild4') {
        shake = 'heavy';
        const ti = players.findIndex((p) => p.uid === gs.pendingWild4?.targetUid);
        if (ti >= 0) {
          to = ti;
          banner = `💥 ${fromName} → ${players[to]?.name ?? '?'} : Wild +4!`;
        } else {
          banner = `💥 ${fromName}님 Wild +4!`;
        }
      } else if (card.value === 'skip') {
        shake = 'medium';
        to = nextIdx(playedBy, prev.direction, 1);
        banner = `⏭ ${players[to]?.name ?? '?'} 스킵!`;
      } else if (card.value === 'reverse') {
        shake = 'medium';
        banner = `🔄 방향 반전! (${n === 2 ? '턴 교환' : '순서 뒤집힘'})`;
        from = playedBy;
        to = null;
      } else if (card.color === 'black' && card.value === 'wild') {
        shake = 'medium';
        banner = `✦ ${fromName}님 와일드!`;
      }

      setUnoShake(shake);
      window.setTimeout(() => setUnoShake(null), 720);
      setDiscardSlamKey((k) => k + 1);

      if (to !== null && to !== undefined && to !== from) {
        setUnoBattleFlash({ from, to });
        window.setTimeout(() => setUnoBattleFlash(null), 1150);
      } else {
        setUnoBattleFlash({ from, to: null });
        window.setTimeout(() => setUnoBattleFlash(null), 750);
      }

      setUnoBattleBanner(banner);

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        if (shake === 'heavy') navigator.vibrate([38, 28, 48]);
        else if (shake === 'medium') navigator.vibrate([24, 18]);
        else navigator.vibrate(14);
      }
    } else if (snap.turnIndex !== prev.turnIndex && snap.discardLen === prev.discardLen) {
      setUnoTurnPulseIndex(snap.turnIndex);
      window.setTimeout(() => setUnoTurnPulseIndex(null), 620);
      setUnoShake('light');
      window.setTimeout(() => setUnoShake(null), 420);
    }

    unoPrevSnapRef.current = snap;
  }, [roomData, roomData?.game, roomData?.gameState, roomData?.players]);

  useEffect(() => {
    if (!unoBattleBanner) return undefined;
    const t = window.setTimeout(() => setUnoBattleBanner(null), 2800);
    return () => window.clearTimeout(t);
  }, [unoBattleBanner]);

  /** 우노 초보 안내(훅은 항상 동일 순서로 호출) */
  const unoHint = useMemo(() => {
    if (!roomData || roomData.status !== 'playing' || roomData.game !== 'uno' || !user?.uid) return null;
    const st = roomData.gameState;
    if (!st) return null;
    return getUnoPlayerHint(st, roomData, user.uid, !!wildColorSelector);
  }, [roomData, user?.uid, wildColorSelector]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const token =
          import.meta.env.VITE_INITIAL_AUTH_TOKEN ||
          (typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : '');
        if (token) {
          await signInWithCustomToken(auth, token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error('인증 오류:', error);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !roomCode) return;

    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode);
    const unsubscribe = onSnapshot(
      roomRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setRoomData(snapshot.data());
        } else {
          setRoomData(null);
          setRoomCode('');
          alert('방이 존재하지 않거나 종료되었습니다.');
        }
      },
      (error) => {
        console.error('방 데이터 읽기 오류:', error);
      }
    );

    return () => unsubscribe();
  }, [user, roomCode]);

  const handleCreateRoom = async () => {
    if (!userName.trim()) return alert('이름을 입력해주세요.');
    const code = generateRoomCode();
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', code);

    await setDoc(roomRef, {
      code,
      status: 'lobby',
      game: 'none',
      players: [{ uid: user.uid, name: userName, isHost: true }],
      gameState: {}
    });
    setRoomCode(code);
  };

  const handleJoinRoom = async () => {
    if (!userName.trim()) return alert('이름을 입력해주세요.');
    if (!inputCode.trim()) return alert('방 코드를 입력해주세요.');

    const code = inputCode.trim().toUpperCase();
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', code);
    const roomSnap = await getDoc(roomRef);

    if (roomSnap.exists()) {
      const data = roomSnap.data();
      if (data.status !== 'lobby') return alert('이미 게임이 진행 중인 방입니다.');
      if (data.players.some((p) => p.uid === user.uid)) {
        setRoomCode(code);
        return;
      }

      await updateDoc(roomRef, {
        players: [...data.players, { uid: user.uid, name: userName, isHost: false }]
      });
      setRoomCode(code);
    } else {
      alert('방을 찾을 수 없습니다.');
    }
  };

  const handleLeaveRoom = async () => {
    if (!roomData) return;
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode);
    const newPlayers = roomData.players.filter((p) => p.uid !== user.uid);

    if (newPlayers.length === 0) {
      await updateDoc(roomRef, { status: 'closed' });
    } else {
      if (roomData.players.find((p) => p.uid === user.uid)?.isHost) {
        newPlayers[0].isHost = true;
      }
      await updateDoc(roomRef, { players: newPlayers });
    }
    setRoomCode('');
    setRoomData(null);
  };

  /** 방장만: 인원 부족 시 초보 AI 플레이어 추가 */
  const handleAddAiPlayer = async () => {
    if (!roomData || !roomData.players.find((p) => p.uid === user.uid)?.isHost) return;
    if (roomData.status !== 'lobby') return;
    if (roomData.players.length >= MAX_TABLE_PLAYERS) return alert(`최대 ${MAX_TABLE_PLAYERS}명까지입니다.`);
    const aiCount = roomData.players.filter((p) => p.isAi).length;
    const newPlayer = {
      uid: generateAiUid(),
      name: `초보 AI ${aiCount + 1}`,
      isHost: false,
      isAi: true
    };
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode);
    await updateDoc(roomRef, { players: [...roomData.players, newPlayer] });
  };

  /** 방장만: 마지막으로 추가한 AI부터 제거 */
  const handleRemoveAiPlayer = async () => {
    if (!roomData || !roomData.players.find((p) => p.uid === user.uid)?.isHost) return;
    if (roomData.status !== 'lobby') return;
    const players = [...roomData.players];
    const idx = [...players].reverse().findIndex((p) => p.isAi);
    if (idx === -1) return alert('제거할 AI가 없습니다.');
    const realIdx = players.length - 1 - idx;
    players.splice(realIdx, 1);
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode);
    await updateDoc(roomRef, { players });
  };

  /** 게임 중 나가기: 내 자리를 초보 AI로 바꾸고 로비 화면으로 돌아갑니다. */
  const handleLeaveGameAsAi = async () => {
    if (!roomCode || !user?.uid) return;
    if (!window.confirm('게임에서 나갑니다. 이 자리는 AI가 이어갑니다. 계속할까요?')) return;

    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode);
    const snap = await getDoc(roomRef);
    if (!snap.exists()) return;
    const rd = snap.data();
    if (rd.status !== 'playing') return;

    const idx = rd.players.findIndex((p) => p.uid === user.uid);
    if (idx === -1) return;

    const leaving = rd.players[idx];
    const newUid = generateAiUid();
    const baseName = leaving.name.replace(/\s*\(AI\)\s*$/, '').trim();
    const newPlayer = {
      uid: newUid,
      name: `${baseName || '플레이어'} (AI)`,
      isAi: true,
      isHost: false
    };

    let newPlayers = [...rd.players];
    newPlayers[idx] = newPlayer;

    if (leaving.isHost) {
      const humanIdx = newPlayers.findIndex((p) => !p.isAi);
      newPlayers = newPlayers.map((p, i) => ({
        ...p,
        isHost: humanIdx >= 0 ? i === humanIdx : i === 0
      }));
    }

    const newGs = migrateGameStateUid(user.uid, newUid, rd.gameState, rd.game);
    const humansLeft = newPlayers.filter((p) => !p.isAi);

    if (humansLeft.length === 0) {
      await updateDoc(roomRef, {
        players: newPlayers,
        status: 'lobby',
        game: 'none',
        gameState: {}
      });
      setRoomCode('');
      setRoomData(null);
      alert('남은 플레이어가 모두 AI입니다. 테이블을 로비로 되돌렸습니다.');
      return;
    }

    await updateDoc(roomRef, {
      players: newPlayers,
      gameState: newGs
    });
    setRoomCode('');
    setRoomData(null);
  };

  const handleStartGame = async (gameType) => {
    if (!roomData || !roomData.players.find((p) => p.uid === user.uid)?.isHost) return;
    const n = roomData.players.length;
    if (gameType === 'uno' && n < 2) return alert('우노는 최소 2명(인간 또는 AI)이 필요합니다.');
    if (gameType === 'themind' && n < 2) return alert('더 마인드는 최소 2명(인간 또는 AI)이 필요합니다.');

    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode);
    let initialGameState = {};

    if (gameType === 'themind') initialGameState = initTheMind(roomData.players);
    if (gameType === 'uno') initialGameState = initUno(roomData.players);

    await updateDoc(roomRef, {
      status: 'playing',
      game: gameType,
      gameState: initialGameState
    });
  };

  // --- 더 마인드 액션 (actingUid: AI 턴 시 방장이 대리 실행, rd: 최신 방 데이터) ---
  const playTheMindCard = async (card, actingUid = user.uid, rd = roomData) => {
    if (!rd || rd.gameState.status !== 'playing') return;

    const state = rd.gameState;
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode);
    if (!state.hands[actingUid]?.includes(card)) return;

    let allCards = [];
    Object.values(state.hands).forEach((hand) => {
      allCards = allCards.concat(hand);
    });
    if (allCards.length === 0) return;
    const lowestCard = Math.min(...allCards);

    const newHands = { ...state.hands };
    newHands[actingUid] = newHands[actingUid].filter((c) => c !== card);
    const newPlayedCards = [...state.playedCards, card];

    const updates = {
      'gameState.hands': newHands,
      'gameState.playedCards': newPlayedCards,
      'gameState.shurikenVotes': []
    };

    const actorName = rd.players.find((p) => p.uid === actingUid)?.name ?? '플레이어';

    if (card === lowestCard) {
      updates['gameState.message'] = `${actorName}님이 ${card}를 냈습니다.`;

      const remainingCards = Object.values(newHands).reduce((acc, hand) => acc + hand.length, 0);
      if (remainingCards === 0) {
        if (state.level >= THE_MIND_MAX_LEVEL) {
          updates['gameState.status'] = 'won';
          updates['gameState.message'] = `전체 클리어! 레벨 ${THE_MIND_MAX_LEVEL}까지 모두 성공했습니다!`;
        } else {
          updates['gameState.status'] = 'level_cleared';
          updates['gameState.message'] = `레벨 ${state.level} 클리어! 방장이 다음 레벨을 눌러 주세요.`;
        }
      }
    } else {
      const newLives = state.lives - 1;
      updates['gameState.lives'] = newLives;
      updates['gameState.message'] = `타이밍 실패! 더 작은 수가 남아 있었습니다. 생명 -1`;

      if (newLives <= 0) {
        updates['gameState.status'] = 'gameover';
        updates['gameState.message'] = '게임 오버 — 생명이 모두 소진되었습니다.';
      } else {
        const correctedHands = {};
        Object.keys(newHands).forEach((uid) => {
          correctedHands[uid] = newHands[uid].filter((c) => c > card);
        });
        updates['gameState.hands'] = correctedHands;
      }
    }

    await updateDoc(roomRef, updates);
  };

  /** 수리검: 모두 동의 시 각자 패에서 가장 낮은 수 1장씩 버림 */
  const voteShuriken = async (actingUid = user.uid, rd = roomData) => {
    if (!rd || rd.gameState.status !== 'playing') return;
    const state = rd.gameState;
    const votes = new Set(state.shurikenVotes || []);
    votes.add(actingUid);
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode);
    const allUids = rd.players.map((p) => p.uid);
    if (votes.size < allUids.length || (state.shurikens || 0) < 1) {
      await updateDoc(roomRef, { 'gameState.shurikenVotes': [...votes] });
      return;
    }

    const correctedHands = { ...state.hands };
    allUids.forEach((uid) => {
      const h = correctedHands[uid];
      if (!h || h.length === 0) return;
      const minVal = Math.min(...h);
      const i = h.indexOf(minVal);
      correctedHands[uid] = [...h.slice(0, i), ...h.slice(i + 1)];
    });

    const remaining = Object.values(correctedHands).reduce((a, h) => a + h.length, 0);
    const nextVotes = [];
    const nextShurikens = (state.shurikens || 1) - 1;
    const patch = {
      'gameState.hands': correctedHands,
      'gameState.shurikenVotes': nextVotes,
      'gameState.shurikens': nextShurikens,
      'gameState.message': '수리검! 모두가 가장 낮은 카드를 한 장씩 버렸습니다.'
    };
    if (remaining === 0) {
      if (state.level >= THE_MIND_MAX_LEVEL) {
        patch['gameState.status'] = 'won';
        patch['gameState.message'] = `수리검으로 레벨을 마쳤습니다! 레벨 ${THE_MIND_MAX_LEVEL} 전체 클리어!`;
      } else {
        patch['gameState.status'] = 'level_cleared';
        patch['gameState.message'] = `수리검 후 레벨 ${state.level} 클리어!`;
      }
    }
    await updateDoc(roomRef, patch);
  };

  const nextLevelTheMind = async () => {
    const state = roomData.gameState;
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode);
    const newState = initTheMind(roomData.players, state.level + 1, state.lives, state.shurikens ?? 1);
    await updateDoc(roomRef, { gameState: newState });
  };

  // --- 우노: 첫 와일드 색 선택 ---
  const setInitialUnoColor = async (color, actingUid = user.uid, _rd = null) => {
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode);
    const snap = await getDoc(roomRef);
    if (!snap.exists()) return;
    const rd = snap.data();
    const state = rd.gameState;
    if (!state.needsInitialWildColor) return;
    const current = rd.players[state.turnIndex];
    if (current.uid !== actingUid) return;
    await updateDoc(roomRef, {
      'gameState.currentColor': color,
      'gameState.needsInitialWildColor': false,
      'gameState.message': `시작 색이 ${color}로 정해졌습니다.`
    });
  };

  const declareUno = async (actingUid = user.uid, _rd = roomData) => {
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode);
    const snap = await getDoc(roomRef);
    if (!snap.exists()) return;
    const rd = snap.data();
    const state = rd.gameState;
    const ud = { ...(state.unoDeclared || {}), [actingUid]: true };
    const dn = rd.players.find((p) => p.uid === actingUid)?.name ?? '플레이어';
    await updateDoc(roomRef, { 'gameState.unoDeclared': ud, 'gameState.message': `${dn}님이 UNO!를 외쳤습니다.` });
    playSfx('uno');
  };

  /** 다른 플레이어가 UNO를 안 외친 채 1장만 남겼을 때 도전 — 공식: 잡히면 2장 */
  const challengeUno = async (targetUid) => {
    const state = roomData.gameState;
    if (targetUid === user.uid) return;
    const hand = state.hands[targetUid];
    if (!hand || hand.length !== 1) return;
    if (state.unoDeclared?.[targetUid]) return alert('이미 UNO를 외친 플레이어입니다.');

    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode);
    let newDeck = [...state.deck];
    let newDiscard = [...state.discardPile];
    const rep = replenishDeck(newDeck, newDiscard);
    newDeck = rep.deck;
    newDiscard = rep.discardPile;
    const penalty = newDeck.splice(0, 2);
    const newHands = { ...state.hands, [targetUid]: [...state.hands[targetUid], ...penalty] };

    await updateDoc(roomRef, {
      'gameState.hands': newHands,
      'gameState.deck': newDeck,
      'gameState.discardPile': newDiscard,
      'gameState.message': `${roomData.players.find((p) => p.uid === user.uid).name}님이 도전 성공! ${roomData.players.find((p) => p.uid === targetUid).name}님이 2장 추가로 뽑습니다.`
    });
  };

  const playUnoCard = async (cardIndex, overrideColor = null, actingUid = user.uid, _rd = null) => {
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode);
    const snap = await getDoc(roomRef);
    if (!snap.exists()) return;
    const rd = snap.data();
    const state = rd.gameState;
    const currentPlayer = rd.players[state.turnIndex];
    const isSelfHuman = actingUid === user.uid;

    if (state.pendingWild4) {
      if (isSelfHuman) alert('Wild +4를 받거나 도전을 먼저 해결해 주세요.');
      return;
    }

    if (state.needsInitialWildColor) {
      if (isSelfHuman) alert('먼저 시작 색을 정해 주세요.');
      return;
    }

    if (currentPlayer.uid !== actingUid) {
      if (isSelfHuman) alert('지금은 당신의 차례가 아닙니다.');
      return;
    }

    const hand = state.hands[actingUid];
    const card = hand[cardIndex];
    const topCard = state.discardPile[state.discardPile.length - 1];

    if (state.drawPhase && state.drawPhase.uid === actingUid) {
      if (cardIndex !== state.drawPhase.cardIndex) {
        if (isSelfHuman) alert('방금 뽑은 카드만 낼 수 있습니다.');
        return;
      }
    }

    const isWild = card.color === 'black';
    if (!canPlayUnoCard(card, topCard, state.currentColor)) {
      if (isSelfHuman) alert('규칙상 낼 수 없는 카드입니다.');
      return;
    }

    if (isWild && !overrideColor) {
      if (isSelfHuman) setWildColorSelector({ cardIndex });
      return;
    }

    if (hand.length === 1 && !state.unoDeclared?.[actingUid]) {
      if (isSelfHuman) alert('마지막 한 장을 내기 전에 UNO! 버튼을 눌러 주세요.');
      return;
    }

    const othersBeforeWild = hand.filter((_, idx) => idx !== cardIndex);
    const wild4HadPlayableColor = card.value === 'wild4'
      ? othersBeforeWild.some((c) => c.color !== 'black' && c.color === state.currentColor)
      : false;

    const newHand = [...hand];
    newHand.splice(cardIndex, 1);

    let newDeck = [...state.deck];
    let newHands = { ...state.hands, [actingUid]: newHand };
    let newDiscardPile = [...state.discardPile, card];
    let newDirection = state.direction;
    let nextTurnDelta = 1;
    const newColor = isWild ? overrideColor : card.color;
    let message = `${currentPlayer.name}님이 카드를 냈습니다.`;
    const newUnoDeclared = { ...(state.unoDeclared || {}) };

    if (newHand.length === 1) newUnoDeclared[actingUid] = false;
    else newUnoDeclared[actingUid] = false;

    const n = rd.players.length;
    const nextIdx = (idx, delta = 1) => (idx + delta * newDirection + n * 16) % n;

    if (newHand.length === 0) {
      await updateDoc(roomRef, {
        'gameState.status': 'gameover',
        'gameState.hands': newHands,
        'gameState.discardPile': newDiscardPile,
        'gameState.drawPhase': null,
        'gameState.message': `${currentPlayer.name}님이 우승했습니다!`
      });
      return;
    }

    if (card.value === 'reverse') {
      newDirection *= -1;
      if (n === 2) nextTurnDelta = 2;
      message = '진행 방향이 반대로 바뀝니다.';
    } else if (card.value === 'skip') {
      nextTurnDelta = 2;
      message = '다음 플레이어 턴을 건너뜁니다.';
    } else if (card.value === 'draw2') {
      nextTurnDelta = 2;
      const targetIndex = nextIdx(state.turnIndex, 1);
      const targetUid = rd.players[targetIndex].uid;
      const rep = replenishDeck(newDeck, newDiscardPile);
      newDeck = rep.deck;
      newDiscardPile = rep.discardPile;
      const drawnCards = newDeck.splice(0, 2);
      newHands[targetUid] = [...newHands[targetUid], ...drawnCards];
      message = '다음 플레이어가 2장 먹고 턴을 건너뜁니다.';
    } else if (card.value === 'wild4') {
      const targetIndex = nextIdx(state.turnIndex, 1);
      const rep = replenishDeck(newDeck, newDiscardPile);
      newDeck = rep.deck;
      newDiscardPile = rep.discardPile;
      const fourCards = newDeck.splice(0, 4);
      const targetUid = rd.players[targetIndex].uid;
      const pendingWild4 = {
        victimUid: actingUid,
        targetUid,
        hadPlayableColor: wild4HadPlayableColor,
        fourCards,
        chosenColor: newColor
      };
      message = `Wild +4 — ${rd.players[targetIndex].name}님이 받기 또는 도전을 선택하세요.`;
      const newTurnIndexWild = targetIndex;

      const repFinal = replenishDeck(newDeck, newDiscardPile);
      newDeck = repFinal.deck;
      newDiscardPile = repFinal.discardPile;

      setWildColorSelector(null);

      await updateDoc(roomRef, {
        'gameState.hands': newHands,
        'gameState.deck': newDeck,
        'gameState.discardPile': newDiscardPile,
        'gameState.turnIndex': newTurnIndexWild,
        'gameState.direction': newDirection,
        'gameState.currentColor': newColor,
        'gameState.drawPhase': null,
        'gameState.unoDeclared': newUnoDeclared,
        'gameState.pendingWild4': pendingWild4,
        'gameState.message': message
      });
      return;
    }

    let newTurnIndex = nextIdx(state.turnIndex, nextTurnDelta);

    const repFinal = replenishDeck(newDeck, newDiscardPile);
    newDeck = repFinal.deck;
    newDiscardPile = repFinal.discardPile;

    setWildColorSelector(null);

    await updateDoc(roomRef, {
      'gameState.hands': newHands,
      'gameState.deck': newDeck,
      'gameState.discardPile': newDiscardPile,
      'gameState.turnIndex': newTurnIndex,
      'gameState.direction': newDirection,
      'gameState.currentColor': newColor,
      'gameState.drawPhase': null,
      'gameState.unoDeclared': newUnoDeclared,
      'gameState.pendingWild4': null,
      'gameState.message': message
    });
  };

  /** 공식: 한 장 뽑은 뒤 낼 수 있으면 그 카드만 낼 수 있고, 아니면 턴 종료 */
  const drawUnoCard = async (actingUid = user.uid, _rd = null) => {
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode);
    const snap = await getDoc(roomRef);
    if (!snap.exists()) return;
    const rd = snap.data();
    const state = rd.gameState;
    const currentPlayer = rd.players[state.turnIndex];
    const isSelfHuman = actingUid === user.uid;

    if (state.pendingWild4) {
      if (isSelfHuman) alert('Wild +4 처리를 먼저 해 주세요.');
      return;
    }
    if (state.needsInitialWildColor) return;
    if (currentPlayer.uid !== actingUid) {
      if (isSelfHuman) alert('지금은 당신의 차례가 아닙니다.');
      return;
    }
    if (state.drawPhase?.uid === actingUid) {
      if (isSelfHuman) alert('이미 카드를 뽑았습니다. 같은 카드를 내거나 턴을 넘기세요.');
      return;
    }

    let newDeck = [...state.deck];
    let newDiscardPile = [...state.discardPile];
    let rep = replenishDeck(newDeck, newDiscardPile);
    newDeck = rep.deck;
    newDiscardPile = rep.discardPile;

    if (newDeck.length === 0) {
      if (isSelfHuman) alert('낼 카드가 더 없습니다.');
      return;
    }

    const drawnCard = newDeck.shift();
    const newHands = { ...state.hands };
    newHands[actingUid] = [...newHands[actingUid], drawnCard];
    const topCard = newDiscardPile[newDiscardPile.length - 1];
    const idx = newHands[actingUid].length - 1;
    const playable = canPlayUnoCard(drawnCard, topCard, state.currentColor);

    if (playable) {
      await updateDoc(roomRef, {
        'gameState.hands': newHands,
        'gameState.deck': newDeck,
        'gameState.discardPile': newDiscardPile,
        'gameState.drawPhase': { uid: actingUid, cardIndex: idx },
        'gameState.message': '뽑은 카드를 낼 수 있습니다. 내려면 해당 카드를 누르고, 아니면 턴 넘기기를 누르세요.'
      });
    } else {
      const newTurnIndex = (state.turnIndex + state.direction + rd.players.length) % rd.players.length;
      await updateDoc(roomRef, {
        'gameState.hands': newHands,
        'gameState.deck': newDeck,
        'gameState.discardPile': newDiscardPile,
        'gameState.turnIndex': newTurnIndex,
        'gameState.drawPhase': null,
        'gameState.message': `${currentPlayer.name}님이 한 장 뽑고 턴을 넘깁니다.`
      });
    }
  };

  const passAfterDraw = async (actingUid = user.uid, _rd = null) => {
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode);
    const snap = await getDoc(roomRef);
    if (!snap.exists()) return;
    const rd = snap.data();
    const state = rd.gameState;
    if (state.pendingWild4) return;
    if (state.drawPhase?.uid !== actingUid) return;
    const newTurnIndex = (state.turnIndex + state.direction + rd.players.length) % rd.players.length;
    await updateDoc(roomRef, {
      'gameState.turnIndex': newTurnIndex,
      'gameState.drawPhase': null,
      'gameState.message': '턴을 넘겼습니다.'
    });
  };

  /** Wild +4: 다음 플레이어가 4장을 받기로 함 (뽑기 전 도전 규칙 반영) */
  const acceptWild4Pending = async (actingUid = user.uid, _rd = null) => {
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode);
    const snap = await getDoc(roomRef);
    if (!snap.exists()) return;
    const rd = snap.data();
    const state = rd.gameState;
    const p = state.pendingWild4;
    if (!p || p.targetUid !== actingUid) return;
    const n = rd.players.length;
    const ti = rd.players.findIndex((x) => x.uid === p.targetUid);
    const newHands = { ...state.hands };
    newHands[p.targetUid] = [...newHands[p.targetUid], ...p.fourCards];
    const newTurnIndex = (ti + state.direction + n * 8) % n;
    await updateDoc(roomRef, {
      'gameState.hands': newHands,
      'gameState.pendingWild4': null,
      'gameState.turnIndex': newTurnIndex,
      'gameState.message': '4장을 받았습니다. 턴이 넘어갑니다.'
    });
  };

  /**
   * Wild +4 도전: 낸 사람이 현재 선언 색과 같은 색 카드를 낼 수 있었는지(hadPlayableColor)에 따라
   * 성공 시 낸 사람이 4장, 실패 시 도전자가 4장+추가 2장(공식 변형에 맞춘 패널티)
   */
  const challengeWild4Pending = async (actingUid = user.uid, _rd = null) => {
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode);
    const snap = await getDoc(roomRef);
    if (!snap.exists()) return;
    const rd = snap.data();
    const state = rd.gameState;
    const p = state.pendingWild4;
    if (!p || p.targetUid !== actingUid) return;
    const n = rd.players.length;
    const ti = rd.players.findIndex((x) => x.uid === p.targetUid);
    let newDeck = [...state.deck];
    let newDiscardPile = [...state.discardPile];
    let newHands = { ...state.hands };
    let msg = '';

    if (p.hadPlayableColor) {
      newHands[p.victimUid] = [...newHands[p.victimUid], ...p.fourCards];
      msg = '도전 성공! Wild +4를 낸 플레이어가 4장을 가져갑니다.';
    } else {
      newHands[p.targetUid] = [...newHands[p.targetUid], ...p.fourCards];
      const rep = replenishDeck(newDeck, newDiscardPile);
      newDeck = rep.deck;
      newDiscardPile = rep.discardPile;
      const extra = newDeck.splice(0, 2);
      newHands[p.targetUid] = [...newHands[p.targetUid], ...extra];
      msg = '도전 실패! 도전자가 추가 2장을 더 뽑습니다.';
    }

    const newTurnIndex = (ti + state.direction + n * 8) % n;
    const repF = replenishDeck(newDeck, newDiscardPile);
    newDeck = repF.deck;
    newDiscardPile = repF.discardPile;

    await updateDoc(roomRef, {
      'gameState.hands': newHands,
      'gameState.deck': newDeck,
      'gameState.discardPile': newDiscardPile,
      'gameState.pendingWild4': null,
      'gameState.turnIndex': newTurnIndex,
      'gameState.message': msg
    });
  };

  const backToLobby = async () => {
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode);
    await updateDoc(roomRef, { status: 'lobby', game: 'none', gameState: {} });
  };

  useEffect(() => {
    lastMindCelebrateKeyRef.current = null;
  }, [roomCode]);

  /** 레벨 클리어·전체 클리어 시 축하 컨페티 */
  useEffect(() => {
    if (!roomData || roomData.game !== 'themind') return;
    const st = roomData.gameState;
    if (!st) return;
    if (st.status !== 'level_cleared' && st.status !== 'won') return;
    const key = `${roomCode}-${st.status}-${st.level ?? 0}`;
    if (lastMindCelebrateKeyRef.current === key) return;
    lastMindCelebrateKeyRef.current = key;
    const t = window.setTimeout(() => {
      triggerMindLevelConfetti(mindCelebrationRef.current);
    }, 60);
    return () => window.clearTimeout(t);
  }, [roomCode, roomData?.game, roomData?.gameState?.status, roomData?.gameState?.level]);

  /** 첫 번째 인간 플레이어 화면에서만: AI 턴을 한 곳에서만 실행해 충돌을 줄입니다. */
  useEffect(() => {
    if (!roomCode || !user?.uid || !roomData) return;
    if (roomData.status !== 'playing') return;
    const firstHuman = roomData.players?.find((p) => !p.isAi);
    if (!firstHuman || firstHuman.uid !== user.uid) return;

    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode);

    const clearAiTimers = () => {
      if (hostAiTimerRef.current) {
        clearTimeout(hostAiTimerRef.current);
        hostAiTimerRef.current = null;
      }
      if (mindAiDelayRef.current) {
        clearTimeout(mindAiDelayRef.current);
        mindAiDelayRef.current = null;
      }
    };

    clearAiTimers();

    const aiBootDelayMs = roomData?.game === 'uno' ? 420 : 100;

    hostAiTimerRef.current = setTimeout(async () => {
      hostAiTimerRef.current = null;
      const snap = await getDoc(roomRef);
      if (!snap.exists()) return;
      let rd = snap.data();
      if (rd.status !== 'playing') return;
      const state = rd.gameState;
      if (!state || state.status !== 'playing') return;

      if (rd.game === 'themind') {
        /* AI는 인간 패를 보지 않고 자신의 최소 카드만 내려 시도. 대기 시간은 카드 숫자(1~100)에 비례(최대 20초). */
        const aiWithHand = rd.players.filter((p) => p.isAi && (state.hands[p.uid]?.length ?? 0) > 0);
        if (aiWithHand.length > 0) {
          const pick = aiWithHand[Math.floor(Math.random() * aiWithHand.length)];
          const h = state.hands[pick.uid];
          const myMin = Math.min(...h);
          const humansWithCards = rd.players.some((p) => !p.isAi && (state.hands[p.uid]?.length ?? 0) > 0);
          const onlyAiHaveCards = !humansWithCards && aiWithHand.length > 0;
          let delayMs = getTheMindAiPlayDelayMs(myMin);
          if ((state.playedCards?.length ?? 0) === 0) delayMs += THE_MIND_LEVEL_START_GRACE_MS;
          if (onlyAiHaveCards) {
            delayMs = Math.min(THE_MIND_ONLY_AI_DELAY_CAP_MS, 70 + Math.round((myMin / 100) * 150));
          }
          mindAiDelayRef.current = setTimeout(async () => {
            mindAiDelayRef.current = null;
            const snap2 = await getDoc(roomRef);
            if (!snap2.exists()) return;
            const rd2 = snap2.data();
            if (rd2.status !== 'playing' || rd2.game !== 'themind') return;
            const st2 = rd2.gameState;
            if (!st2 || st2.status !== 'playing') return;
            await playTheMindCard(myMin, pick.uid, rd2);
          }, delayMs);
          return;
        }
        if ((state.shurikens || 0) > 0) {
          for (let step = 0; step < 8; step++) {
            const s2 = await getDoc(roomRef);
            rd = s2.data();
            if (!rd || rd.status !== 'playing' || rd.game !== 'themind') return;
            const st = rd.gameState;
            const votes = new Set(st.shurikenVotes || []);
            const nextAi = rd.players.find((p) => p.isAi && !votes.has(p.uid));
            if (!nextAi) break;
            await voteShuriken(nextAi.uid, rd);
          }
        }
        return;
      }

      if (rd.game === 'uno') {
        await sleep(UNO_AI_STEP_DELAY_MS);
        const snapU = await getDoc(roomRef);
        if (!snapU.exists()) return;
        rd = snapU.data();
        if (rd.status !== 'playing' || rd.game !== 'uno') return;
        let stateU = rd.gameState;
        if (!stateU || stateU.status !== 'playing') return;

        const cur = rd.players[stateU.turnIndex];
        if (!cur?.isAi) return;

        if (stateU.needsInitialWildColor) {
          await sleep(400);
          const pick = COLORS[Math.floor(Math.random() * COLORS.length)];
          await setInitialUnoColor(pick, cur.uid);
          return;
        }

        if (stateU.pendingWild4?.targetUid === cur.uid) {
          await sleep(500);
          await acceptWild4Pending(cur.uid);
          return;
        }

        let hand = stateU.hands[cur.uid];
        const topCard = stateU.discardPile[stateU.discardPile.length - 1];

        if (stateU.drawPhase?.uid === cur.uid) {
          await sleep(UNO_AI_STEP_DELAY_MS);
          const idx = findBeginnerUnoPlayIndex(hand, topCard, stateU.currentColor, stateU.drawPhase);
          if (idx >= 0) {
            const card = hand[idx];
            const wildColor = card.color === 'black' ? pickUnoWildColorForAi(hand, idx) : null;
            await playUnoCard(idx, wildColor, cur.uid);
          } else {
            await passAfterDraw(cur.uid);
          }
          return;
        }

        if (hand?.length === 1 && !stateU.unoDeclared?.[cur.uid]) {
          await declareUno(cur.uid);
          await sleep(UNO_AI_AFTER_DECLARE_MS);
          const snapAfter = await getDoc(roomRef);
          if (!snapAfter.exists()) return;
          const rdA = snapAfter.data();
          if (rdA.status !== 'playing' || rdA.game !== 'uno') return;
          const stA = rdA.gameState;
          if (!stA || stA.status !== 'playing') return;
          const curA = rdA.players[stA.turnIndex];
          if (!curA?.isAi || curA.uid !== cur.uid) return;
          hand = stA.hands[cur.uid];
          const topA = stA.discardPile[stA.discardPile.length - 1];
          const idxA = findBeginnerUnoPlayIndex(hand, topA, stA.currentColor, stA.drawPhase);
          if (idxA >= 0) {
            const card = hand[idxA];
            const wildColor = card.color === 'black' ? pickUnoWildColorForAi(hand, idxA) : null;
            await playUnoCard(idxA, wildColor, cur.uid);
          }
          return;
        }

        const idx = findBeginnerUnoPlayIndex(hand, topCard, stateU.currentColor, null);
        if (idx >= 0) {
          await sleep(UNO_AI_STEP_DELAY_MS);
          const card = hand[idx];
          const wildColor = card.color === 'black' ? pickUnoWildColorForAi(hand, idx) : null;
          await playUnoCard(idx, wildColor, cur.uid);
          return;
        }

        await sleep(UNO_AI_STEP_DELAY_MS);
        await drawUnoCard(cur.uid);
      }
    }, aiBootDelayMs);

    return () => {
      clearAiTimers();
    };
  }, [roomData, roomCode, user?.uid]);

  const muteFab = (
    <button
      type="button"
      className="fixed bottom-4 right-4 z-[200] flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-black/75 text-xl shadow-lg backdrop-blur-sm transition hover:bg-zinc-900/95"
      onClick={() => {
        resumeAudioContext();
        toggleAudioMute();
      }}
      aria-label={audioMuted ? '배경음 켜기' : '배경음 끄기'}
      title={audioMuted ? '소리 켜기' : '소리 끄기'}
    >
      {audioMuted ? '🔇' : '🔊'}
    </button>
  );

  if (loading) {
    return (
      <div className="nf-root nf-page-bg min-h-screen flex items-center justify-center text-stone-200">
        {muteFab}
        <div className="text-center px-4">
          <div className="nf-red-bar mx-auto mb-6 w-24" />
          <div className="nf-title text-4xl sm:text-5xl text-white mb-2">BOARD GAME WORLD</div>
          <div className="text-sm text-stone-400">불러오는 중…</div>
        </div>
      </div>
    );
  }

  if (!userName && !roomData) {
    return (
      <div className="nf-root nf-page-bg min-h-screen flex flex-col items-center justify-center p-4 text-stone-100">
        {muteFab}
        <div className="nf-panel w-full max-w-md rounded-xl p-8">
          <div className="nf-red-bar mb-6" />
          <div className="text-center mb-6">
            <p className="text-xs uppercase tracking-[0.4em] text-red-500/90 mb-2">TABLETOP</p>
            <h1 className="nf-title text-4xl text-white">보드게임 월드</h1>
            <p className="text-sm text-stone-400 mt-2">더 마인드 · 우노를 같은 테이블에서 즐기세요.</p>
          </div>
          <p className="text-stone-300 text-sm mb-4 text-center">다른 플레이어에게 보일 닉네임을 입력하세요.</p>
          <input
            type="text"
            className="w-full p-3 rounded-lg mb-4 text-center text-lg bg-zinc-900/90 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-red-600/70"
            placeholder="이름 (예: 민수)"
            onKeyDown={(e) => {
              if (e.key === 'Enter') setUserName(e.target.value);
            }}
            onBlur={(e) => setUserName(e.target.value)}
          />
          <p className="text-xs text-stone-500 text-center">엔터 또는 입력란 밖을 누르면 저장됩니다.</p>
        </div>
      </div>
    );
  }

  if (!roomCode || !roomData) {
    return (
      <div className="nf-root nf-page-bg min-h-screen flex flex-col items-center justify-center p-4 text-stone-100">
        {muteFab}
        <div className="nf-panel w-full max-w-md rounded-xl p-8">
          <div className="nf-red-bar mb-6" />
          <h2 className="nf-title text-3xl text-center text-white mb-6">환영합니다, {userName}님</h2>
          <div className="space-y-6">
            <button
              onClick={handleCreateRoom}
              className="nf-btn-primary w-full py-4 rounded-lg font-semibold text-white"
            >
              새 테이블 열기
            </button>
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-white/10" />
              <span className="flex-shrink-0 mx-4 text-stone-500 text-sm">또는 입장</span>
              <div className="flex-grow border-t border-white/10" />
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                className="flex-1 p-3 rounded-lg text-center font-mono text-xl uppercase bg-zinc-900/90 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-red-600/60"
                placeholder="코드 4자"
                maxLength={4}
              />
              <button onClick={handleJoinRoom} className="nf-btn-primary px-6 rounded-lg font-semibold text-white shrink-0">
                입장
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (roomData.status === 'lobby') {
    const isHost = roomData.players.find((p) => p.uid === user.uid)?.isHost;
    return (
      <div className="nf-root nf-page-bg min-h-screen p-4 flex flex-col items-center text-stone-100">
        {muteFab}
        <div className="nf-panel w-full max-w-3xl mt-6 rounded-xl overflow-hidden">
          <div className="nf-red-bar" />
          <div className="p-6 flex flex-wrap justify-between items-center gap-4 border-b border-white/5">
            <h2 className="nf-title text-3xl text-white tracking-wide">로비</h2>
            <div className="px-5 py-2 rounded-lg font-mono text-xl tracking-[0.2em] border border-red-600/40 bg-black/40 text-red-100">
              {roomData.code}
            </div>
          </div>
          <div className="p-6">
            <h3 className="font-semibold text-stone-300 mb-3">착석한 플레이어 ({roomData.players.length}명)</h3>
            <ul className="flex flex-wrap gap-2 mb-4">
              {roomData.players.map((p) => (
                <li key={p.uid} className="bg-stone-900/70 border border-amber-900/40 px-3 py-2 rounded-lg flex items-center gap-2 text-sm">
                  {p.isHost && <span className="text-amber-400">★</span>}
                  {p.isAi && (
                    <span className="text-sky-300" title="초보 AI">
                      🤖
                    </span>
                  )}
                  {p.name}
                  {p.uid === user.uid && <span className="text-stone-500">(나)</span>}
                </li>
              ))}
            </ul>
            {isHost && (
              <div className="flex flex-wrap gap-2 mb-8 justify-center sm:justify-start">
                <button
                  type="button"
                  onClick={handleAddAiPlayer}
                  disabled={roomData.players.length >= MAX_TABLE_PLAYERS}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-sky-900/40 border border-sky-500/40 text-sky-100 hover:bg-sky-800/50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  초보 AI 추가
                </button>
                <button
                  type="button"
                  onClick={handleRemoveAiPlayer}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-stone-800/90 border border-stone-600 text-stone-300 hover:bg-stone-700"
                >
                  AI 한 명 제거
                </button>
              </div>
            )}
            {!isHost && <div className="mb-6" />}
            {isHost ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => handleStartGame('themind')}
                  className="text-left rounded-xl border border-indigo-400/30 transition hover:scale-[1.02] overflow-hidden flex flex-col sm:flex-row"
                  style={{ background: 'linear-gradient(145deg, #312e81 0%, #1e1b4b 100%)' }}
                >
                  <div
                    className="h-36 sm:w-44 sm:min-h-[140px] shrink-0 flex items-center justify-center border-b sm:border-b-0 sm:border-r border-indigo-500/25"
                    style={{
                      background:
                        'radial-gradient(circle at 35% 25%, rgba(165,180,252,0.45), transparent 50%), linear-gradient(165deg, #3730a3 0%, #1e1b4b 100%)'
                    }}
                    aria-hidden
                  >
                    <div className="flex gap-1.5 items-end justify-center px-3">
                      <span className="w-9 h-14 rounded-md bg-white/95 shadow-lg text-indigo-950 font-black text-xl flex items-center justify-center -rotate-6 border border-white/40">
                        1
                      </span>
                      <span className="w-9 h-14 rounded-md bg-white/95 shadow-lg text-indigo-950 font-black text-xl flex items-center justify-center translate-y-1 border border-white/40">
                        2
                      </span>
                      <span className="w-9 h-14 rounded-md bg-white/95 shadow-lg text-indigo-950 font-black text-xl flex items-center justify-center rotate-6 border border-white/40">
                        3
                      </span>
                    </div>
                  </div>
                  <div className="p-5 sm:p-6 flex flex-col justify-center">
                    <h3 className="text-lg font-serif font-bold text-indigo-100 mb-2">더 마인드</h3>
                    <p className="text-sm text-indigo-200/90 leading-relaxed">
                      말 없이 1부터 순서대로. 실패 시 낮은 카드가 사라지고 생명이 줄어듭니다. 수리검으로 한 번에 맞출 수도 있습니다.
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleStartGame('uno')}
                  className="text-left rounded-xl border border-red-500/30 transition hover:scale-[1.02] overflow-hidden flex flex-col sm:flex-row"
                  style={{ background: 'linear-gradient(145deg, #7f1d1d 0%, #450a0a 100%)' }}
                >
                  <div
                    className="h-36 sm:w-44 sm:min-h-[140px] shrink-0 flex items-center justify-center border-b sm:border-b-0 sm:border-r border-red-500/25"
                    style={{
                      background:
                        'radial-gradient(circle at 50% 30%, rgba(252,165,165,0.35), transparent 55%), linear-gradient(165deg, #991b1b 0%, #450a0a 100%)'
                    }}
                    aria-hidden
                  >
                    <div className="flex -space-x-3 rotate-[-8deg]">
                      <span className="w-10 h-14 rounded-md bg-red-600 shadow-lg border-2 border-white/30 flex items-center justify-center text-white font-black text-lg">7</span>
                      <span className="w-10 h-14 rounded-md bg-blue-600 shadow-lg border-2 border-white/30 flex items-center justify-center text-white font-black text-lg z-10">4</span>
                      <span className="w-10 h-14 rounded-md bg-emerald-600 shadow-lg border-2 border-white/30 flex items-center justify-center text-white font-black text-lg">★</span>
                    </div>
                  </div>
                  <div className="p-5 sm:p-6 flex flex-col justify-center">
                    <h3 className="text-lg font-serif font-bold text-red-100 mb-2">우노</h3>
                    <p className="text-sm text-red-200/90 leading-relaxed">
                      색·숫자 맞추기, 스킵·리버스·드로우, 와일드. 한 장 남으면 UNO!를 외치세요.
                    </p>
                  </div>
                </button>
              </div>
            ) : (
              <div className="text-center p-8 rounded-xl bg-stone-900/50 border border-stone-700 text-stone-400">방장이 게임을 고르는 중입니다…</div>
            )}
            <div className="mt-8 text-center">
              <button onClick={handleLeaveRoom} className="text-stone-500 hover:text-red-400 text-sm underline">
                테이블 나가기
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (roomData.status === 'playing' && roomData.game === 'themind') {
    const state = roomData.gameState;
    const myHand = state.hands[user.uid] || [];
    const isHost = roomData.players.find((p) => p.uid === user.uid)?.isHost;
    const votes = new Set(state.shurikenVotes || []);
    const voted = votes.has(user.uid);
    const allVotedReady = roomData.players.every((p) => votes.has(p.uid));

    return (
      <div
        className="nf-root min-h-[100dvh] flex flex-col text-stone-100 px-2 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-5 relative"
        style={tableStyle}
      >
        {muteFab}
        <div
          ref={mindCelebrationRef}
          className="fixed inset-0 z-[85] pointer-events-none overflow-hidden"
          aria-hidden
        />
        {(state.status === 'level_cleared' || state.status === 'won') && (
          <div className="fixed inset-0 z-[82] pointer-events-none flex flex-col items-center justify-start sm:justify-center pt-[20vh] sm:pt-0 px-4">
            <div className="text-center drop-shadow-[0_4px_24px_rgba(0,0,0,0.85)]">
              <p className="text-3xl sm:text-5xl font-black text-amber-200 font-serif tracking-tight">
                {state.status === 'won' ? '전체 클리어!' : `레벨 ${state.level} 클리어!`}
              </p>
              <p className="mt-3 text-lg sm:text-2xl text-emerald-100 font-semibold">축하합니다!</p>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 px-2 sm:px-4 py-3 rounded-xl border border-white/10 bg-black/35 backdrop-blur-sm">
          <div className="flex flex-wrap justify-between items-center gap-2">
            <div className="nf-title text-xl sm:text-2xl text-indigo-200 tracking-wide">THE MIND</div>
            <button
              type="button"
              onClick={handleLeaveGameAsAi}
              className="min-h-[44px] shrink-0 px-4 py-2.5 rounded-xl text-sm font-medium bg-stone-900/80 border border-red-800/50 text-red-200 hover:bg-red-950/50 active:scale-[0.99] w-full sm:w-auto max-sm:order-last"
            >
              게임 중 나가기 → AI가 이어감
            </button>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3 text-xs sm:text-sm">
            <span className="px-3 py-1.5 rounded-lg bg-black/30 border border-emerald-800/60">
              레벨 <strong className="text-amber-300">{state.level}</strong> / {THE_MIND_MAX_LEVEL}
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-black/30 border border-emerald-800/60">
              생명 {state.lives > 0 ? '❤️'.repeat(state.lives) : '—'}
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-black/30 border border-emerald-800/60">
              수리검 {state.shurikens ?? 1}
            </span>
          </div>
        </div>

        <div className="text-center my-3 px-2 text-sm text-emerald-100/90 min-h-[2.5rem] leading-snug">{state.message}</div>

        <div className="flex-1 flex flex-col items-center justify-center mb-6">
          <div
            className="relative w-52 h-64 sm:w-60 sm:h-72 rounded-2xl flex items-center justify-center border-4 border-dashed border-emerald-600/50"
            style={{ background: 'rgba(0,0,0,0.2)', boxShadow: 'inset 0 0 40px rgba(0,0,0,0.25)' }}
          >
            {state.playedCards.length > 0 ? (
              <span className="text-6xl sm:text-7xl font-black text-white drop-shadow-lg">{state.playedCards[state.playedCards.length - 1]}</span>
            ) : (
              <span className="text-emerald-300/70 text-center text-sm px-4">여기에 카드가 쌓입니다</span>
            )}
            <span className="absolute -bottom-9 text-emerald-200/80 text-xs">총 {state.playedCards.length}장</span>
          </div>

          {state.status === 'playing' && state.shurikens > 0 && (
            <div className="mt-14 flex flex-col items-center gap-2">
              <p className="text-xs text-emerald-200/80 text-center max-w-sm">
                수리검: 모두 동의하면 각자 패에서 <strong className="text-amber-200">가장 낮은 숫자 1장</strong>을 버립니다.
              </p>
              <button
                type="button"
                onClick={voteShuriken}
                disabled={voted}
                className={`px-5 py-2 rounded-full text-sm font-semibold border ${voted ? 'opacity-50 border-stone-600' : 'border-amber-500/80 bg-amber-900/40 hover:bg-amber-800/50'}`}
              >
                {voted ? '동의함' : '수리검 사용에 동의'}
              </button>
              <span className="text-[11px] text-stone-400">
                동의 {votes.size}/{roomData.players.length}
                {allVotedReady && state.shurikens > 0 && ' → 자동 실행'}
              </span>
            </div>
          )}

          {state.status === 'level_cleared' && isHost && (
            <button
              type="button"
              onClick={nextLevelTheMind}
              className="mt-8 px-8 py-3 rounded-full font-bold text-stone-900"
              style={{ background: 'linear-gradient(180deg, #86efac 0%, #22c55e 100%)' }}
            >
              다음 레벨
            </button>
          )}
          {(state.status === 'gameover' || state.status === 'won') && isHost && (
            <button type="button" onClick={backToLobby} className="mt-8 px-8 py-3 rounded-full font-bold bg-stone-200 text-stone-900">
              로비로
            </button>
          )}
        </div>

        <div className="flex justify-center gap-3 mb-4 flex-wrap">
          {roomData.players
            .filter((p) => p.uid !== user.uid)
            .map((p) => (
              <div key={p.uid} className="text-xs text-center px-3 py-2 rounded-lg bg-black/35 border border-emerald-900/40">
                <div className="text-emerald-100/90 mb-1 flex items-center justify-center gap-1">
                  {p.isAi && <span title="AI">🤖</span>}
                  <span>{p.name}</span>
                </div>
                <div>남은 카드 {state.hands[p.uid]?.length ?? 0}</div>
              </div>
            ))}
        </div>

        <div className="mt-auto rounded-t-3xl border-t border-emerald-800/50 p-3 sm:p-5 bg-black/35">
          <p className="text-center text-emerald-200/80 text-[11px] sm:text-xs mb-3 sm:mb-4 px-1">
            내 패 — 전체 중 지금 낼 수 있는 건 가장 작은 수뿐입니다 (말·신호 금지).
          </p>
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 max-h-[40vh] overflow-y-auto overscroll-contain pb-1">
            {myHand.map((card, idx) => (
              <button
                key={`${card}-${idx}`}
                type="button"
                onClick={() => playTheMindCard(card)}
                disabled={state.status !== 'playing'}
                className="min-w-[3.5rem] w-[22vw] max-w-[4.5rem] h-24 sm:w-[4.5rem] sm:h-32 rounded-xl flex items-center justify-center text-xl sm:text-2xl font-black text-stone-900 shadow-lg border-2 border-white/30 transition active:scale-95 sm:hover:-translate-y-1 disabled:opacity-40 disabled:hover:translate-y-0 touch-manipulation"
                style={{ background: 'linear-gradient(145deg, #faf8f5 0%, #e8e0d5 100%)' }}
              >
                {card}
              </button>
            ))}
            {myHand.length === 0 && <span className="text-emerald-300/60 h-24 flex items-center">이 레벨에서 패가 없습니다.</span>}
          </div>
        </div>
      </div>
    );
  }

  if (roomData.status === 'playing' && roomData.game === 'uno') {
    const state = roomData.gameState;
    const myHand = state.hands[user.uid] || [];
    const isHost = roomData.players.find((p) => p.uid === user.uid)?.isHost;
    const isMyTurn = roomData.players[state.turnIndex]?.uid === user.uid;
    const topCard = state.discardPile[state.discardPile.length - 1];
    const colorKo = { red: '빨강', blue: '파랑', green: '초록', yellow: '노랑' };

    const getCardFace = (card) => {
      let displayValue = card.value;
      if (card.value === 'skip') displayValue = '✕';
      if (card.value === 'reverse') displayValue = '⇄';
      if (card.value === 'draw2') displayValue = '+2';
      if (card.value === 'wild') displayValue = '★';
      if (card.value === 'wild4') displayValue = '+4';
      return displayValue;
    };

    const getCardStyle = (card) => {
      const base = 'rounded-xl flex flex-col items-center justify-center text-white font-black shadow-lg border-2 border-white/25 transition-transform ';
      const size = 'w-14 h-20 sm:w-[4.75rem] sm:h-[7rem] text-lg sm:text-2xl ';
      const colors = {
        red: 'bg-red-600 ',
        blue: 'bg-blue-600 ',
        green: 'bg-emerald-600 ',
        yellow: 'bg-yellow-400 text-stone-900 border-stone-800/20 ',
        black: 'bg-gradient-to-br from-gray-800 to-gray-950 '
      };
      return base + size + (colors[card.color] || colors.black);
    };

    return (
      <div
        className={`nf-root min-h-[100dvh] flex flex-col px-2 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-5 text-stone-100 ${unoShake ? `uno-screen-shake-${unoShake}` : ''}`}
        style={tableStyle}
      >
        {muteFab}
        {unoBattleBanner && (
          <div
            className="uno-battle-banner pointer-events-none fixed top-12 sm:top-14 left-1/2 z-[90] max-w-[min(94vw,26rem)] -translate-x-1/2 rounded-xl border border-amber-400/45 bg-gradient-to-b from-zinc-900/98 to-black/92 px-4 py-2.5 text-center text-sm font-bold leading-snug text-amber-100 shadow-[0_8px_40px_rgba(0,0,0,0.85),0_0_24px_rgba(251,191,36,0.15)]"
            role="status"
          >
            {unoBattleBanner}
          </div>
        )}
        <div className="nf-red-bar mb-3 max-w-xs opacity-80" />
        <div className="flex flex-col sm:flex-row sm:flex-wrap justify-between items-stretch gap-2 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="nf-title text-lg sm:text-xl text-white tracking-wide pr-2">UNO</div>
            <div className="text-xs sm:text-sm px-3 py-2 rounded-lg bg-black/45 border border-white/10">
              방향: {state.direction === 1 ? '시계 →' : '반시계 ←'}
            </div>
            {isHost && (
              <button
                type="button"
                onClick={backToLobby}
                className="text-xs px-3 py-2 rounded-lg border border-stone-600 text-stone-400 hover:text-amber-200 min-h-[44px]"
              >
                방장: 로비로
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={handleLeaveGameAsAi}
            className="min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-medium bg-stone-900/80 border border-red-800/50 text-red-200 hover:bg-red-950/50 active:scale-[0.99] w-full sm:w-auto sm:max-w-xs"
          >
            게임 중 나가기 → AI가 이어감
          </button>
        </div>

        <div
          className={`mb-2 h-1.5 rounded-full overflow-hidden mx-1 ${state.direction === 1 ? 'uno-dir-flow' : 'uno-dir-flow uno-dir-flow-ccw'}`}
          title={state.direction === 1 ? '턴 진행: 시계 방향' : '턴 진행: 반시계 방향'}
          aria-hidden
        />

        <div className="flex justify-center gap-2 mb-3 sm:mb-4 overflow-x-auto pb-2 -mx-1 px-1">
          {roomData.players.map((p, i) => (
            <div
              key={p.uid}
              className={`relative flex-shrink-0 px-3 py-2 rounded-xl text-center min-w-[5.5rem] border transition-[transform,box-shadow] duration-200 ${
                i === state.turnIndex ? 'border-red-500 bg-red-600/25 text-red-100 scale-105 shadow-[0_0_20px_rgba(229,9,20,0.25)]' : 'border-white/10 bg-black/30 text-stone-300'
              } ${unoBattleFlash?.from === i ? 'uno-player-battle-from z-[2]' : ''} ${
                unoBattleFlash?.to === i ? 'uno-player-battle-to z-[2]' : ''
              } ${unoTurnPulseIndex === i ? 'uno-turn-whoosh z-[2]' : ''}`}
            >
              <div className="text-xs font-semibold truncate max-w-[6rem] flex items-center justify-center gap-1">
                {p.isAi && <span title="AI">🤖</span>}
                <span>{p.name}</span>
              </div>
              <div className="text-[11px] opacity-90">{state.hands[p.uid]?.length}장</div>
              {p.uid !== user.uid && state.hands[p.uid]?.length === 1 && !state.unoDeclared?.[p.uid] && (
                <button type="button" className="mt-1 text-[10px] text-red-300 underline" onClick={() => challengeUno(p.uid)}>
                  UNO 도전
                </button>
              )}
            </div>
          ))}
        </div>

        {state.status === 'playing' && unoHint && (
          <div className="uno-hint-pop mx-auto mb-3 max-w-lg rounded-lg px-4 py-3 text-center shadow-lg">
            <p className="text-sm font-semibold leading-snug text-white">{unoHint.message}</p>
          </div>
        )}

        {state.needsInitialWildColor && roomData.players[state.turnIndex]?.uid === user.uid && (
          <div
            className={`mb-4 p-4 rounded-xl bg-black/55 border text-center ${
              unoHint?.highlight === 'colors' ? 'hint-ring border-red-500/60' : 'border-white/10'
            }`}
          >
            <p className="text-sm text-stone-100 mb-3">첫 카드가 와일드입니다. 시작 색을 고르세요.</p>
            <div className="flex flex-wrap justify-center gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setInitialUnoColor(c)}
                  className={`w-16 h-16 rounded-xl border-2 border-white/30 ${c === 'red' ? 'bg-red-600' : c === 'blue' ? 'bg-blue-600' : c === 'green' ? 'bg-emerald-600' : 'bg-yellow-400'}`}
                  aria-label={colorKo[c]}
                />
              ))}
            </div>
          </div>
        )}

        <div className="text-center text-sm text-stone-300/95 mb-4 min-h-[2rem] px-2">{state.message}</div>

        <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-8 mb-4 sm:mb-6">
          <div
            className={`flex flex-col items-center ${unoHint?.highlight === 'deck' ? 'hint-ring p-2 rounded-2xl' : ''}`}
          >
            <button
              type="button"
              onClick={() => drawUnoCard()}
              disabled={!isMyTurn || state.status !== 'playing' || state.needsInitialWildColor || !!state.pendingWild4}
              className="w-[5.5rem] h-[8.5rem] sm:w-24 sm:h-36 rounded-xl border-4 border-white flex flex-col items-center justify-center shadow-xl transition active:scale-95 sm:hover:scale-105 disabled:opacity-40 touch-manipulation min-h-[120px]"
              style={{ background: 'linear-gradient(145deg, #dc2626 0%, #991b1b 100%)' }}
            >
              <span className="text-amber-200 font-black text-xl -rotate-12" style={{ fontFamily: 'Georgia, serif' }}>
                UNO
              </span>
            </button>
            <span className="text-[11px] text-stone-400 mt-2">덱에서 뽑기</span>
          </div>

          <div className="flex flex-col items-center relative">
            <div className="absolute -top-10 whitespace-nowrap text-xs font-semibold bg-black/70 px-3 py-1 rounded-full border border-red-900/50 text-red-100/95">
              현재 색: {colorKo[state.currentColor] || state.currentColor}
            </div>
            <div key={discardSlamKey} className={getCardStyle(topCard) + ' pointer-events-none uno-discard-slam'}>
              <span>{getCardFace(topCard)}</span>
            </div>
            <span className="mt-2 text-[10px] uppercase tracking-[0.2em] text-amber-200/70">플레이 존</span>
          </div>
        </div>

        {state.pendingWild4 && state.pendingWild4.targetUid === user.uid && (
          <div
            className={`flex flex-col sm:flex-row justify-center items-center gap-3 mb-4 p-4 rounded-xl bg-zinc-950/80 border ${
              unoHint?.highlight === 'wild4' ? 'hint-ring border-red-500/70' : 'border-red-900/40'
            }`}
          >
            <p className="text-sm text-amber-100 text-center">Wild +4 — 4장을 받거나, 상대가 블러프였는지 도전하세요.</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => acceptWild4Pending()}
                className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-sm font-semibold"
              >
                4장 받기
              </button>
              <button
                type="button"
                onClick={() => challengeWild4Pending()}
                className="px-4 py-2 rounded-lg bg-red-800 hover:bg-red-700 text-sm font-semibold"
              >
                도전
              </button>
            </div>
          </div>
        )}

        <div className="mt-auto rounded-t-3xl border-t border-white/10 p-3 sm:p-4 bg-black/50 backdrop-blur-sm">
          <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
            <span className="text-sm font-semibold text-stone-100">내 패 ({myHand.length}장)</span>
            {isMyTurn && <span className="text-red-400 text-sm font-semibold animate-pulse">내 차례</span>}
          </div>

          {myHand.length === 1 && !state.unoDeclared?.[user.uid] && (
            <div className={`mb-3 flex justify-center ${unoHint?.highlight === 'uno' ? 'hint-ring rounded-full p-1' : ''}`}>
              <button
                type="button"
                onClick={() => declareUno()}
                className="px-6 py-2 rounded-full font-bold text-stone-900 animate-pulse"
                style={{ background: 'linear-gradient(180deg, #fde047 0%, #eab308 100%)' }}
              >
                UNO!
              </button>
            </div>
          )}

          {state.drawPhase?.uid === user.uid && (
            <div className={`mb-3 flex justify-center gap-3 ${unoHint?.highlight === 'pass' ? 'hint-ring rounded-xl py-1 px-2' : ''}`}>
              <button type="button" onClick={() => passAfterDraw()} className="px-4 py-2 rounded-lg bg-zinc-700 text-sm hover:bg-zinc-600 text-white">
                턴 넘기기 (뽑은 카드 안 냄)
              </button>
            </div>
          )}

          <div className="flex overflow-x-auto pb-2 gap-2 px-0.5 max-h-[42vh] sm:max-h-none overscroll-x-contain touch-pan-x">
            {myHand.map((card, idx) => {
              const playable =
                isMyTurn &&
                !state.pendingWild4 &&
                !state.needsInitialWildColor &&
                canPlayUnoCard(card, topCard, state.currentColor) &&
                (!state.drawPhase || (state.drawPhase.uid === user.uid && idx === state.drawPhase.cardIndex));
              const dim = !playable && isMyTurn;
              const hintCard =
                unoHint?.highlight === 'hand' && (unoHint.cardIndices || []).includes(idx) && playable;
              return (
                <button
                  key={`${card.id}-${idx}`}
                  type="button"
                  onClick={() => playUnoCard(idx)}
                  disabled={!playable || state.status !== 'playing'}
                  className={`flex-shrink-0 touch-manipulation ${getCardStyle(card)} ${dim ? 'opacity-45' : ''} ${playable ? 'sm:hover:-translate-y-2 active:scale-95 cursor-pointer' : 'cursor-not-allowed'} ${hintCard ? 'hint-ring' : ''}`}
                >
                  {getCardFace(card)}
                </button>
              );
            })}
          </div>
        </div>

        {wildColorSelector && (
          <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4">
            <div
              className={`nf-panel p-6 rounded-xl text-center max-w-sm w-full ${
                unoHint?.highlight === 'wildModal' ? 'hint-ring border-red-600/50' : ''
              }`}
            >
              <h3 className="nf-title text-xl text-white mb-4 tracking-wide">와일드 색 선택</h3>
              <div className="grid grid-cols-2 gap-3">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => playUnoCard(wildColorSelector.cardIndex, c)}
                    className={`h-24 rounded-xl border-2 border-white/20 ${c === 'red' ? 'bg-red-600' : c === 'blue' ? 'bg-blue-600' : c === 'green' ? 'bg-emerald-600' : 'bg-yellow-400'}`}
                  />
                ))}
              </div>
              <button type="button" onClick={() => setWildColorSelector(null)} className="mt-5 text-stone-500 text-sm underline">
                취소
              </button>
            </div>
          </div>
        )}

        {state.status === 'gameover' && (
          <div className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center z-50 text-center p-6">
            <h2 className="text-3xl font-serif text-amber-200 mb-3">게임 종료</h2>
            <p className="text-lg text-stone-300 mb-8">{state.message}</p>
            {isHost && (
              <button type="button" onClick={backToLobby} className="px-8 py-3 rounded-full font-bold bg-amber-100 text-stone-900">
                로비로 돌아가기
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="nf-root nf-page-bg min-h-screen flex flex-col items-center justify-center px-4 text-stone-400">
      {muteFab}
      <p className="text-center text-stone-300">오류가 났습니다. 새로고침 해 주세요.</p>
    </div>
  );
}
