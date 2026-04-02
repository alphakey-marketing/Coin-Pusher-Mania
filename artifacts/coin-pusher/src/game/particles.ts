export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: 'spark' | 'coin' | 'explosion';
}

export interface FloatingText {
  id: number;
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  fontSize: number;
}

let particleId = 0;

export function createSparkParticles(x: number, y: number, color: string, count = 8): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
    const speed = 1.5 + Math.random() * 2.5;
    particles.push({
      id: particleId++,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1,
      life: 1,
      maxLife: 1,
      color,
      size: 2 + Math.random() * 3,
      type: 'spark',
    });
  }
  return particles;
}

export function createExplosionParticles(x: number, y: number, count = 20): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 1;
    const speed = 2 + Math.random() * 5;
    particles.push({
      id: particleId++,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      life: 1,
      maxLife: 1,
      color: i % 2 === 0 ? '#ff6644' : '#ffcc22',
      size: 3 + Math.random() * 5,
      type: 'explosion',
    });
  }
  return particles;
}

export function createFloatingText(
  x: number, y: number, text: string, color: string, fontSize = 16
): FloatingText {
  return {
    id: particleId++,
    x,
    y,
    vy: -1.2,
    text,
    color,
    life: 1,
    maxLife: 1,
    fontSize,
  };
}

export function updateParticles(particles: Particle[], dt: number): Particle[] {
  return particles
    .map(p => ({
      ...p,
      x: p.x + p.vx,
      y: p.y + p.vy,
      vy: p.vy + 0.12,
      vx: p.vx * 0.96,
      life: p.life - dt * 0.035,
    }))
    .filter(p => p.life > 0);
}

export function updateFloatingTexts(texts: FloatingText[], dt: number): FloatingText[] {
  return texts
    .map(t => ({
      ...t,
      y: t.y + t.vy,
      vy: t.vy * 0.96,
      life: t.life - dt * 0.022,
    }))
    .filter(t => t.life > 0);
}
