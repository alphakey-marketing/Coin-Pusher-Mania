import type { GameState } from '../game/state';

interface ShopPanelProps {
  state: GameState;
  onPurchase: (offerId: string) => void;
  onContinue: () => void;
}

export default function ShopPanel({ state, onPurchase, onContinue }: ShopPanelProps) {
  const won = state.score >= state.targetScore;

  return (
    <div className="shop-overlay">
      <div className="shop-panel">
        <div className="shop-header">
          {won ? (
            <>
              <div className="shop-result won">✨ Round {state.round} Complete!</div>
              <div className="shop-score">Score: {state.score}/{state.targetScore}</div>
            </>
          ) : (
            <div className="shop-result lost">Round Over</div>
          )}
          <div className="shop-gold">🪙 {state.gold} gold</div>
        </div>

        <div className="shop-title">Choose a Reward</div>

        <div className="shop-offers">
          {state.shopOffers.map(offer => {
            const canAfford = state.gold >= offer.cost;
            const isPurchased = offer.purchased;
            return (
              <button
                key={offer.id}
                className={`shop-offer ${isPurchased ? 'purchased' : ''} ${!canAfford && !isPurchased ? 'cant-afford' : ''}`}
                onClick={() => !isPurchased && canAfford && onPurchase(offer.id)}
                disabled={isPurchased || !canAfford}
              >
                <div className="offer-icon">{offer.icon}</div>
                <div className="offer-info">
                  <div className="offer-title">{offer.title}</div>
                  <div className="offer-desc">{offer.description}</div>
                </div>
                <div className="offer-cost">
                  {isPurchased ? '✓' : `🪙${offer.cost}`}
                </div>
              </button>
            );
          })}
        </div>

        <button className="btn-continue" onClick={onContinue}>
          Continue →
        </button>
      </div>
    </div>
  );
}
