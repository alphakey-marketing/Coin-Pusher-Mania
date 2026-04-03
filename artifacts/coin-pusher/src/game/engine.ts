import Matter from 'matter-js';
import { CONFIG, COIN_DEFS, type CoinTypeId } from './config';

export interface CoinBody {
  id: string;
  typeId: CoinTypeId;
  body: Matter.Body;
  createdAt: number;
  hasPaidOut: boolean;
  isBomb: boolean;
  fuseEndsAt: number | null;
  hasLanded: boolean;
  isExploding: boolean;
}

interface PhysicsWorld {
  engine: Matter.Engine;
  runner: Matter.Runner;
  shelf: Matter.Body;
  leftWall: Matter.Body;
  rightWall: Matter.Body;
  backWall: Matter.Body;
  frontLip: Matter.Body;
  payoutSensor: Matter.Body;
  coins: Map<string, CoinBody>;
  shelfDirection: 1 | -1;
  shelfY: number;
  onPayout: (coin: CoinBody) => void;
  onBombExplode: (coin: CoinBody) => void;
  onCoinLand: (coin: CoinBody) => void;
}

let world: PhysicsWorld | null = null;
let coinIdCounter = 0;

export function initPhysics(
  onPayout: (coin: CoinBody) => void,
  onBombExplode: (coin: CoinBody) => void,
  onCoinLand: (coin: CoinBody) => void,
): void {
  const engine = Matter.Engine.create({
    gravity: { x: 0, y: CONFIG.GRAVITY },
    positionIterations: 10,
    velocityIterations: 8,
  });

  const W = CONFIG.BOARD_WIDTH;
  const H = CONFIG.BOARD_HEIGHT;
  const T = CONFIG.WALL_THICKNESS;
  const shelfY = H * CONFIG.SHELF_Y_START;

  const leftWall = Matter.Bodies.rectangle(-T / 2, H / 2, T, H, { isStatic: true, label: 'wall' });
  const rightWall = Matter.Bodies.rectangle(W + T / 2, H / 2, T, H, { isStatic: true, label: 'wall' });
  const backWall = Matter.Bodies.rectangle(W / 2, -T / 2, W + T * 2, T, { isStatic: true, label: 'wall' });
  // frontLip is the payout edge — a sensor that marks where coins exit into the payout zone
  const frontLip = Matter.Bodies.rectangle(W / 2, H - T / 2, W, T, { isStatic: true, isSensor: true, label: 'frontLip', friction: 0.05, restitution: 0.1 });
  const shelf = Matter.Bodies.rectangle(W / 2, shelfY, W - T * 2, CONFIG.SHELF_HEIGHT, {
    isStatic: true,
    label: 'shelf',
    friction: 0.2,
    frictionStatic: 0.2,
  });

  const payoutSensor = Matter.Bodies.rectangle(W / 2, H + 20, W, 40, {
    isStatic: true,
    isSensor: true,
    label: 'payoutSensor',
  });

  Matter.Composite.add(engine.world, [leftWall, rightWall, backWall, frontLip, shelf, payoutSensor]);

  const runner = Matter.Runner.create();

  world = {
    engine,
    runner,
    shelf,
    leftWall,
    rightWall,
    backWall,
    frontLip,
    payoutSensor,
    coins: new Map(),
    shelfDirection: 1,
    shelfY: H * CONFIG.SHELF_Y_START,
    onPayout,
    onBombExplode,
    onCoinLand,
  };

  Matter.Events.on(engine, 'collisionStart', (event) => {
    if (!world) return;
    const pairs = event.pairs;
    for (const pair of pairs) {
      const { bodyA, bodyB } = pair;

      const coinA = getCoinByBody(bodyA);
      const coinB = getCoinByBody(bodyB);

      if (coinA && !coinA.hasLanded && (bodyB.label === 'shelf' || bodyB.label === 'frontLip' || coinB)) {
        coinA.hasLanded = true;
        world.onCoinLand(coinA);
      }
      if (coinB && !coinB.hasLanded && (bodyA.label === 'shelf' || bodyA.label === 'frontLip' || coinA)) {
        coinB.hasLanded = true;
        world.onCoinLand(coinB);
      }
    }
  });
}

function getCoinByBody(body: Matter.Body): CoinBody | null {
  if (!world) return null;
  for (const coin of world.coins.values()) {
    if (coin.body.id === body.id) return coin;
  }
  return null;
}

