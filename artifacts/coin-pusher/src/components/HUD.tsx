import { COIN_DEFS } from '../game/config';
import type { CoinTypeId } from '../game/config';
import type { GameState } from '../game/state';

interface HUDProps {
  state: GameState;
  onSelectCoin: (typeId: CoinTypeId) => void;
}

export default function HUD({ state, onSelectCoin }: HUDProps) {
  const progressPct = Math.min(100, (state.score / state.targetScore) * 100);
  const isUrgent = state.dropsRemaining <= 3 && state.phase === 'playing';

  const totalCoinsLeft = state.coinInventory.reduce((sum, e) => sum + e.count, 0);

  return (
    <div className="hud">
      <div className="hud-top">
        <div className="hud-stats">
          <div className="stat-block">
            <span className="stat-label">ROUND</span>
            <span className="stat-value">{state.round}</span>
          </div>
          <div className="stat-block gold-block">
            <span className="stat-label">GOLD</span>
            <span className="stat-value gold-value">🪙 {state.gold}</span>
          </div>
          <div className="stat-block">
            <span className="stat-label">DROPS</span>
            <span className={`stat-value ${isUrgent ? 'urgent' : ''}`}>{state.dropsRemaining + totalCoinsLeft}</span>
          </div>
        </div>

        <div className="score-section">
          <div className="score-row">
            <span className="score-label">SCORE</span>
            <span className="score-num">{state.score}</span>
            <span className="score-target">/ {state.targetScore}</span>
          </div>
          <div className="progress-bar-track">
            <div
              className={`progress-bar-fill ${progressPct >= 100 ? 'complete' : ''}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {state.comboChain >= 2 && state.phase === 'playing' && (
          <div className="combo-display">
            ⚡ CHAIN x{state.comboChain}
          </div>
        )}
      </div>

      <div className="coin-selector">
        {state.coinInventory.map(entry => {
          const def = COIN_DEFS[entry.typeId];
          const isSelected = state.selectedCoinType === entry.typeId && entry.count > 0;
          return (
            <button
              key={entry.typeId}
              className={`coin-btn ${isSelected ? 'selected' : ''} ${entry.count === 0 ? 'empty' : ''}`}
              onClick={() => entry.count > 0 && onSelectCoin(entry.typeId)}
              disabled={entry.count === 0}
              title={def.name}
            >
              <div className="coin-icon-dot" style={{ background: def.color, boxShadow: `0 0 8px ${def.glowColor}` }} />
              <span className="coin-type-name">{def.name.split(' ')[0]}</span>
              <span className="coin-count">×{entry.count}</span>
            </button>
          );
        })}
      </div>

      {state.items.length > 0 && (
        <div className="items-bar">
          {state.items.map(item => (
            <div key={item.id} className="item-chip" title={item.typeId}>
              <span>{getItemIcon(item.typeId)}</span>
              {item.stacks > 1 && <span className="item-stacks">×{item.stacks}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function getItemIcon(typeId: string): string {
  const icons: Record<string, string> = {
    magnet: '🧲',
    multiplierTray: '✖️',
    bombPolish: '💥',
    luckyLip: '🍀',
    heavyMint: '⚡',
  };
  return icons[typeId] ?? '❓';
}
