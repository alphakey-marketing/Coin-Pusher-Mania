import type { CoinTypeId, ItemTypeId } from './config';

export type GamePhase = 'menu' | 'playing' | 'shop' | 'won' | 'lost';
export type RoundStatus = 'idle' | 'dropping' | 'resolving';

export interface OwnedItem {
  id: string;
  typeId: ItemTypeId;
  stacks: number;
}

export interface CoinInventoryEntry {
  typeId: CoinTypeId;
  count: number;
}

export interface ShopOffer {
  id: string;
  type: 'coin' | 'item';
  typeId: CoinTypeId | ItemTypeId;
  title: string;
  description: string;
  icon: string;
  cost: number;
  purchased: boolean;
}

export interface GameState {
  phase: GamePhase;
  round: number;
  gold: number;
  score: number;
  totalScore: number;
  dropsRemaining: number;
  targetScore: number;
  payoutsThisRound: number;
  comboChain: number;
  lastPayoutMs: number | null;
  items: OwnedItem[];
  coinInventory: CoinInventoryEntry[];
  shopOffers: ShopOffer[];
  selectedCoinType: CoinTypeId;
  roundsCleared: number;
}

export function createInitialState(): GameState {
  return {
    phase: 'menu',
    round: 1,
    gold: 0,
    score: 0,
    totalScore: 0,
    dropsRemaining: 12,
    targetScore: 20,
    payoutsThisRound: 0,
    comboChain: 0,
    lastPayoutMs: null,
    items: [],
    coinInventory: [
      { typeId: 'normal', count: 10 },
      { typeId: 'heavy', count: 1 },
    ],
    shopOffers: [],
    selectedCoinType: 'normal',
    roundsCleared: 0,
  };
}
