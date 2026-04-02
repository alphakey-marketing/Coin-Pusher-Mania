import { COIN_DEFS, ITEM_DEFS, type CoinTypeId, type ItemTypeId } from './config';
import type { ShopOffer, OwnedItem } from './state';

let offerId = 0;

export function generateShopOffers(
  round: number,
  ownedItems: OwnedItem[],
  gold: number,
): ShopOffer[] {
  const offers: ShopOffer[] = [];

  const allCoinOptions: CoinTypeId[] = ['heavy', 'lucky', 'bomb'];
  const allItemOptions: ItemTypeId[] = ['magnet', 'multiplierTray', 'bombPolish', 'luckyLip', 'heavyMint'];

  const shuffledCoins = shuffleArray(allCoinOptions);
  const shuffledItems = shuffleArray(allItemOptions);

  offers.push({
    id: `offer_${offerId++}`,
    type: 'coin',
    typeId: shuffledCoins[0],
    title: COIN_DEFS[shuffledCoins[0]].name,
    description: COIN_DEFS[shuffledCoins[0]].description,
    icon: getCoinIcon(shuffledCoins[0]),
    cost: getCoinCost(shuffledCoins[0], round),
    purchased: false,
  });

  offers.push({
    id: `offer_${offerId++}`,
    type: 'item',
    typeId: shuffledItems[0],
    title: ITEM_DEFS[shuffledItems[0]].name,
    description: ITEM_DEFS[shuffledItems[0]].description,
    icon: ITEM_DEFS[shuffledItems[0]].icon,
    cost: ITEM_DEFS[shuffledItems[0]].cost,
    purchased: false,
  });

  offers.push({
    id: `offer_${offerId++}`,
    type: 'coin',
    typeId: shuffledCoins[1] || shuffledCoins[0],
    title: COIN_DEFS[shuffledCoins[1] || shuffledCoins[0]].name,
    description: COIN_DEFS[shuffledCoins[1] || shuffledCoins[0]].description,
    icon: getCoinIcon(shuffledCoins[1] || shuffledCoins[0]),
    cost: getCoinCost(shuffledCoins[1] || shuffledCoins[0], round) - 2,
    purchased: false,
  });

  return offers;
}

function getCoinIcon(typeId: CoinTypeId): string {
  switch (typeId) {
    case 'heavy': return '⚙️';
    case 'bomb': return '💣';
    case 'lucky': return '🍀';
    case 'normal': return '🪙';
    default: return '🪙';
  }
}

function getCoinCost(typeId: CoinTypeId, round: number): number {
  const base: Record<CoinTypeId, number> = {
    normal: 3,
    heavy: 8,
    bomb: 12,
    lucky: 10,
  };
  return base[typeId] ?? 5;
}

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
