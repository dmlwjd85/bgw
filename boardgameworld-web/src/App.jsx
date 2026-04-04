import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, updateDoc, getDoc } from 'firebase/firestore';

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

  const tableStyle = useMemo(
    () => ({
      background: 'radial-gradient(ellipse at center, #1e6b4a 0%, #0d3d2a 55%, #061a12 100%)',
      boxShadow: 'inset 0 0 120px rgba(0,0,0,0.35)'
    }),
    []
  );

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
  const setInitialUnoColor = async (color, actingUid = user.uid, rd = roomData) => {
    const state = rd.gameState;
    if (!state.needsInitialWildColor) return;
    const current = rd.players[state.turnIndex];
    if (current.uid !== actingUid) return;
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode);
    await updateDoc(roomRef, {
      'gameState.currentColor': color,
      'gameState.needsInitialWildColor': false,
      'gameState.message': `시작 색이 ${color}로 정해졌습니다.`
    });
  };

  const declareUno = async (actingUid = user.uid, rd = roomData) => {
    const state = rd.gameState;
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode);
    const ud = { ...(state.unoDeclared || {}), [actingUid]: true };
    const dn = rd.players.find((p) => p.uid === actingUid)?.name ?? '플레이어';
    await updateDoc(roomRef, { 'gameState.unoDeclared': ud, 'gameState.message': `${dn}님이 UNO!를 외쳤습니다.` });
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

  const playUnoCard = async (cardIndex, overrideColor = null, actingUid = user.uid, rd = roomData) => {
    const state = rd.gameState;
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode);
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
  const drawUnoCard = async (actingUid = user.uid, rd = roomData) => {
    const state = rd.gameState;
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode);
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

  const passAfterDraw = async (actingUid = user.uid, rd = roomData) => {
    const state = rd.gameState;
    if (state.pendingWild4) return;
    if (state.drawPhase?.uid !== actingUid) return;
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode);
    const newTurnIndex = (state.turnIndex + state.direction + rd.players.length) % rd.players.length;
    await updateDoc(roomRef, {
      'gameState.turnIndex': newTurnIndex,
      'gameState.drawPhase': null,
      'gameState.message': '턴을 넘겼습니다.'
    });
  };

  /** Wild +4: 다음 플레이어가 4장을 받기로 함 (뽑기 전 도전 규칙 반영) */
  const acceptWild4Pending = async (actingUid = user.uid, rd = roomData) => {
    const state = rd.gameState;
    const p = state.pendingWild4;
    if (!p || p.targetUid !== actingUid) return;
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode);
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
  const challengeWild4Pending = async (actingUid = user.uid, rd = roomData) => {
    const state = rd.gameState;
    const p = state.pendingWild4;
    if (!p || p.targetUid !== actingUid) return;
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode);
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

  /** 방장 화면에서만: 초보 AI의 더 마인드·우노 턴을 자동 처리합니다. */
  useEffect(() => {
    if (!roomCode || !user?.uid || !roomData) return;
    const isHost = roomData.players?.find((p) => p.uid === user.uid)?.isHost;
    if (!isHost) return;
    if (roomData.status !== 'playing') return;

    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode);
    const delayMs = 720;

    if (hostAiTimerRef.current) clearTimeout(hostAiTimerRef.current);
    hostAiTimerRef.current = setTimeout(async () => {
      hostAiTimerRef.current = null;
      const snap = await getDoc(roomRef);
      if (!snap.exists()) return;
      let rd = snap.data();
      if (rd.status !== 'playing') return;
      const state = rd.gameState;
      if (!state || state.status !== 'playing') return;

      if (rd.game === 'themind') {
        let allCards = [];
        Object.values(state.hands || {}).forEach((h) => {
          allCards = allCards.concat(h);
        });
        if (allCards.length === 0) return;
        const lowestCard = Math.min(...allCards);
        const holder = rd.players.find((p) => state.hands[p.uid]?.includes(lowestCard));
        if (holder?.isAi) {
          await playTheMindCard(lowestCard, holder.uid, rd);
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
        const cur = rd.players[state.turnIndex];
        if (!cur?.isAi) return;

        if (state.needsInitialWildColor) {
          const pick = COLORS[Math.floor(Math.random() * COLORS.length)];
          await setInitialUnoColor(pick, cur.uid, rd);
          return;
        }

        if (state.pendingWild4?.targetUid === cur.uid) {
          await acceptWild4Pending(cur.uid, rd);
          return;
        }

        const hand = state.hands[cur.uid];
        const topCard = state.discardPile[state.discardPile.length - 1];

        if (state.drawPhase?.uid === cur.uid) {
          const idx = findBeginnerUnoPlayIndex(hand, topCard, state.currentColor, state.drawPhase);
          if (idx >= 0) {
            const card = hand[idx];
            const wildColor = card.color === 'black' ? pickUnoWildColorForAi(hand, idx) : null;
            await playUnoCard(idx, wildColor, cur.uid, rd);
          } else {
            await passAfterDraw(cur.uid, rd);
          }
          return;
        }

        if (hand?.length === 1 && !state.unoDeclared?.[cur.uid]) {
          await declareUno(cur.uid, rd);
          return;
        }

        const idx = findBeginnerUnoPlayIndex(hand, topCard, state.currentColor, null);
        if (idx >= 0) {
          const card = hand[idx];
          const wildColor = card.color === 'black' ? pickUnoWildColorForAi(hand, idx) : null;
          await playUnoCard(idx, wildColor, cur.uid, rd);
          return;
        }

        await drawUnoCard(cur.uid, rd);
      }
    }, delayMs);

    return () => {
      if (hostAiTimerRef.current) {
        clearTimeout(hostAiTimerRef.current);
        hostAiTimerRef.current = null;
      }
    };
  }, [roomData, roomCode, user?.uid]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-stone-200" style={{ background: '#2c1810' }}>
        <div className="text-center">
          <div className="text-2xl font-serif tracking-wide mb-2">Board Game World</div>
          <div className="text-sm opacity-80">불러오는 중…</div>
        </div>
      </div>
    );
  }

  if (!userName && !roomData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-stone-100" style={{ background: 'linear-gradient(165deg, #3d2914 0%, #1a0f08 100%)' }}>
        <div
          className="w-full max-w-md rounded-2xl p-8 border border-amber-900/40 shadow-2xl"
          style={{ background: 'linear-gradient(180deg, #4a3728 0%, #2d2118 100%)', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}
        >
          <div className="text-center mb-6">
            <p className="text-xs uppercase tracking-[0.35em] text-amber-200/80 mb-2">Tabletop Lounge</p>
            <h1 className="text-3xl font-serif font-bold text-amber-100">보드게임 월드</h1>
            <p className="text-sm text-stone-400 mt-2">더 마인드 · 우노를 같은 테이블에서 즐기세요.</p>
          </div>
          <p className="text-stone-300 text-sm mb-4 text-center">다른 플레이어에게 보일 닉네임을 입력하세요.</p>
          <input
            type="text"
            className="w-full p-3 rounded-xl mb-4 text-center text-lg bg-stone-900/80 border border-amber-900/50 text-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-600/60"
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
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-stone-100" style={{ background: 'linear-gradient(165deg, #3d2914 0%, #1a0f08 100%)' }}>
        <div
          className="w-full max-w-md rounded-2xl p-8 border border-amber-900/40"
          style={{ background: 'linear-gradient(180deg, #4a3728 0%, #2d2118 100%)' }}
        >
          <h2 className="text-xl font-serif text-center text-amber-100 mb-6">환영합니다, {userName}님</h2>
          <div className="space-y-6">
            <button
              onClick={handleCreateRoom}
              className="w-full py-4 rounded-xl font-semibold text-stone-900 transition hover:brightness-110"
              style={{ background: 'linear-gradient(180deg, #d4a574 0%, #a67c52 100%)', boxShadow: '0 4px 14px rgba(0,0,0,0.35)' }}
            >
              새 테이블 열기
            </button>
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-stone-600" />
              <span className="flex-shrink-0 mx-4 text-stone-500 text-sm">또는 입장</span>
              <div className="flex-grow border-t border-stone-600" />
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                className="flex-1 p-3 rounded-xl text-center font-mono text-xl uppercase bg-stone-900/80 border border-amber-900/50 text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-600/60"
                placeholder="코드 4자"
                maxLength={4}
              />
              <button
                onClick={handleJoinRoom}
                className="px-6 rounded-xl font-semibold text-white"
                style={{ background: 'linear-gradient(180deg, #2d6a4f 0%, #1b4332 100%)' }}
              >
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
      <div className="min-h-screen p-4 flex flex-col items-center text-stone-100" style={{ background: 'linear-gradient(165deg, #3d2914 0%, #1a0f08 100%)' }}>
        <div className="w-full max-w-3xl mt-6 rounded-2xl border border-amber-900/40 overflow-hidden" style={{ background: 'linear-gradient(180deg, #4a3728 0%, #2d2118 100%)' }}>
          <div className="p-6 flex flex-wrap justify-between items-center gap-4 border-b border-amber-900/30">
            <h2 className="text-2xl font-serif text-amber-100">로비</h2>
            <div className="px-5 py-2 rounded-lg font-mono text-xl tracking-[0.2em] border border-amber-700/50 bg-stone-900/60 text-amber-200">
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
      <div className="min-h-screen flex flex-col font-sans text-stone-100 p-3 sm:p-5" style={tableStyle}>
        <div className="flex flex-wrap justify-between items-center gap-3 px-4 py-3 rounded-xl border border-emerald-900/50 bg-black/25">
          <div className="font-serif text-xl text-emerald-100 tracking-wide">The Mind</div>
          <div className="flex flex-wrap gap-3 text-sm">
            <span className="px-3 py-1 rounded-lg bg-black/30 border border-emerald-800/60">
              레벨 <strong className="text-amber-300">{state.level}</strong> / {THE_MIND_MAX_LEVEL}
            </span>
            <span className="px-3 py-1 rounded-lg bg-black/30 border border-emerald-800/60">
              생명 {state.lives > 0 ? '❤️'.repeat(state.lives) : '—'}
            </span>
            <span className="px-3 py-1 rounded-lg bg-black/30 border border-emerald-800/60">
              수리검 {state.shurikens ?? 1}
            </span>
          </div>
        </div>

        <div className="text-center my-3 px-2 text-sm text-emerald-100/90 min-h-[2.5rem]">{state.message}</div>

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

        <div className="rounded-t-3xl border-t border-emerald-800/50 p-5 bg-black/35">
          <p className="text-center text-emerald-200/80 text-xs mb-4">내 패 — 전체 중 지금 낼 수 있는 건 가장 작은 수뿐입니다 (말·신호 금지).</p>
          <div className="flex flex-wrap justify-center gap-3">
            {myHand.map((card, idx) => (
              <button
                key={`${card}-${idx}`}
                type="button"
                onClick={() => playTheMindCard(card)}
                disabled={state.status !== 'playing'}
                className="w-16 h-24 sm:w-[4.5rem] sm:h-32 rounded-xl flex items-center justify-center text-2xl font-black text-stone-900 shadow-lg border-2 border-white/30 transition hover:-translate-y-1 disabled:opacity-40 disabled:hover:translate-y-0"
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
      <div className="min-h-screen flex flex-col p-3 sm:p-5 text-stone-100" style={tableStyle}>
        <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
          <div className="text-sm px-3 py-1.5 rounded-lg bg-black/35 border border-emerald-900/50">
            방향: {state.direction === 1 ? '시계 방향 →' : '반시계 ←'}
          </div>
          {isHost && (
            <button type="button" onClick={backToLobby} className="text-xs text-stone-400 underline hover:text-amber-200">
              방장: 게임 종료 후 로비
            </button>
          )}
        </div>

        <div className="flex justify-center gap-2 mb-4 overflow-x-auto pb-1">
          {roomData.players.map((p, i) => (
            <div
              key={p.uid}
              className={`flex-shrink-0 px-3 py-2 rounded-xl text-center min-w-[5.5rem] border ${
                i === state.turnIndex ? 'border-amber-400 bg-amber-400/20 text-amber-100 scale-105' : 'border-emerald-900/40 bg-black/25 text-stone-300'
              }`}
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

        {state.needsInitialWildColor && roomData.players[state.turnIndex]?.uid === user.uid && (
          <div className="mb-4 p-4 rounded-xl bg-black/45 border border-amber-600/40 text-center">
            <p className="text-sm text-amber-100 mb-3">첫 카드가 와일드입니다. 시작 색을 고르세요.</p>
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

        <div className="text-center text-sm text-emerald-100/90 mb-4 min-h-[2rem] px-2">{state.message}</div>

        <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-8 mb-6">
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={drawUnoCard}
              disabled={!isMyTurn || state.status !== 'playing' || state.needsInitialWildColor || !!state.pendingWild4}
              className="w-24 h-36 rounded-xl border-4 border-white flex flex-col items-center justify-center shadow-xl transition hover:scale-105 disabled:opacity-40"
              style={{ background: 'linear-gradient(145deg, #dc2626 0%, #991b1b 100%)' }}
            >
              <span className="text-amber-200 font-black text-xl -rotate-12" style={{ fontFamily: 'Georgia, serif' }}>
                UNO
              </span>
            </button>
            <span className="text-[11px] text-stone-400 mt-2">덱에서 뽑기</span>
          </div>

          <div className="flex flex-col items-center relative">
            <div className="absolute -top-10 whitespace-nowrap text-xs font-semibold bg-black/55 px-3 py-1 rounded-full border border-emerald-800/60">
              현재 색: {colorKo[state.currentColor] || state.currentColor}
            </div>
            <div className={getCardStyle(topCard) + ' pointer-events-none'}>
              <span>{getCardFace(topCard)}</span>
            </div>
          </div>
        </div>

        {state.pendingWild4 && state.pendingWild4.targetUid === user.uid && (
          <div className="flex flex-col sm:flex-row justify-center items-center gap-3 mb-4 p-4 rounded-xl bg-amber-950/50 border border-amber-600/40">
            <p className="text-sm text-amber-100 text-center">Wild +4 — 4장을 받거나, 상대가 블러프였는지 도전하세요.</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={acceptWild4Pending}
                className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-sm font-semibold"
              >
                4장 받기
              </button>
              <button
                type="button"
                onClick={challengeWild4Pending}
                className="px-4 py-2 rounded-lg bg-red-800 hover:bg-red-700 text-sm font-semibold"
              >
                도전
              </button>
            </div>
          </div>
        )}

        <div className="rounded-t-3xl border-t border-emerald-900/50 p-4 bg-black/40">
          <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
            <span className="text-sm font-semibold text-emerald-100">내 패 ({myHand.length}장)</span>
            {isMyTurn && <span className="text-amber-300 text-sm font-semibold animate-pulse">내 차례</span>}
          </div>

          {myHand.length === 1 && !state.unoDeclared?.[user.uid] && (
            <div className="mb-3 flex justify-center">
              <button
                type="button"
                onClick={declareUno}
                className="px-6 py-2 rounded-full font-bold text-stone-900 animate-pulse"
                style={{ background: 'linear-gradient(180deg, #fde047 0%, #eab308 100%)' }}
              >
                UNO!
              </button>
            </div>
          )}

          {state.drawPhase?.uid === user.uid && (
            <div className="mb-3 flex justify-center gap-3">
              <button type="button" onClick={passAfterDraw} className="px-4 py-2 rounded-lg bg-stone-700 text-sm hover:bg-stone-600">
                턴 넘기기 (뽑은 카드 안 냄)
              </button>
            </div>
          )}

          <div className="flex overflow-x-auto pb-3 gap-2 px-1">
            {myHand.map((card, idx) => {
              const playable =
                isMyTurn &&
                !state.pendingWild4 &&
                !state.needsInitialWildColor &&
                canPlayUnoCard(card, topCard, state.currentColor) &&
                (!state.drawPhase || (state.drawPhase.uid === user.uid && idx === state.drawPhase.cardIndex));
              const dim = !playable && isMyTurn;
              return (
                <button
                  key={`${card.id}-${idx}`}
                  type="button"
                  onClick={() => playUnoCard(idx)}
                  disabled={!playable || state.status !== 'playing'}
                  className={`flex-shrink-0 ${getCardStyle(card)} ${dim ? 'opacity-45' : ''} ${playable ? 'hover:-translate-y-2 cursor-pointer' : 'cursor-not-allowed'}`}
                >
                  {getCardFace(card)}
                </button>
              );
            })}
          </div>
        </div>

        {wildColorSelector && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-stone-900 border border-amber-700/50 p-6 rounded-2xl text-center max-w-sm w-full">
              <h3 className="text-lg font-serif text-amber-100 mb-4">와일드 색 선택</h3>
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
    <div className="min-h-screen flex items-center justify-center bg-stone-900 text-stone-400">
      오류가 났습니다. 새로고침 해 주세요.
    </div>
  );
}