export function stepPhysics(dt: number, bombRadiusMultiplier = 1): void {
  if (!world) return;
  const W = CONFIG.BOARD_WIDTH;
  const H = CONFIG.BOARD_HEIGHT;

  Matter.Runner.tick(world.runner, world.engine, dt);

  const minY = H * CONFIG.SHELF_Y_START;
  const maxY = minY + CONFIG.SHELF_TRAVEL;

  world.shelfY += CONFIG.SHELF_SPEED * world.shelfDirection;
  if (world.shelfY >= maxY) {
    world.shelfY = maxY;
    world.shelfDirection = -1;
  } else if (world.shelfY <= minY) {
    world.shelfY = minY;
    world.shelfDirection = 1;
  }
  Matter.Body.setPosition(world.shelf, { x: W / 2, y: world.shelfY });

  const now = Date.now();
  const toRemove: string[] = [];

  for (const [id, coin] of world.coins) {
    const pos = coin.body.position;

    if (pos.y > CONFIG.PAYOUT_ZONE_Y && !coin.hasPaidOut) {
      coin.hasPaidOut = true;
      world.onPayout(coin);
      toRemove.push(id);
    } else if (pos.y > CONFIG.PAYOUT_ZONE_Y + 40) {
      toRemove.push(id);
    }

    if (pos.x < -20 || pos.x > W + 20) {
      toRemove.push(id);
    }

    if (coin.isBomb && coin.fuseEndsAt && now >= coin.fuseEndsAt && !coin.isExploding) {
      coin.isExploding = true;
      const baseRadius = 90;
      const explodeRadius = baseRadius * bombRadiusMultiplier;
      const baseForce = 0.032;
      const explodeForce = baseForce * bombRadiusMultiplier;

      for (const [otherId, other] of world.coins) {
        if (otherId === id) continue;
        const dx = other.body.position.x - pos.x;
        const dy = other.body.position.y - pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < explodeRadius && dist > 0) {
          const norm = 1 / dist;
          const forceMag = explodeForce * (1 - dist / explodeRadius);
          Matter.Body.applyForce(other.body, other.body.position, {
            x: dx * norm * forceMag,
            y: dy * norm * forceMag - forceMag * 0.3,
          });
        }
      }

      world.onBombExplode(coin);
      toRemove.push(id);
    }
  }

  for (const id of [...new Set(toRemove)]) {
    const coin = world.coins.get(id);
    if (coin) {
      Matter.Composite.remove(world.engine.world, coin.body);
      world.coins.delete(id);
    }
  }
}

export function spawnCoin(typeId: CoinTypeId, x: number, fuseMs: number = CONFIG.BOMB_FUSE_MS): CoinBody | null {
  if (!world) return null;
  const def = COIN_DEFS[typeId];
  const id = `coin_${coinIdCounter++}`;

  const body = Matter.Bodies.circle(x, CONFIG.DROP_ZONE_Y, def.radius, {
    density: def.density,
    restitution: def.restitution,
    friction: def.friction,
    frictionAir: 0.002,
    label: `coin_${typeId}`,
  });

  const jitter = (Math.random() - 0.5) * 8;
  Matter.Body.setVelocity(body, { x: jitter, y: 1 });

  Matter.Composite.add(world.engine.world, body);

  const coin: CoinBody = {
    id,
    typeId,
    body,
    createdAt: Date.now(),
    hasPaidOut: false,
    isBomb: typeId === 'bomb',
    fuseEndsAt: null, // set by setCoinFuse() when bomb lands
    hasLanded: false,
    isExploding: false,
  };

  world.coins.set(id, coin);
  return coin;
}

export function setCoinFuse(coin: CoinBody, fuseMs: number): void {
  coin.fuseEndsAt = Date.now() + fuseMs;
}

export function getCoins(): CoinBody[] {
  if (!world) return [];
  return [...world.coins.values()];
}

export function getShelfX(): number {
  return CONFIG.BOARD_WIDTH / 2;
}

export function getShelfY(): number {
  return world?.shelfY ?? CONFIG.BOARD_HEIGHT * CONFIG.SHELF_Y_START;
}

export function applyMagnetEffect(): void {
  if (!world) return;
  const H = CONFIG.BOARD_HEIGHT;
  const edgeZoneY = H * 0.85;
  for (const coin of world.coins.values()) {
    if (coin.body.position.y > edgeZoneY) {
      Matter.Body.applyForce(coin.body, coin.body.position, {
        x: 0,
        y: 0.0002,
      });
    }
  }
}

export function destroyPhysics(): void {
  if (!world) return;
  Matter.Runner.stop(world.runner);
  Matter.Engine.clear(world.engine);
  world = null;
}

export function getCoinCount(): number {
  return world?.coins.size ?? 0;
}

export function populateInitialCoins(): void {
  if (!world) return;
  const H = CONFIG.BOARD_HEIGHT;
  const def = COIN_DEFS['normal'];
  const r = def.radius;

  // Shelf top surface — the only solid surface coins can rest on
  const shelfTopY = H * CONFIG.SHELF_Y_START - CONFIG.SHELF_HEIGHT / 2 - r;
  // Second layer sitting on top of first layer
  const shelfRow2Y = shelfTopY - r * 2 - 1;

  const placements: { x: number; y: number }[] = [
    // Row 1 on shelf — 7 coins spread across the shelf
    { x: 46,  y: shelfTopY },
    { x: 90,  y: shelfTopY },
    { x: 134, y: shelfTopY },
    { x: 180, y: shelfTopY },
    { x: 226, y: shelfTopY },
    { x: 270, y: shelfTopY },
    { x: 314, y: shelfTopY },
    // Row 2 stacked on row 1 — 4 coins offset for a natural pile
    { x: 68,  y: shelfRow2Y },
    { x: 136, y: shelfRow2Y },
    { x: 204, y: shelfRow2Y },
    { x: 292, y: shelfRow2Y },
  ];

  for (const { x, y } of placements) {
    const id = `coin_${coinIdCounter++}`;
    const body = Matter.Bodies.circle(x, y, r, {
      density: def.density,
      restitution: def.restitution,
      friction: def.friction,
      frictionAir: 0.01,
      label: 'coin_normal',
    });
    Matter.Body.setVelocity(body, { x: 0, y: 0 });
    Matter.Composite.add(world.engine.world, body);

    const coin: CoinBody = {
      id,
      typeId: 'normal',
      body,
      createdAt: Date.now(),
      hasPaidOut: false,
      isBomb: false,
      fuseEndsAt: null,
      hasLanded: true,
      isExploding: false,
    };
    world.coins.set(id, coin);
  }
}
