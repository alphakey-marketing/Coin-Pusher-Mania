interface GameOverScreenProps {
  score: number;
  rounds: number;
  onRestart: () => void;
}

export default function GameOverScreen({ score, rounds, onRestart }: GameOverScreenProps) {
  return (
    <div className="menu-screen">
      <div className="menu-content">
        <div className="menu-logo">💸</div>
        <h1 className="menu-title">GAME OVER</h1>

        <div className="gameover-stats">
          <div className="gameover-stat">
            <span className="gameover-label">TOTAL SCORE</span>
            <span className="gameover-value gold">{score}</span>
          </div>
          <div className="gameover-stat">
            <span className="gameover-label">ROUNDS CLEARED</span>
            <span className="gameover-value">{rounds}</span>
          </div>
        </div>

        {score >= 100 && (
          <div className="gameover-badge">🏆 High Roller!</div>
        )}
        {score >= 50 && score < 100 && (
          <div className="gameover-badge">⭐ Nice Run!</div>
        )}
        {rounds === 0 && (
          <div className="gameover-badge">😅 Better luck next time!</div>
        )}

        <button className="btn-start" onClick={onRestart}>
          ↺ PLAY AGAIN
        </button>
      </div>
    </div>
  );
}
