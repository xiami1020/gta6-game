// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s steps
// (several in a slow frame, none in a fast one), and the renderer paints what is there. The game
// moves between four screens: title, play, paused and game over (busted or wasted).
//
// ?seed=N fixes the city. ?shot=start|drive|chase|mission (with &seed=N) stages that scene
// instead of running the loop, paints it twice and sets window.__shotReady for a screenshot.
import { SAVE_KEY, STEP, VIEW, WORLD } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_BUSTED, EVENT_MISSION, EVENT_WASTED } from './world.js';
import { ACTION_CONFIRM, ACTION_ENTER, ACTION_MUTE, ACTION_PAUSE, ACTION_TAXI, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
window.__world = world; // for playtests and screenshots
const renderer = createRenderer(canvas);
const audio = createAudio();

function readSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeSave() {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(world.save()));
    return true;
  } catch {
    return false;
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, { stars: world.wantedStars(), muted: false, hasSave: false, overKind: null, storyShown: true });
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let overKind = null;
  let lastCash = world.state.cash;
  let lastAmmo = world.state.ammo;
  let lastHealth = world.state.health;
  let storyShown = false;
  let accumulator = 0;
  let last = performance.now();
  // One-shot presses the screens did not use (E to enter a car, T for a fare) wait here
  // for the next simulation step instead of being lost between frames.
  let pendingActions = 0;

  function announce(message) {
    status.textContent = message;
  }

  function aimAngle() {
    const mouse = input.mouse();
    const cw = canvas.clientWidth || VIEW.width;
    const ch = canvas.clientHeight || VIEW.height;
    const scale = Math.min(cw / VIEW.width, ch / VIEW.height);
    const ox = (cw - VIEW.width * scale) / 2;
    const oy = (ch - VIEW.height * scale) / 2;
    const cam = world.state.camera;
    const camX = Math.max(VIEW.width / 2, Math.min(WORLD.width - VIEW.width / 2, cam.x));
    const camY = Math.max(VIEW.height / 2, Math.min(WORLD.height - VIEW.height / 2, cam.y));
    const wx = (mouse.x - ox) / scale - VIEW.width / 2 + camX;
    const wy = (mouse.y - oy) / scale - VIEW.height / 2 + camY;
    const p = world.state.player;
    return Math.atan2(wy - p.y, wx - p.x);
  }

  function respawn() {
    const state = world.state;
    state.player.inCar = null;
    state.player.x = 800;
    state.player.y = 480;
    state.health = 100;
    state.heat = 0;
    state.cops = [];
    for (const car of state.policeCars) state.cars.splice(state.cars.indexOf(car), 1);
    state.policeCars = [];
    state.busted = false;
    state.wasted = false;
    state.camera = { x: 800, y: 480 };
    world.setToast('You wake up at the clinic. Solmar is still waiting.', 4);
  }

  function startGame(fresh) {
    if (fresh) world.reset();
    accumulator = 0;
    overKind = null;
    storyShown = false;
    screen = SCREEN_PLAY;
    announce('Playing. Follow the yellow marker.');
  }

  function endGame(kind) {
    screen = SCREEN_OVER;
    overKind = kind;
    if (kind === 'busted') {
      world.state.cash = Math.max(0, world.state.cash - 50);
      audio.busted();
      announce('Busted. The police took $50 in fines.');
    } else {
      world.state.cash = Math.max(0, world.state.cash - 50);
      announce('Wasted. You wake up at the clinic.');
    }
  }

  function handleActions() {
    pendingActions |= input.takeActions();
    const actions = pendingActions;
    pendingActions &= ~(ACTION_MUTE | ACTION_PAUSE | ACTION_CONFIRM);
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Muted.' : 'Sound on.');
    }
    if (screen === SCREEN_TITLE) {
      if (actions & ACTION_CONFIRM) startGame(true);
      else if (actions & ACTION_ENTER) startGame(true);
    } else if (screen === SCREEN_OVER) {
      if (actions & (ACTION_CONFIRM | ACTION_ENTER)) {
        respawn();
        startGame(false);
      }
    } else if (screen === SCREEN_PLAY) {
      if (actions & ACTION_PAUSE) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      }
    } else if (screen === SCREEN_PAUSED) {
      if (actions & (ACTION_PAUSE | ACTION_CONFIRM)) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    }
  }

  function step() {
    const state = world.state;
    const click = input.takeClick();
    const actions = pendingActions | input.takeActions();
    pendingActions = 0;
    const gameInput = {
      up: input.up(),
      down: input.down(),
      left: input.left(),
      right: input.right(),
      run: input.run(),
      handbrake: input.handbrake(),
      enter: Boolean(actions & ACTION_ENTER),
      enterHeld: input.enterHeld(),
      shoot: click && !state.player.inCar,
      taxi: Boolean(actions & ACTION_TAXI),
      aimAngle: aimAngle(),
    };
    if (click && !state.player.inCar) audio.shot();
    const events = world.step(STEP, gameInput);
    if (state.cash > lastCash) audio.cash();
    if (state.ammo > lastAmmo || state.health > lastHealth) audio.pickup();
    lastCash = state.cash;
    lastAmmo = state.ammo;
    lastHealth = state.health;
    if (events & EVENT_MISSION) audio.mission();
    if (events & EVENT_BUSTED) endGame('busted');
    else if (events & EVENT_WASTED) endGame('wasted');
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP) {
        step();
        accumulator -= STEP;
        if (screen !== SCREEN_PLAY) break;
      }
      const state = world.state;
      const car = state.player.inCar;
      audio.engine(car ? Math.abs(car.speed) / car.maxSpeed : 0, Boolean(car));
      audio.siren(world.wantedStars() >= 2, STEP);
    } else {
      accumulator = 0;
      audio.engine(0, false);
      audio.siren(false, STEP);
    }
    renderer.draw(world.state, screen, {
      stars: world.wantedStars(),
      muted: audio.isMuted(),
      hasSave: Boolean(readSave()),
      overKind,
      storyShown,
    });
    if (world.state.storyDone) storyShown = true;
  }

  // Clicking the canvas unlocks audio and starts the game from the title screen.
  canvas.addEventListener('pointerdown', () => {
    audio.unlock();
    if (screen === SCREEN_TITLE) startGame(true);
  });
  // C continues a saved game from the title screen; S saves while paused.
  window.addEventListener('keydown', (event) => {
    if (event.code === 'KeyC' && screen === SCREEN_TITLE) {
      const save = readSave();
      if (save) {
        world.load(save);
        startGame(false);
        announce('Continued your saved game.');
      }
    } else if (event.code === 'KeyS' && screen === SCREEN_PAUSED) {
      announce(writeSave() ? 'Game saved.' : 'Could not save.');
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Solmar City. Press Enter or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
