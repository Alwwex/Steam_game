// Global tuning constants. Everything that affects balance lives here so it is easy to tweak.

export const GAME_NAME = 'QUBIT CREW';
export const VERSION = '0.1.0';
export const PROTOCOL = 3;          // bump when network messages change
export const MAX_PLAYERS = 6;
export const DEFAULT_PORT = 7777;

export const TILE = 3;              // metres per grid cell
export const WALL_H = 3.6;          // ceiling height

// Player
export const P = {
  R: 0.38,            // collision radius
  EYE: 1.22,          // camera height (the crew are cats, so the world feels big)
  WALK: 4.3,
  SPRINT: 6.7,
  JUMP: 5.6,
  GRAV: 17,
  STAMINA: 4.5,       // seconds of sprint
  STAMINA_REGEN: 0.85,
  TUNNEL_DIST: 5.6,   // metres, passes through one wall tile
  TUNNEL_CD: 6,
  CARRY: 2,
};

// Flashlight = the "measurement device". Whatever it lights up is observed.
export const BEAM = {
  RANGE: 17,
  HALF_ANGLE: 0.42,   // radians
  QUBIT_RANGE: 11,
};

// Balance
export const BAL = {
  drainBase: 0.25,        // coherence % lost per second on shift 1
  drainPerShift: 0.012,
  deposit: 5,             // coherence restored per delivered qubit
  hit: 16,                // coherence lost when an anomaly catches someone
  cloudDps: 5,
  quotaBase: 4,
  quotaPerShift: 2,
  quotaMax: 18,
  lurkerSpeed: 5.2,
  lurkerBanish: 2.6,      // seconds of continuous observation needed to banish
  lurkerRespawn: 16,
  thiefSpeed: 5.6,
  cloudSpeed: 1.2,
  cloudRadius: 3.3,
  scatterTime: 3,
  credit: 10,
  entangleWindow: 20,     // seconds to deliver the entangled partner for the bonus
  entangleBonus: 25,
  safeRadius: 7.2,        // anomalies cannot come this close to the core
};

// Team upgrades bought between shifts.
export const UPGRADES = [
  { key: 'lens',    max: 3, cost: [50, 90, 150] },
  { key: 'tunnel',  max: 3, cost: [50, 90, 150] },
  { key: 'carry',   max: 3, cost: [70, 130, 200] },
  { key: 'stamina', max: 3, cost: [40, 80, 130] },
  { key: 'ecc',     max: 3, cost: [70, 130, 200] },
  { key: 'measure', max: 3, cost: [60, 110, 170] },
  { key: 'shield',  max: 3, cost: [60, 110, 170] },
];

// Suit colours players can pick (free for everyone).
export const SUIT_COLORS = [0xf2c230, 0xe8553a, 0x3fb7e8, 0x62d66a, 0xb06be8, 0xf08cc0, 0xf5f5f5, 0x40d8c0];

// If true every player must own a DLC sector to play it. Default: the host owning it is enough,
// so friends can try a sector before they buy it. Cosmetics always need personal ownership.
export const DLC_REQUIRE_ALL_PLAYERS = false;

export const NET = { STATE_HZ: 15, SNAP_HZ: 12, SIM_HZ: 30 };
