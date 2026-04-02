import { CONFIG, COIN_DEFS } from './config';
import type { CoinBody } from './engine';
import type { Particle, FloatingText } from './particles';

export interface RenderState {
  coins: CoinBody[];
  particles: Particle[];
  floatingTexts: FloatingText[];
  shelfX: number;
  shelfY: number;
  shakeX: number;
  shakeY: number;
  bombFuseProgress: Map<string, number>;
}

export function renderFrame(ctx: CanvasRenderingContext2D, state: RenderState): void {
  const { BOARD_WIDTH: W, BOARD_HEIGHT: H, WALL_THICKNESS: T, SHELF_HEIGHT } = CONFIG;

  ctx.save();
  ctx.translate(state.shakeX, state.shakeY);

  ctx.clearRect(-state.shakeX - 2, -state.shakeY - 2, W + 20, H + 20);

  drawBackground(ctx, W, H);

  drawWalls(ctx, W, H, T);

  drawShelf(ctx, state.shelfX, state.shelfY, W, T, SHELF_HEIGHT);

  drawPayoutZone(ctx, W, H, T);

  for (const coin of state.coins) {
    drawCoin(ctx, coin, state.bombFuseProgress.get(coin.id) ?? 0);
  }

  for (const p of state.particles) {
    drawParticle(ctx, p);
  }

  for (const t of state.floatingTexts) {
    drawFloatingText(ctx, t);
  }

  ctx.restore();
}

function drawBackground(ctx: CanvasRenderingContext2D, W: number, H: number): void {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#1a0a2e');
  grad.addColorStop(0.5, '#150822');
  grad.addColorStop(1, '#0d0517');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = 'rgba(120, 60, 200, 0.06)';
  ctx.lineWidth = 1;
  for (let y = 0; y < H; y += 20) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  for (let x = 0; x < W; x += 20) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
}

function drawWalls(ctx: CanvasRenderingContext2D, W: number, H: number, T: number): void {
  const wallGrad = ctx.createLinearGradient(0, 0, T, 0);
  wallGrad.addColorStop(0, '#2a1150');
  wallGrad.addColorStop(1, '#3d1a72');

  ctx.fillStyle = wallGrad;
  ctx.fillRect(0, 0, T, H);

  const wallGradR = ctx.createLinearGradient(W - T, 0, W, 0);
  wallGradR.addColorStop(0, '#3d1a72');
  wallGradR.addColorStop(1, '#2a1150');
  ctx.fillStyle = wallGradR;
  ctx.fillRect(W - T, 0, T, H);

  ctx.fillStyle = '#2a1150';
  ctx.fillRect(0, 0, W, T);

  ctx.strokeStyle = 'rgba(150, 80, 255, 0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, T, H);
  ctx.strokeRect(W - T, 0, T, H);
}

function drawShelf(ctx: CanvasRenderingContext2D, shelfX: number, shelfY: number, W: number, T: number, shelfHeight: number): void {
  const shelfW = W - T * 2;
  const x = shelfX - shelfW / 2;

  ctx.save();

  const grad = ctx.createLinearGradient(x, shelfY - shelfHeight / 2, x, shelfY + shelfHeight / 2);
  grad.addColorStop(0, '#7c3ded');
  grad.addColorStop(0.5, '#9d60ff');
  grad.addColorStop(1, '#5b2db0');
  ctx.fillStyle = grad;

  ctx.shadowColor = 'rgba(160, 100, 255, 0.7)';
  ctx.shadowBlur = 12;

  ctx.beginPath();
  ctx.roundRect(x, shelfY - shelfHeight / 2, shelfW, shelfHeight, 3);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(200, 150, 255, 0.6)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore();
}

function drawPayoutZone(ctx: CanvasRenderingContext2D, W: number, H: number, T: number): void {
  const grad = ctx.createLinearGradient(0, H - T - 30, 0, H);
  grad.addColorStop(0, 'rgba(255, 200, 50, 0)');
  grad.addColorStop(0.5, 'rgba(255, 200, 50, 0.08)');
  grad.addColorStop(1, 'rgba(255, 200, 50, 0.15)');
  ctx.fillStyle = grad;
  ctx.fillRect(T, H - T - 30, W - T * 2, 30 + T);

  ctx.strokeStyle = 'rgba(255, 200, 50, 0.4)';
  ctx.setLineDash([6, 4]);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(T, H - T - 1);
  ctx.lineTo(W - T, H - T - 1);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = 'rgba(255, 200, 50, 0.3)';
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('PAYOUT ZONE', W / 2, H - T - 10);
}

function drawCoin(ctx: CanvasRenderingContext2D, coin: CoinBody, fuseProgress: number): void {
  const def = COIN_DEFS[coin.typeId];
  const pos = coin.body.position;
  const angle = coin.body.angle;
  const r = def.radius;

  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate(angle);

  if (coin.isBomb && coin.fuseEndsAt && fuseProgress > 0) {
    const pulse = Math.sin(Date.now() * 0.015 * (1 + fuseProgress * 3)) * 0.5 + 0.5;
    ctx.shadowColor = `rgba(255, 80, 80, ${0.3 + pulse * 0.5})`;
    ctx.shadowBlur = 8 + pulse * 14;
  } else {
    ctx.shadowColor = def.glowColor;
    ctx.shadowBlur = 6;
  }

  const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r);
  const baseColor = def.color;
  grad.addColorStop(0, lightenColor(baseColor, 40));
  grad.addColorStop(0.7, baseColor);
  grad.addColorStop(1, darkenColor(baseColor, 30));

  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.shadowBlur = 0;

  ctx.beginPath();
  ctx.arc(-r * 0.25, -r * 0.3, r * 0.2, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fill();

  if (coin.typeId === 'bomb') {
    ctx.fillStyle = '#1a0a0a';
    ctx.font = `bold ${Math.floor(r * 0.85)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('💣', 1, 1);

    if (coin.fuseEndsAt && fuseProgress > 0) {
      ctx.beginPath();
      ctx.arc(0, 0, r - 2, -Math.PI / 2, -Math.PI / 2 + (1 - fuseProgress) * Math.PI * 2);
      ctx.strokeStyle = fuseProgress > 0.7 ? '#ff3333' : '#ffcc00';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  } else if (coin.typeId === 'heavy') {
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = `bold ${Math.floor(r * 0.65)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚡', 0, 1);
  } else if (coin.typeId === 'lucky') {
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = `bold ${Math.floor(r * 0.65)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★', 0, 1);
  } else {
    ctx.fillStyle = 'rgba(120, 80, 0, 0.6)';
    ctx.font = `bold ${Math.floor(r * 0.6)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('¢', 0, 1);
  }

  ctx.restore();
}

function drawParticle(ctx: CanvasRenderingContext2D, p: Particle): void {
  ctx.save();
  ctx.globalAlpha = p.life;
  ctx.fillStyle = p.color;
  ctx.shadowColor = p.color;
  ctx.shadowBlur = 4;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawFloatingText(ctx: CanvasRenderingContext2D, t: FloatingText): void {
  ctx.save();
  ctx.globalAlpha = t.life;
  ctx.fillStyle = t.color;
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 3;
  ctx.font = `bold ${t.fontSize}px 'Arial', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.strokeText(t.text, t.x, t.y);
  ctx.fillText(t.text, t.x, t.y);
  ctx.restore();
}

function lightenColor(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.min(255, r + amount)}, ${Math.min(255, g + amount)}, ${Math.min(255, b + amount)})`;
}

function darkenColor(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.max(0, r - amount)}, ${Math.max(0, g - amount)}, ${Math.max(0, b - amount)})`;
}
