// The city of Solmar and everything in it: roads and buildings, traffic and pedestrians,
// the player's car, the police and the wanted level, combat, missions and taxi fares.
// All coordinates are world units; the renderer follows the player with a camera.
import { CAR, MISSIONS, PALETTE, PEDS, PLAYER, ROAD_XS, ROAD_YS, TAXI, TRAFFIC, WANTED, WORLD } from './config.js';
import { createRandom } from './random.js';

export const EVENT_BUSTED = 1;
export const EVENT_WASTED = 2;
export const EVENT_MISSION = 4;
export const EVENT_CRASH = 8;

const CAR_COLORS = ['#c94f3d', '#3d7ac9', '#4fae5e', '#d8d3c8', '#7a5ea8', '#c98a3d', '#5a6b7a', '#3dc9a8'];
const PED_COLORS = ['#e8dcc8', '#c9a06a', '#8a6a4f', '#6a8ac9', '#c96a8a', '#7ac96a'];
const DOCKS = { x: 220, y: 1690 };
const CLUB = { x: 2340, y: 240 };
const GARAGE = { x: 480, y: 1120 };
const CLINIC = { x: 800, y: 480 };
const GUNSHOP = { x: 1760, y: 1440 };

function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function angleTo(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); }

function circleHitsRect(cx, cy, r, rect) {
  const nx = clamp(cx, rect.x, rect.x + rect.w);
  const ny = clamp(cy, rect.y, rect.y + rect.h);
  return (cx - nx) * (cx - nx) + (cy - ny) * (cy - ny) < r * r;
}

function pushCircleOutOfRect(circle, r, rect) {
  const nx = clamp(circle.x, rect.x, rect.x + rect.w);
  const ny = clamp(circle.y, rect.y, rect.y + rect.h);
  const dx = circle.x - nx;
  const dy = circle.y - ny;
  const d = Math.hypot(dx, dy);
  if (d >= r || d === 0) return false;
  circle.x = nx + (dx / d) * r;
  circle.y = ny + (dy / d) * r;
  return true;
}

function nearestRoad(value, roads) {
  let best = roads[0];
  for (const road of roads) if (Math.abs(road - value) < Math.abs(best - value)) best = road;
  return best;
}

