// The screenshot scenes behind ?shot=start|drive|chase|mission. Each one plays the real rules
// forward from a fresh world for a fixed number of steps, steered by scripted input, so the
// frame is what a short game really looks like and the same seed always gives the same frame.
import { STEP } from './config.js';
import { SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 6;
const DRIVE_SECONDS = 3;
const CHASE_SECONDS = 3.5;
const MISSION_SECONDS = 1.2;

function idleInput() {
  return { up: false, down: false, left: false, right: false, run: false, handbrake: false, enter: false, enterHeld: false, shoot: false, taxi: false, aimAngle: 0 };
}

function driveInput() {
  const input = idleInput();
  input.up = true;
  return input;
}

/** Step the world with scripted input; `enter` is pressed only on the first step. */
function runFor(world, seconds, makeInput, pressEnterFirst) {
  const steps = Math.floor(seconds / STEP);
  for (let index = 0; index < steps; index += 1) {
    const input = makeInput(index);
    if (pressEnterFirst && index === 0) input.enter = true;
    world.step(STEP, input);
  }
}

export function stageShot(name, world) {
  world.reset();
  const state = world.state;
  if (name === 'drive' || name === 'chase' || name === 'mission') {
    if (name === 'mission') {
      world.startMission(2);
    }
    if (name === 'chase') {
      state.heat = 65; // three stars: the chase is already on
    }
    // Walk into the parked car beside the player, then drive east down the road.
    runFor(world, 0.2, idleInput, true);
    const seconds = name === 'drive' ? DRIVE_SECONDS : name === 'chase' ? CHASE_SECONDS : MISSION_SECONDS;
    runFor(world, seconds, driveInput, false);
    return { screen: SCREEN_PLAY };
  }
  runFor(world, START_SECONDS, idleInput, false);
  return { screen: SCREEN_TITLE };
}
