interface MenuScreenProps {
  onStart: () => void;
}

export default function MenuScreen({ onStart }: MenuScreenProps) {
  return (
    <div className="menu-screen">
      <div className="menu-content">
        <div className="menu-logo">🪙</div>
        <h1 className="menu-title">COIN PUSHER</h1>
        <p className="menu-subtitle">Roguelite Edition</p>

        <div className="menu-desc">
          <p>Drop coins. Build combos. Clear rounds.</p>
          <p>Unlock upgrades and go as far as you can!</p>
        </div>

        <div className="menu-coins">
          <span style={{ color: '#d7b94c', textShadow: '0 0 8px #ffe066' }}>⬤ Normal</span>
          <span style={{ color: '#8a9ab0', textShadow: '0 0 8px #c0ccdd' }}>⬤ Heavy</span>
          <span style={{ color: '#cc4444', textShadow: '0 0 8px #ff8888' }}>⬤ Bomb</span>
          <span style={{ color: '#44bb66', textShadow: '0 0 8px #88ffaa' }}>⬤ Lucky</span>
        </div>

        <button className="btn-start" onClick={onStart}>
          ▶ START GAME
        </button>

        <div className="menu-tips">
          <div className="tip">💡 Tap anywhere on the machine to drop a coin</div>
          <div className="tip">⚡ Get 3 coins out in 1.8s for a CHAIN bonus</div>
          <div className="tip">💣 Bomb coins explode 1.2s after landing</div>
        </div>
      </div>
    </div>
  );
}