/** Does the segment (x1,y1)-(x2,y2) cross the rectangle? (Slab method.) */
function segmentHitsRect(x1, y1, x2, y2, rect) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tmin = 0;
  let tmax = 1;
  if (Math.abs(dx) < 1e-9) {
    if (x1 < rect.x || x1 > rect.x + rect.w) return false;
  } else {
    let t1 = (rect.x - x1) / dx;
    let t2 = (rect.x + rect.w - x1) / dx;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  if (Math.abs(dy) < 1e-9) {
    if (y1 < rect.y || y1 > rect.y + rect.h) return false;
  } else {
    let t1 = (rect.y - y1) / dy;
    let t2 = (rect.y + rect.h - y1) / dy;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  return true;
}

export function createWorld(random) {
  const state = {
    time: 0,
    cash: 40,
    health: PLAYER.health,
    ammo: PLAYER.pistolAmmo,
    heat: 0,
    quietTimer: 0,
    busted: false,
    wasted: false,
    storyDone: false,
    dialogue: null,
    toast: null,
    player: { x: 800, y: 800, angle: -Math.PI / 2, inCar: null, aim: 0, stealTimer: 0, stealing: null, hurtTimer: 0 },
    cars: [],
    peds: [],
    cops: [],
    policeCars: [],
    pickups: [],
    effects: [],
    buildings: [],
    trees: [],
    mission: { id: 0, stage: 0, marker: null, objective: 'Find work: go to the yellow marker', target: null, tailTime: 0, tailLost: 0, spotted: 0 },
    taxi: { state: 'none', fare: null, dest: null, timer: 0, pay: 0 },
    camera: { x: 800, y: 800 },
    stats: { carsStolen: 0, faresDone: 0, pedsHit: 0 },
  };

  function buildCity() {
    state.buildings = [];
    state.trees = [];
    let bi = 0;
    for (let ix = 0; ix < ROAD_XS.length - 1; ix += 1) {
      for (let iy = 0; iy < ROAD_YS.length - 1; iy += 1) {
        const x0 = ROAD_XS[ix] + 62;
        const x1 = ROAD_XS[ix + 1] - 62;
        const y0 = ROAD_YS[iy] + 62;
        const y1 = ROAD_YS[iy + 1] - 62;
        if (y1 > 1800) continue; // the beach strip stays open
        const kind = random();
        if (kind < 0.18) {
          // A park: trees only, no building.
          for (let t = 0; t < 5; t += 1) {
            state.trees.push({ x: x0 + 20 + random() * (x1 - x0 - 40), y: y0 + 20 + random() * (y1 - y0 - 40), r: 12 + random() * 8 });
          }
          continue;
        }
        const w = (x1 - x0) * (0.45 + random() * 0.3);
        const h = (y1 - y0) * (0.45 + random() * 0.3);
        const x = x0 + (x1 - x0 - w) / 2 + (random() - 0.5) * 20;
        const y = y0 + (y1 - y0 - h) / 2 + (random() - 0.5) * 20;
        state.buildings.push({ x, y, w, h, color: PALETTE.building[bi % PALETTE.building.length], roof: PALETTE.roof });
        bi += 1;
        for (let t = 0; t < 2; t += 1) {
          state.trees.push({ x: x0 + 16 + random() * (x1 - x0 - 32), y: y0 + 16 + random() * (y1 - y0 - 32), r: 10 + random() * 6 });
        }
      }
    }
    for (let t = 0; t < 14; t += 1) {
      state.trees.push({ x: 60 + random() * (WORLD.width - 120), y: 1820 + random() * 70, r: 12 + random() * 8 });
    }
  }

  function randomSidewalkPoint() {
    const horizontal = random() < 0.5;
    if (horizontal) {
      const road = ROAD_YS[Math.floor(random() * ROAD_YS.length)];
      return { x: 80 + random() * (WORLD.width - 160), y: road + (random() < 0.5 ? -66 : 66) };
    }
    const road = ROAD_XS[Math.floor(random() * ROAD_XS.length)];
    return { x: road + (random() < 0.5 ? -66 : 66), y: 80 + random() * (WORLD.height - 260) };
  }

  function spawnCar(kind, x, y, angle) {
    const car = {
      x, y, angle, speed: 0,
      color: kind === 'police' ? PALETTE.police : kind === 'taxi' ? PALETTE.taxi : kind === 'target' ? PALETTE.target : CAR_COLORS[Math.floor(random() * CAR_COLORS.length)],
      kind, driver: kind === 'parked' ? null : 'traffic',
      maxSpeed: kind === 'police' ? CAR.policeMaxSpeed : CAR.maxSpeed,
      axis: null, road: 0, dir: 1, turnCooldown: 0,
    };
    state.cars.push(car);
    return car;
  }

  function spawnTrafficCar() {
    const horizontal = random() < 0.5;
    if (horizontal) {
      const road = ROAD_YS[Math.floor(random() * ROAD_YS.length)];
      const dir = random() < 0.5 ? 1 : -1;
      const car = spawnCar('traffic', 80 + random() * (WORLD.width - 160), road + 24 * dir, dir > 0 ? 0 : Math.PI);
      car.axis = 'h'; car.road = road; car.dir = dir; car.speed = TRAFFIC.speed + (random() - 0.5) * TRAFFIC.speedJitter;
    } else {
      const road = ROAD_XS[Math.floor(random() * ROAD_XS.length)];
      const dir = random() < 0.5 ? 1 : -1;
      const car = spawnCar('traffic', road + 24 * dir, 80 + random() * (WORLD.height - 260), dir > 0 ? Math.PI / 2 : -Math.PI / 2);
      car.axis = 'v'; car.road = road; car.dir = dir; car.speed = TRAFFIC.speed + (random() - 0.5) * TRAFFIC.speedJitter;
    }
    return state.cars[state.cars.length - 1];
  }

  function spawnPed(x, y) {
    const p = x === undefined ? randomSidewalkPoint() : { x, y };
    // Pedestrians walk the sidewalks: they keep to a lane beside a road and only turn
    // at intersections, so they stay off the carriageway unless they flee.
    const horizontal = random() < 0.5;
    const ped = {
      x: p.x, y: p.y, angle: random() * Math.PI * 2,
      speed: PEDS.speed + (random() - 0.5) * PEDS.speedJitter,
      color: PED_COLORS[Math.floor(random() * PED_COLORS.length)],
      state: 'walk', dead: false, deadTimer: 0, fleeTimer: 0,
      axis: horizontal ? 'h' : 'v',
      road: horizontal ? nearestRoad(p.y, ROAD_YS) : nearestRoad(p.x, ROAD_XS),
      dir: random() < 0.5 ? 1 : -1,
      offset: (random() < 0.5 ? -66 : 66),
    };
    if (ped.axis === 'h') ped.y = ped.road + ped.offset;
    else ped.x = ped.road + ped.offset;
    state.peds.push(ped);
    return ped;
  }

  function spawnCop(x, y) {
    const cop = { x, y, angle: 0, speed: 265, bustTimer: 0, lostTimer: 0 };
    state.cops.push(cop);
    return cop;
  }

  function spawnPoliceCar() {
    const p = state.player;
    const angle = random() * Math.PI * 2;
    const x = clamp(p.x + Math.cos(angle) * 700, 100, WORLD.width - 100);
    const y = clamp(p.y + Math.sin(angle) * 500, 100, WORLD.height - 220);
    const car = spawnCar('police', x, y, angleTo(x, y, p.x, p.y));
    car.driver = 'police';
    car.lostTimer = 0;
    car.chaseTimer = 0; // a cruiser breaks off after a long chase, so escape is possible
    state.policeCars.push(car);
    return car;
  }

  function addPickup(kind, x, y) {
    state.pickups.push({ kind, x, y, respawn: 0 });
  }

  function setDialogue(speaker, text, seconds) {
    state.dialogue = { speaker, text, t: seconds || 4 };
  }

  function setToast(text, seconds) {
    state.toast = { text, t: seconds || 3 };
  }

  function addHeat(amount) {
    state.heat = clamp(state.heat + amount, 0, 100);
    state.quietTimer = 0;
  }

  function wantedStars() {
    return Math.min(5, Math.floor(state.heat / 20));
  }

  function startMission(id) {
    const mission = state.mission;
    mission.id = id;
    mission.stage = 0;
    mission.tailTime = 0;
    mission.tailLost = 0;
    mission.spotted = 0;
    if (id === 1) {
      mission.marker = { ...DOCKS };
      mission.objective = 'Mission 1 — The Package: pick up the case at the docks';
      setDialogue('Marco', 'Danny, a case is waiting at the south docks. Bring it to The Marlin Club, no questions.', 5);
    } else if (id === 2) {
      const target = spawnCar('target', state.player.x + 260, nearestRoad(state.player.y, ROAD_YS), 0);
      target.driver = 'target';
      mission.target = target;
      mission.marker = { x: target.x, y: target.y };
      mission.objective = 'Mission 2 — The Tail: follow the purple car, stay close but unseen';
      setDialogue('Marco', 'That purple coupe belongs to a snitch. Tail it — close enough to see, far enough to stay invisible.', 5);
    } else if (id === 3) {
      addHeat(60);
      mission.marker = { ...GARAGE };
      mission.objective = 'Mission 3 — The Getaway: lose the heat, reach your garage';
      setDialogue('Marco', 'The whole force is on you. Get to the garage and lay low. Do not get busted.', 5);
    }
  }

  function completeMission() {
    const mission = state.mission;
    const reward = MISSIONS[mission.id - 1].reward;
    state.cash += reward;
    setToast(`Mission complete! +$${reward}`, 4);
    if (mission.id === 3) {
      state.storyDone = true;
      mission.objective = 'Story complete. Free roam: fares, chaos, or just drive.';
      mission.marker = null;
      setDialogue('Marco', 'Clean. You are the best wheelman in Solmar now, Danny.', 5);
      return EVENT_MISSION;
    }
    startMission(mission.id + 1);
    return EVENT_MISSION;
  }

  function failTail(reason) {
    const mission = state.mission;
    mission.tailTime = 0;
    mission.tailLost = 0;
    setToast(reason, 3);
    const target = mission.target;
    if (target) {
      target.x = clamp(state.player.x + 300, 100, WORLD.width - 100);
      target.y = nearestRoad(state.player.y, ROAD_YS);
      target.speed = 0;
    }
  }

  function spawnFare() {
    const p = randomSidewalkPoint();
    const fare = spawnPed(p.x, p.y);
    fare.state = 'fare';
    state.taxi.fare = fare;
    state.taxi.state = 'waiting';
    setToast('A fare is waiting — drive close and press T', 4);
  }

  function reset() {
    state.time = 0;
    state.cash = 40;
    state.health = PLAYER.health;
    state.ammo = PLAYER.pistolAmmo;
    state.heat = 0;
    state.quietTimer = 0;
    state.busted = false;
    state.wasted = false;
    state.storyDone = false;
    state.dialogue = null;
    state.toast = null;
    state.player = { x: 800, y: 800, angle: -Math.PI / 2, inCar: null, aim: 0, stealTimer: 0, stealing: null, hurtTimer: 0 };
    state.cars = [];
    state.peds = [];
    state.cops = [];
    state.policeCars = [];
    state.pickups = [];
    state.effects = [];
    state.mission = { id: 0, stage: 0, marker: { x: 1120, y: 480 }, objective: 'Find work: go to the yellow marker to meet Marco', target: null, tailTime: 0, tailLost: 0, spotted: 0 };
    state.taxi = { state: 'none', fare: null, dest: null, timer: 0, pay: 0 };
    buildCity();
    for (let i = 0; i < TRAFFIC.count; i += 1) spawnTrafficCar();
    for (let i = 0; i < PEDS.count; i += 1) spawnPed();
    // Parked cars the player can take without a fuss.
    spawnCar('parked', 848, 800, 0);
    spawnCar('parked', 1120, 540, Math.PI / 2);
    spawnCar('parked', 480, 1180, 0);
    spawnCar('taxi', 1440, 860, Math.PI);
    addPickup('health', CLINIC.x, CLINIC.y);
    addPickup('ammo', GUNSHOP.x, GUNSHOP.y);
    state.camera = { x: state.player.x, y: state.player.y };
  }

  function collideBuildings(circle, radius) {
    let hit = false;
    for (const b of state.buildings) {
      if (pushCircleOutOfRect(circle, radius, b)) hit = true;
    }
    circle.x = clamp(circle.x, 20, WORLD.width - 20);
    circle.y = clamp(circle.y, 20, WORLD.height - 20);
    return hit;
  }

  function nearestCar(x, y, maxDist) {
    let best = null;
    let bestD = maxDist;
    for (const car of state.cars) {
      const d = dist(x, y, car.x, car.y);
      if (d < bestD) { bestD = d; best = car; }
    }
    return best;
  }

  function stepTraffic(dt) {
    for (const car of state.cars) {
      if (car.kind !== 'traffic' && car.kind !== 'target') continue;
      car.turnCooldown -= dt;
      // Slow for a car ahead in the same lane.
      let blocked = false;
      for (const other of state.cars) {
        if (other === car || other.kind === 'parked') continue;
        const dx = other.x - car.x;
        const dy = other.y - car.y;
        const ahead = car.axis === 'h' ? dx * car.dir : dy * car.dir;
        const side = car.axis === 'h' ? Math.abs(dy) : Math.abs(dx);
        if (ahead > 0 && ahead < 70 && side < 30) { blocked = true; break; }
      }
      const want = blocked ? 0 : (car.kind === 'target' ? 200 : car.speed);
      if (car.axis === 'h') {
        car.x += car.dir * want * dt;
        car.angle = car.dir > 0 ? 0 : Math.PI;
        if (car.turnCooldown <= 0) {
          const cross = nearestRoad(car.x, ROAD_XS);
          if (Math.abs(car.x - cross) < 24 && random() < 0.02) {
            car.axis = 'v'; car.road = cross; car.dir = random() < 0.5 ? 1 : -1;
            car.turnCooldown = 4;
          }
        }
        if (car.x < 60 || car.x > WORLD.width - 60) car.dir *= -1;
      } else {
        car.y += car.dir * want * dt;
        car.angle = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
        if (car.turnCooldown <= 0) {
          const cross = nearestRoad(car.y, ROAD_YS);
          if (Math.abs(car.y - cross) < 24 && random() < 0.02) {
            car.axis = 'h'; car.road = cross; car.dir = random() < 0.5 ? 1 : -1;
            car.turnCooldown = 4;
          }
        }
        if (car.y < 60 || car.y > WORLD.height - 100) car.dir *= -1;
      }
    }
    // Keep the streets full: replace traffic that drifted away.
    if (state.cars.filter((c) => c.kind === 'traffic').length < TRAFFIC.count) spawnTrafficCar();
  }

  function stepPeds(dt) {
    const p = state.player;
    for (const ped of state.peds) {
      if (ped.dead) { ped.deadTimer -= dt; continue; }
      const playerCar = p.inCar;
      const threatX = playerCar ? playerCar.x : p.x;
      const threatY = playerCar ? playerCar.y : p.y;
      const threatSpeed = playerCar ? Math.abs(playerCar.speed) : 0;
      const dThreat = dist(ped.x, ped.y, threatX, threatY);
      if ((threatSpeed > 300 && dThreat < 110) || ped.fleeTimer > 0) {
        ped.state = 'flee';
        ped.fleeTimer = Math.max(ped.fleeTimer - dt, 0);
        ped.angle = angleTo(threatX, threatY, ped.x, ped.y);
        ped.x += Math.cos(ped.angle) * ped.speed * 1.7 * dt;
        ped.y += Math.sin(ped.angle) * ped.speed * 1.7 * dt;
      } else if (ped.state === 'fare') {
        // Waiting fares stand still and wave.
      } else {
        ped.state = 'walk';
        // Drift back to the sidewalk lane after fleeing.
        if (ped.axis === 'h') ped.y += (ped.road + ped.offset - ped.y) * Math.min(1, dt * 2);
        else ped.x += (ped.road + ped.offset - ped.x) * Math.min(1, dt * 2);
        if (ped.axis === 'h') {
          ped.x += ped.dir * ped.speed * dt;
          ped.angle = ped.dir > 0 ? 0 : Math.PI;
          const cross = nearestRoad(ped.x, ROAD_XS);
          if (Math.abs(ped.x - cross) < 24 && random() < 0.02) {
            ped.axis = 'v'; ped.road = cross; ped.dir = random() < 0.5 ? 1 : -1;
            ped.offset = random() < 0.5 ? -66 : 66;
            ped.x = cross + ped.offset;
          }
          if (ped.x < 60 || ped.x > WORLD.width - 60) ped.dir *= -1;
        } else {
          ped.y += ped.dir * ped.speed * dt;
          ped.angle = ped.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
          const cross = nearestRoad(ped.y, ROAD_YS);
          if (Math.abs(ped.y - cross) < 24 && random() < 0.02) {
            ped.axis = 'h'; ped.road = cross; ped.dir = random() < 0.5 ? 1 : -1;
            ped.offset = random() < 0.5 ? -66 : 66;
            ped.y = cross + ped.offset;
          }
          if (ped.y < 60 || ped.y > WORLD.height - 110) ped.dir *= -1;
        }
      }
      ped.x = clamp(ped.x, 30, WORLD.width - 30);
      ped.y = clamp(ped.y, 30, WORLD.height - 110);
      for (const b of state.buildings) pushCircleOutOfRect(ped, 9, b);
    }
    state.peds = state.peds.filter((ped) => !ped.dead || ped.deadTimer > 0);
    if (state.peds.filter((ped) => !ped.dead && ped.state !== 'fare').length < PEDS.count) spawnPed();
  }

  function stepPolice(dt) {
    const p = state.player;
    const stars = wantedStars();
    const px = p.inCar ? p.inCar.x : p.x;
    const py = p.inCar ? p.inCar.y : p.y;
    // Foot cops chase on foot; police cars chase whenever there is heat.
    const wantCops = stars > 0 && !p.inCar ? Math.min(stars, 3) : 0;
    while (state.cops.length < wantCops) {
      const a = random() * Math.PI * 2;
      spawnCop(clamp(px + Math.cos(a) * 420, 60, WORLD.width - 60), clamp(py + Math.sin(a) * 320, 60, WORLD.height - 140));
    }
    if (stars === 0) state.cops = [];
    for (let i = state.cops.length - 1; i >= 0; i -= 1) {
      const cop = state.cops[i];
      cop.angle = angleTo(cop.x, cop.y, px, py);
      cop.x += Math.cos(cop.angle) * cop.speed * dt;
      cop.y += Math.sin(cop.angle) * cop.speed * dt;
      for (const b of state.buildings) pushCircleOutOfRect(cop, 10, b);
      const dCop = dist(cop.x, cop.y, px, py);
      // A cop who loses the player for a while gives up and leaves.
      if (dCop > 600) {
        cop.lostTimer += dt;
        if (cop.lostTimer > 5) { state.cops.splice(i, 1); continue; }
      } else {
        cop.lostTimer = 0;
      }
      if (dCop < 34) {
        cop.bustTimer += dt;
        if (cop.bustTimer > 1.2) {
          state.busted = true;
          return EVENT_BUSTED;
        }
      } else {
        cop.bustTimer = Math.max(0, cop.bustTimer - dt * 2);
      }
    }
    const wantCars = stars > 0 ? Math.min(stars, 3) : 0;
    state.policeRespawn = Math.max(0, (state.policeRespawn || 0) - dt);
    while (state.policeCars.length < wantCars && state.policeRespawn <= 0) {
      spawnPoliceCar();
      state.policeRespawn = 6; // a break between waves, so outrunning the law works
    }
    if (stars === 0) {
      for (const car of state.policeCars) state.cars.splice(state.cars.indexOf(car), 1);
      state.policeCars = [];
    }
    for (let i = state.policeCars.length - 1; i >= 0; i -= 1) {
      const car = state.policeCars[i];
      const dCar = dist(car.x, car.y, px, py);
      car.chaseTimer = (car.chaseTimer || 0) + dt;
      if (car.chaseTimer > 20) {
        // The chase ran its course: the cruiser breaks off.
        state.cars.splice(state.cars.indexOf(car), 1);
        state.policeCars.splice(i, 1);
        continue;
      }
      // A cruiser that loses the player for a while breaks off the chase.
      if (dCar > 550) {
        car.lostTimer = (car.lostTimer || 0) + dt;
        if (car.lostTimer > 10) {
          state.cars.splice(state.cars.indexOf(car), 1);
          state.policeCars.splice(i, 1);
          continue;
        }
      } else {
        car.lostTimer = 0;
      }
      const targetAngle = angleTo(car.x, car.y, px, py);
      let diff = targetAngle - car.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      car.angle += clamp(diff, -2.4 * dt, 2.4 * dt);
      car.speed = Math.min(car.speed + 500 * dt, CAR.policeMaxSpeed);
      car.x += Math.cos(car.angle) * car.speed * dt;
      car.y += Math.sin(car.angle) * car.speed * dt;
      if (collideBuildings(car, 22)) car.speed *= 0.4;
      // A police car that reaches the player on foot drops a cop.
      if (!p.inCar && dist(car.x, car.y, p.x, p.y) < 60 && state.cops.length < 3) {
        spawnCop(car.x + 30, car.y + 30);
      }
    }
    return 0;
  }

  function stepPlayer(dt, input) {
    const p = state.player;
    p.hurtTimer = Math.max(0, p.hurtTimer - dt);
    p.aim = input.aimAngle;
    if (p.inCar) {
      const car = p.inCar;
      const steer = (input.left ? -1 : 0) + (input.right ? 1 : 0);
      const forward = input.up ? 1 : 0;
      const back = input.down ? 1 : 0;
      if (forward) car.speed += CAR.accel * dt;
      if (back) car.speed -= (car.speed > 0 ? CAR.brake : CAR.accel * 0.6) * dt;
      if (!forward && !back) car.speed -= car.speed * CAR.drag * dt * 2;
      if (input.handbrake) car.speed -= car.speed * 3 * dt;
      car.speed = clamp(car.speed, -CAR.reverseMax, car.maxSpeed);
      const steerSign = car.speed >= 0 ? 1 : -1;
      car.angle += steer * CAR.turnRate * dt * clamp(Math.abs(car.speed) / 160, 0, 1) * steerSign;
      car.x += Math.cos(car.angle) * car.speed * dt;
      car.y += Math.sin(car.angle) * car.speed * dt;
      if (collideBuildings(car, 22)) {
        if (Math.abs(car.speed) > 260) {
          state.health = Math.max(0, state.health - 6);
          p.hurtTimer = 0.5;
          state.effects.push({ x: car.x, y: car.y, t: 0.4, kind: 'crash' });
        }
        car.speed *= 0.4;
      }
      for (const other of state.cars) {
        if (other === car || other.kind === 'parked') continue;
        const d = dist(car.x, car.y, other.x, other.y);
        if (d < 40 && d > 0.01) {
          const push = (40 - d) / 2;
          const nx = (other.x - car.x) / d;
          const ny = (other.y - car.y) / d;
          other.x += nx * push;
          other.y += ny * push;
          car.x -= nx * push;
          car.y -= ny * push;
          if (Math.abs(car.speed) > 200) {
            state.health = Math.max(0, state.health - 3);
            other.speed = Math.max(other.speed, 60);
          }
          car.speed *= 0.85;
        }
      }
      car.x = clamp(car.x, 20, WORLD.width - 20);
      car.y = clamp(car.y, 20, WORLD.height - 20);
      // Running over a pedestrian.
      for (const ped of state.peds) {
        if (ped.dead) continue;
        if (dist(car.x, car.y, ped.x, ped.y) < 26 && Math.abs(car.speed) > 60) {
          ped.dead = true;
          ped.deadTimer = 5;
          addHeat(WANTED.hitPedHeat);
          state.stats.pedsHit += 1;
          setToast('You ran someone over — the heat is on', 3);
        }
      }
      if (input.enter) {
        p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 34;
        p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 34;
        car.driver = null;
        car.kind = 'parked';
        car.speed = 0;
        p.inCar = null;
        return 0;
      }
      p.x = car.x;
      p.y = car.y;
      p.angle = car.angle;
      return 0;
    }

    // On foot.
    const speed = input.run ? PLAYER.runSpeed : PLAYER.walkSpeed;
    const dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy);
      p.x += (dx / len) * speed * dt;
      p.y += (dy / len) * speed * dt;
      p.angle = Math.atan2(dy, dx);
      collideBuildings(p, PLAYER.radius);
    }
    if (input.shoot) shoot();
    if (input.enter) {
      // E does the nearest thing: the mission marker or a car. The marker wins only
      // when it is the closer of the two, so a car parked by a marker can still be taken.
      const mission = state.mission;
      const markerAction = mission.id === 0 || mission.id === 1;
      const markerDist = mission.marker ? dist(p.x, p.y, mission.marker.x, mission.marker.y) : Infinity;
      const car = nearestCar(p.x, p.y, 58);
      const carDist = car ? dist(p.x, p.y, car.x, car.y) : Infinity;
      if (markerAction && markerDist < 70 && markerDist <= carDist) {
        if (mission.id === 0) {
          startMission(1);
          mission.marker = { ...DOCKS };
        } else if (mission.id === 1 && mission.stage === 0) {
          mission.stage = 1;
          mission.marker = { ...CLUB };
          mission.objective = 'Mission 1 — The Package: deliver the case to The Marlin Club';
          setDialogue('Danny', 'Got it. Club across town, and keep it quiet.', 3);
        } else if (mission.id === 1 && mission.stage === 1) {
          return completeMission();
        }
        return 0;
      }
      if (car) {
        if (car.kind === 'parked' || car.kind === 'taxi') {
          p.inCar = car;
          car.kind = 'player';
          car.driver = 'player';
          car.speed = 0;
        } else if (car.kind === 'police') {
          addHeat(40);
          p.inCar = car;
          car.kind = 'player';
          car.driver = 'player';
          state.policeCars.splice(state.policeCars.indexOf(car), 1);
          setToast('You stole a police cruiser!', 3);
        } else if (p.stealing !== car) {
          p.stealing = car;
          p.stealTimer = 0;
          p.stealSpeed = car.speed; // the driver brakes while you yank the door
        }
      }
    }
    if (p.stealing) {
      const car = p.stealing;
      car.speed = 0;
      if (dist(p.x, p.y, car.x, car.y) > 70 || !input.enterHeld) {
        car.speed = p.stealSpeed || 150;
        p.stealing = null;
        p.stealTimer = 0;
      } else {
        p.stealTimer += dt;
        if (p.stealTimer >= PLAYER.stealTime) {
          const driver = spawnPed(car.x + 30, car.y + 30);
          driver.fleeTimer = 4;
          p.inCar = car;
          car.kind = 'player';
          car.driver = 'player';
          car.speed = 0;
          addHeat(WANTED.stealHeat);
          state.stats.carsStolen += 1;
          setToast('Car stolen — wanted level up', 3);
          p.stealing = null;
          p.stealTimer = 0;
        }
      }
    }
    // Pickups auto-collect on touch.
    for (const pickup of state.pickups) {
      if (pickup.respawn > 0) continue;
      if (dist(p.x, p.y, pickup.x, pickup.y) < 34) {
        if (pickup.kind === 'health' && state.health < PLAYER.health) {
          state.health = Math.min(PLAYER.health, state.health + 50);
          pickup.respawn = 20;
          setToast('Health +50', 2);
        } else if (pickup.kind === 'ammo') {
          state.ammo += 24;
          pickup.respawn = 20;
          setToast('Ammo +24', 2);
        }
      }
    }
    if (state.health <= 0) {
      state.wasted = true;
      return EVENT_WASTED;
    }
    return 0;
  }

  function shoot() {
    const p = state.player;
    if (state.ammo <= 0) {
      // No bullets: punch whatever is right in front.
      let best = null;
      let bestD = PLAYER.punchRange;
      for (const ped of state.peds) {
        if (ped.dead) continue;
        const d = dist(p.x, p.y, ped.x, ped.y);
        if (d < bestD) { bestD = d; best = ped; }
      }
      for (const cop of state.cops) {
        const d = dist(p.x, p.y, cop.x, cop.y);
        if (d < bestD) { bestD = d; best = cop; }
      }
      if (best) {
        best.dead = true;
        best.deadTimer = 5;
        if (state.cops.includes(best)) addHeat(WANTED.killCopHeat);
        else addHeat(WANTED.hitPedHeat);
      }
      state.effects.push({ x: p.x + Math.cos(p.aim) * 30, y: p.y + Math.sin(p.aim) * 30, t: 0.15, kind: 'punch' });
      return;
    }
    state.ammo -= 1;
    addHeat(WANTED.shootHeat);
    const ex = p.x + Math.cos(p.aim) * PLAYER.pistolRange;
    const ey = p.y + Math.sin(p.aim) * PLAYER.pistolRange;
    let hitX = ex;
    let hitY = ey;
    let best = null;
    let bestD = PLAYER.pistolRange;
    const targets = [...state.peds.filter((ped) => !ped.dead), ...state.cops];
    for (const t of targets) {
      const dx = t.x - p.x;
      const dy = t.y - p.y;
      const along = dx * Math.cos(p.aim) + dy * Math.sin(p.aim);
      if (along < 0 || along > bestD) continue;
      const across = Math.abs(-dx * Math.sin(p.aim) + dy * Math.cos(p.aim));
      if (across < 16) { bestD = along; best = t; }
    }
    if (best) {
      hitX = best.x;
      hitY = best.y;
      const isCop = state.cops.includes(best);
      best.dead = true;
      best.deadTimer = 5;
      if (isCop) {
        state.cops.splice(state.cops.indexOf(best), 1);
        addHeat(WANTED.killCopHeat);
        setToast('You dropped a cop — the whole force is coming', 3);
      } else {
        addHeat(WANTED.hitPedHeat);
      }
      // Nearby pedestrians run.
      for (const ped of state.peds) {
        if (!ped.dead && dist(ped.x, ped.y, best.x, best.y) < 200) ped.fleeTimer = 3;
      }
    }
    state.effects.push({ x: p.x, y: p.y, x2: hitX, y2: hitY, t: 0.12, kind: 'shot' });
  }

  function stepMissions(dt) {
    const mission = state.mission;
    if (mission.id === 2 && mission.target) {
      const target = mission.target;
      const p = state.player;
      const d = dist(p.x, p.y, target.x, target.y);
      mission.marker = { x: target.x, y: target.y };
      if (d < 60) {
        mission.spotted += dt;
        if (mission.spotted > 1.5) failTail('Spotted! The tail saw you — back off and try again');
      } else {
        mission.spotted = 0;
        if (d < 320) {
          mission.tailTime += dt;
          mission.tailLost = 0;
          if (mission.tailTime >= 12) return completeMission();
        } else {
          mission.tailLost += dt;
          if (mission.tailLost > 5) failTail('You lost the tail — it slipped away');
        }
      }
    }
    if (mission.id === 3 && mission.marker) {
      const p = state.player;
      if (dist(p.x, p.y, mission.marker.x, mission.marker.y) < 70) {
        state.heat = 0;
        state.cops = [];
        for (const car of state.policeCars) state.cars.splice(state.cars.indexOf(car), 1);
        state.policeCars = [];
        return completeMission();
      }
    }
    return 0;
  }

  function stepTaxi(dt, input) {
    const taxi = state.taxi;
    if (state.mission.id < 1 && !state.storyDone) return 0;
    if (taxi.state === 'none' && random() < dt * 0.06) spawnFare();
    if (taxi.state === 'waiting' && taxi.fare) {
      const p = state.player;
      if (p.inCar && input.taxi && dist(p.x, p.y, taxi.fare.x, taxi.fare.y) < 70) {
        taxi.state = 'riding';
        taxi.dest = randomSidewalkPoint();
        taxi.timer = TAXI.tipSeconds;
        const d = dist(taxi.fare.x, taxi.fare.y, taxi.dest.x, taxi.dest.y);
        taxi.pay = TAXI.minFare + Math.round((d / 2400) * (TAXI.maxFare - TAXI.minFare));
        state.peds.splice(state.peds.indexOf(taxi.fare), 1);
        setDialogue('Fare', 'Downtown, please — and step on it.', 3);
      }
      if (dist(state.player.x, state.player.y, taxi.fare.x, taxi.fare.y) > 900) {
        state.peds.splice(state.peds.indexOf(taxi.fare), 1);
        taxi.state = 'none';
        taxi.fare = null;
      }
    } else if (taxi.state === 'riding') {
      taxi.timer -= dt;
      const p = state.player;
      if (!p.inCar) {
        setToast('Fare cancelled — you left the car', 3);
        taxi.state = 'none';
        taxi.dest = null;
      } else if (taxi.dest && dist(p.x, p.y, taxi.dest.x, taxi.dest.y) < 70) {
        const tip = taxi.timer > 15 ? 10 : 0;
        state.cash += taxi.pay + tip;
        state.stats.faresDone += 1;
        setToast(`Fare paid: $${taxi.pay + tip}`, 3);
        taxi.state = 'none';
        taxi.dest = null;
      } else if (taxi.timer <= 0) {
        setToast('Too slow — the fare walked off', 3);
        taxi.state = 'none';
        taxi.dest = null;
      }
    }
    return 0;
  }

  function step(dt, input) {
    if (state.busted || state.wasted) return 0;
    state.time += dt;
    if (state.dialogue) {
      state.dialogue.t -= dt;
      if (state.dialogue.t <= 0) state.dialogue = null;
    }
    if (state.toast) {
      state.toast.t -= dt;
      if (state.toast.t <= 0) state.toast = null;
    }
    for (const pickup of state.pickups) pickup.respawn = Math.max(0, pickup.respawn - dt);
    for (let i = state.effects.length - 1; i >= 0; i -= 1) {
      state.effects[i].t -= dt;
      if (state.effects[i].t <= 0) state.effects.splice(i, 1);
    }
    // Wanted decays only while quiet and unseen: a cop needs line of sight (no building
    // in the way) and to be close. After a long quiet spell the heat bleeds off anyway,
    // so a player is never stuck wanted forever.
    const p = state.player;
    const px = p.inCar ? p.inCar.x : p.x;
    const py = p.inCar ? p.inCar.y : p.y;
    function hasLineOfSight(x1, y1, x2, y2) {
      for (const b of state.buildings) if (segmentHitsRect(x1, y1, x2, y2, b)) return false;
      return true;
    }
    const copNear = state.cops.some((c) => dist(c.x, c.y, px, py) < 450 && hasLineOfSight(c.x, c.y, px, py))
      || state.policeCars.some((c) => dist(c.x, c.y, px, py) < 450 && hasLineOfSight(c.x, c.y, px, py));
    if (state.heat > 0) {
      state.quietTimer += dt;
      if (state.quietTimer > WANTED.quietSeconds && !copNear) {
        state.heat = Math.max(0, state.heat - WANTED.decayPerSecond * dt);
      } else if (state.quietTimer > 25) {
        state.heat = Math.max(0, state.heat - 1.5 * dt);
      }
    }
    let events = 0;
    events |= stepPlayer(dt, input);
    if (events) return events;
    stepTraffic(dt);
    stepPeds(dt);
    events |= stepPolice(dt);
    if (events) return events;
    events |= stepMissions(dt);
    if (events) return events;
    stepTaxi(dt, input);
    // Camera follows the player.
    state.camera.x += (px - state.camera.x) * Math.min(1, dt * 5);
    state.camera.y += (py - state.camera.y) * Math.min(1, dt * 5);
    if (state.health <= 0) {
      state.wasted = true;
      return EVENT_WASTED;
    }
    return events;
  }

  function save() {
    const p = state.player;
    return {
      x: p.inCar ? p.inCar.x : p.x,
      y: p.inCar ? p.inCar.y : p.y,
      cash: state.cash,
      health: state.health,
      ammo: state.ammo,
      missionId: state.mission.id,
      storyDone: state.storyDone,
    };
  }

  function load(data) {
    reset();
    state.player.x = data.x;
    state.player.y = data.y;
    state.cash = data.cash;
    state.health = data.health;
    state.ammo = data.ammo;
    state.storyDone = !!data.storyDone;
    if (data.missionId > 0 && data.missionId <= 3) startMission(data.missionId);
    state.camera = { x: data.x, y: data.y };
  }

  reset();
  return {
    state,
    step,
    reset,
    save,
    load,
    startMission,
    wantedStars,
    setToast,
    setDialogue,
  };
}
