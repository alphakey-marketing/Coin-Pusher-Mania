import { useRef, useEffect, useCallback, useState } from 'react';
import { CONFIG, COIN_DEFS, ITEM_DEFS } from '../game/config';
import type { CoinTypeId, ItemTypeId } from '../game/config';
import type { GameState } from '../game/state';
import { createInitialState } from '../game/state';
import {
  initPhysics, stepPhysics, spawnCoin, getCoins, getShelfX, getShelfY,
  applyMagnetEffect, destroyPhysics, getCoinCount, type CoinBody, setCoinFuse
} from '../game/engine';
import { renderFrame } from '../game/renderer';
import {
  createSparkParticles, createExplosionParticles, createFloatingText,
  updateParticles, updateFloatingTexts, type Particle, type FloatingText
} from '../game/particles';
import { generateShopOffers } from '../game/shopGenerator';
import { useGameLoop } from '../hooks/useGameLoop';
import { useCameraShake } from '../hooks/useCameraShake';
import HUD from './HUD';
import ShopPanel from './ShopPanel';
import MenuScreen from './MenuScreen';
import GameOverScreen from './GameOverScreen';

const SCALE_FACTOR_MOBILE = 0.92;

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>(createInitialState());
  const gameStateRef = useRef<GameState>(gameState);
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const magnetTimerRef = useRef<number>(0);
  const lastDropRef = useRef<number>(0);
  const bombFuseProgressRef = useRef<Map<string, number>>(new Map());
  const { shake, update: updateShake } = useCameraShake();

  const syncState = useCallback((updater: (prev: GameState) => GameState) => {
    setGameState(prev => {
      const next = updater(prev);
      gameStateRef.current = next;
      return next;
    });
  }, []);

  const handlePayout = useCallback((coin: CoinBody) => {
    const state = gameStateRef.current;
    const def = COIN_DEFS[coin.typeId];
    const now = Date.now();

    let gold = def.payoutValue;
    let score = def.payoutValue;
    let floatColor = '#ffe066';
    let floatText = `+${gold}`;

    const isInCenter = coin.body.position.x > CONFIG.BOARD_WIDTH * 0.35 &&
      coin.body.position.x < CONFIG.BOARD_WIDTH * 0.65;

    const hasLuckyLip = state.items.some(i => i.typeId === 'luckyLip');
    if (isInCenter && hasLuckyLip) {
      gold += 2;
      floatText = `+${gold} 🍀`;
      floatColor = '#88ffaa';
    }

    if (coin.typeId === 'lucky' && isInCenter) {
      gold += 2;
      floatColor = '#88ffaa';
      floatText = `+${gold} LUCKY!`;
    }

    const newPayoutCount = state.payoutsThisRound + 1;
    const hasMultiplierTray = state.items.some(i => i.typeId === 'multiplierTray');
    if (hasMultiplierTray && newPayoutCount % 5 === 0) {
      score *= 2;
      floatText = `×2 SCORE!`;
      floatColor = '#ff88ff';
    }

    const timeSinceLastPayout = state.lastPayoutMs ? now - state.lastPayoutMs : Infinity;
    let newCombo = 1;
    let comboBonus = 0;
    if (timeSinceLastPayout < CONFIG.COMBO_WINDOW_MS) {
      newCombo = state.comboChain + 1;
      if (newCombo >= 3) {
        comboBonus = newCombo - 2;
        score += comboBonus;
        floatText = `CHAIN x${newCombo}! +${score}`;
        floatColor = '#ff4488';
        shake(8);
      }
    }

    const coinPos = coin.body.position;
    particlesRef.current = [
      ...particlesRef.current,
      ...createSparkParticles(coinPos.x, CONFIG.BOARD_HEIGHT - CONFIG.WALL_THICKNESS, COIN_DEFS[coin.typeId].glowColor, 10),
    ];
    floatingTextsRef.current = [
      ...floatingTextsRef.current,
      createFloatingText(
        coinPos.x,
        CONFIG.BOARD_HEIGHT - 40,
        floatText,
        floatColor,
        18
      ),
    ];

    shake(3);

    syncState(prev => ({
      ...prev,
      gold: prev.gold + gold,
      score: prev.score + score,
      totalScore: prev.totalScore + score,
      payoutsThisRound: newPayoutCount,
      comboChain: newCombo,
      lastPayoutMs: now,
    }));
  }, [shake, syncState]);

  const handleBombExplode = useCallback((coin: CoinBody) => {
    const pos = coin.body.position;
    particlesRef.current = [
      ...particlesRef.current,
      ...createExplosionParticles(pos.x, pos.y, 24),
    ];
    floatingTextsRef.current = [
      ...floatingTextsRef.current,
      createFloatingText(pos.x, pos.y - 20, 'BOOM!', '#ff6644', 22),
    ];
    shake(14);
  }, [shake]);

  const handleCoinLand = useCallback((coin: CoinBody) => {
    if (coin.isBomb) {
      setCoinFuse(coin, CONFIG.BOMB_FUSE_MS);
    }
    particlesRef.current = [
      ...particlesRef.current,
      ...createSparkParticles(coin.body.position.x, coin.body.position.y, COIN_DEFS[coin.typeId].glowColor, 4),
    ];
  }, []);

  const initGame = useCallback(() => {
    destroyPhysics();
    initPhysics(handlePayout, handleBombExplode, handleCoinLand);
  }, [handlePayout, handleBombExplode, handleCoinLand]);

  useEffect(() => {
    return () => {
      destroyPhysics();
    };
  }, []);

  const startGame = useCallback(() => {
    const initial = createInitialState();
    initial.phase = 'playing';
    gameStateRef.current = initial;
    setGameState(initial);
    particlesRef.current = [];
    floatingTextsRef.current = [];
    initGame();
  }, [initGame]);

  const startNewRound = useCallback((state: GameState) => {
    destroyPhysics();
    initPhysics(handlePayout, handleBombExplode, handleCoinLand);
    particlesRef.current = [];
    floatingTextsRef.current = [];
    const newState: GameState = {
      ...state,
      phase: 'playing',
      score: 0,
      payoutsThisRound: 0,
      comboChain: 0,
      lastPayoutMs: null,
    };
    gameStateRef.current = newState;
    setGameState(newState);
  }, [handlePayout, handleBombExplode, handleCoinLand]);

  const dropCoin = useCallback((dropX?: number) => {
    const state = gameStateRef.current;
    if (state.phase !== 'playing') return;
    if (state.dropsRemaining <= 0) return;
    if (getCoinCount() >= CONFIG.MAX_COINS_ON_BOARD) return;

    const now = Date.now();
    if (now - lastDropRef.current < 200) return;
    lastDropRef.current = now;

    const totalCoins = state.coinInventory.reduce((sum, e) => sum + e.count, 0);
    if (totalCoins <= 0) {
      checkRoundEnd();
      return;
    }

    const selected = state.selectedCoinType;
    const entry = state.coinInventory.find(e => e.typeId === selected);
    const actualType: CoinTypeId = (entry && entry.count > 0) ? selected : (
      state.coinInventory.find(e => e.count > 0)?.typeId ?? 'normal'
    );

    const x = dropX ?? CONFIG.COIN_SPAWN_X_CENTER + (Math.random() - 0.5) * 30;
    spawnCoin(actualType, Math.max(CONFIG.WALL_THICKNESS + 20, Math.min(CONFIG.BOARD_WIDTH - CONFIG.WALL_THICKNESS - 20, x)));

    syncState(prev => {
      const newInventory = prev.coinInventory.map(e =>
        e.typeId === actualType ? { ...e, count: e.count - 1 } : e
      ).filter(e => e.count > 0 || e.typeId === 'normal');

      const newDrops = prev.dropsRemaining - 1;
      return {
        ...prev,
        dropsRemaining: newDrops,
        coinInventory: newInventory,
      };
    });
  }, [syncState]);

  const checkRoundEnd = useCallback(() => {
    const state = gameStateRef.current;
    if (state.phase !== 'playing') return;

    const totalCoins = state.coinInventory.reduce((sum, e) => sum + e.count, 0);
    if (state.dropsRemaining > 0 || totalCoins > 0) return;

    const won = state.score >= state.targetScore;

    if (won) {
      const offers = generateShopOffers(state.round, state.items, state.gold);
      syncState(prev => ({
        ...prev,
        phase: 'shop',
        shopOffers: offers,
        roundsCleared: prev.roundsCleared + 1,
      }));
    } else {
      syncState(prev => ({ ...prev, phase: 'lost' }));
    }
  }, [syncState]);

  const handleShopPurchase = useCallback((offerId: string) => {
    const state = gameStateRef.current;
    const offer = state.shopOffers.find(o => o.id === offerId);
    if (!offer || offer.purchased || state.gold < offer.cost) return;

    syncState(prev => {
      const newOffers = prev.shopOffers.map(o =>
        o.id === offerId ? { ...o, purchased: true } : o
      );

      let newInventory = [...prev.coinInventory];
      let newItems = [...prev.items];

      if (offer.type === 'coin') {
        const typeId = offer.typeId as CoinTypeId;
        const existing = newInventory.find(e => e.typeId === typeId);
        if (existing) {
          newInventory = newInventory.map(e =>
            e.typeId === typeId ? { ...e, count: e.count + 3 } : e
          );
        } else {
          newInventory = [...newInventory, { typeId, count: 3 }];
        }
      } else {
        const typeId = offer.typeId as ItemTypeId;
        const existing = newItems.find(i => i.typeId === typeId);
        if (existing) {
          newItems = newItems.map(i =>
            i.typeId === typeId ? { ...i, stacks: i.stacks + 1 } : i
          );
        } else {
          newItems = [...newItems, { id: `item_${Date.now()}`, typeId, stacks: 1 }];
        }
      }

      return {
        ...prev,
        gold: prev.gold - offer.cost,
        shopOffers: newOffers,
        coinInventory: newInventory,
        items: newItems,
      };
    });
  }, [syncState]);

  const handleContinue = useCallback(() => {
    const state = gameStateRef.current;
    const nextTarget = state.targetScore + CONFIG.TARGET_INCREMENT;
    startNewRound({
      ...state,
      round: state.round + 1,
      targetScore: nextTarget,
      dropsRemaining: CONFIG.STARTING_DROPS + Math.min(state.roundsCleared, 3),
    });
  }, [startNewRound]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CONFIG.BOARD_WIDTH / rect.width;
    const clickX = (e.clientX - rect.left) * scaleX;
    dropCoin(clickX);
  }, [dropCoin]);

  const handleCanvasTouch = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.changedTouches[0];
    const scaleX = CONFIG.BOARD_WIDTH / rect.width;
    const clickX = (touch.clientX - rect.left) * scaleX;
    dropCoin(clickX);
  }, [dropCoin]);

  const gameLoop = useCallback((dt: number) => {
    const state = gameStateRef.current;
    if (state.phase !== 'playing') return;

    const hasBombPolish = state.items.some(i => i.typeId === 'bombPolish');
    const bombRadiusMultiplier = hasBombPolish ? 1.3 : 1;

    stepPhysics(dt, bombRadiusMultiplier);

    magnetTimerRef.current += dt;
    if (magnetTimerRef.current >= 3000) {
      magnetTimerRef.current = 0;
      if (state.items.some(i => i.typeId === 'magnet')) {
        applyMagnetEffect();
      }
    }

    const coins = getCoins();
    const now = Date.now();

    bombFuseProgressRef.current.clear();
    for (const coin of coins) {
      if (coin.isBomb && coin.fuseEndsAt) {
        const elapsed = now - (coin.fuseEndsAt - CONFIG.BOMB_FUSE_MS);
        const progress = Math.min(1, elapsed / CONFIG.BOMB_FUSE_MS);
        bombFuseProgressRef.current.set(coin.id, progress);
      }
    }

    particlesRef.current = updateParticles(particlesRef.current, dt);
    floatingTextsRef.current = updateFloatingTexts(floatingTextsRef.current, dt);

    const shakeOffset = updateShake();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    renderFrame(ctx, {
      coins,
      particles: particlesRef.current,
      floatingTexts: floatingTextsRef.current,
      shelfX: getShelfX(),
      shelfY: getShelfY(),
      shakeX: shakeOffset.x,
      shakeY: shakeOffset.y,
      bombFuseProgress: bombFuseProgressRef.current,
    });

    const totalCoins = state.coinInventory.reduce((sum, e) => sum + e.count, 0);
    if (state.dropsRemaining <= 0 && totalCoins <= 0 && coins.length === 0) {
      checkRoundEnd();
    }
  }, [updateShake, checkRoundEnd]);

  useGameLoop(gameLoop, gameState.phase === 'playing');

  const selectCoin = useCallback((typeId: CoinTypeId) => {
    syncState(prev => ({ ...prev, selectedCoinType: typeId }));
  }, [syncState]);

  return (
    <div className="game-root">
      <div className="game-container">
        {gameState.phase === 'menu' && (
          <MenuScreen onStart={startGame} />
        )}

        {gameState.phase === 'lost' && (
          <GameOverScreen
            score={gameState.totalScore}
            rounds={gameState.roundsCleared}
            onRestart={startGame}
          />
        )}

        {(gameState.phase === 'playing' || gameState.phase === 'shop') && (
          <>
            <HUD
              state={gameState}
              onSelectCoin={selectCoin}
            />

            <div className="canvas-wrapper">
              <canvas
                ref={canvasRef}
                width={CONFIG.BOARD_WIDTH}
                height={CONFIG.BOARD_HEIGHT}
                className="game-canvas"
                onClick={handleCanvasClick}
                onTouchStart={handleCanvasTouch}
              />
              {gameState.phase === 'playing' && (
                <div className="drop-hint">Tap to drop!</div>
              )}
            </div>

            {gameState.phase === 'shop' && (
              <ShopPanel
                state={gameState}
                onPurchase={handleShopPurchase}
                onContinue={handleContinue}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
