// Every tuning number and colour in one place. The world is a fixed 2560x1920 city;
// the camera shows a 1280x720 window of it, scaled to the browser window.
export const STEP = 1 / 60;

export const WORLD = { width: 2560, height: 1920 };
export const VIEW = { width: 1280, height: 720 };

/** Roads run on a grid; a road's centre line sits at ROAD_ORIGIN + i * ROAD_GAP. */
export const ROAD = { origin: 160, gap: 320, width: 96, lane: 24 };
export const ROAD_XS = [160, 480, 800, 1120, 1440, 1760, 2080, 2400];
export const ROAD_YS = [160, 480, 800, 1120, 1440, 1760];

export const PLAYER = {
  radius: 11,
  walkSpeed: 230,
  runSpeed: 330,
  health: 100,
  punchDamage: 34,
  punchRange: 46,
  pistolDamage: 34,
  pistolRange: 460,
  pistolAmmo: 24,
  stealTime: 1.2,
};

export const CAR = {
  length: 46,
  width: 22,
  maxSpeed: 520,
  policeMaxSpeed: 500,
  accel: 420,
  brake: 700,
  reverseMax: 180,
  turnRate: 2.6,
  drag: 0.55,
};

export const TRAFFIC = { count: 14, speed: 150, speedJitter: 60 };
export const PEDS = { count: 18, speed: 55, speedJitter: 25 };

/** Wanted: heat 0-100; each star is 20 heat. Crimes add heat, hiding sheds it. */
export const WANTED = {
  stealHeat: 22,
  hitPedHeat: 25,
  shootHeat: 12,
  killCopHeat: 40,
  decayPerSecond: 3.5,
  quietSeconds: 8,
};

export const MISSIONS = [
  { id: 1, name: 'The Package', reward: 150 },
  { id: 2, name: 'The Tail', reward: 250 },
  { id: 3, name: 'The Getaway', reward: 400 },
];

export const TAXI = { minFare: 20, maxFare: 60, tipSeconds: 45 };

export const PALETTE = {
  grass: '#4d7a3a',
  grassAlt: '#557f40',
  road: '#33373f',
  roadEdge: '#23262c',
  lane: '#d8c95a',
  sidewalk: '#8d8578',
  water: '#2b6ea6',
  sand: '#d9c48f',
  building: ['#b5673f', '#7a6a9e', '#4f7d8c', '#a08a4f', '#8c4f5e', '#5e7d4f', '#6b6f7a'],
  roof: '#3a3f47',
  tree: '#2e5d2a',
  player: '#e8b23a',
  playerCar: '#e8b23a',
  police: '#2b4fd8',
  target: '#8a2be2',
  taxi: '#f2c200',
  health: '#3ddc5a',
  ammo: '#f2a541',
  text: '#f4f1e6',
  muted: '#b9b3a4',
  panel: 'rgba(12, 14, 20, 0.78)',
  star: '#ffd94a',
  marker: '#ff5a3c',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export const SAVE_KEY = 'solmar-city.save.v1';
