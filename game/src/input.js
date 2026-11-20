// Keyboard and mouse input. Held keys are read every frame; one-shot presses (enter a car,
// pause, mute, accept a fare) are queued as bit flags and taken once by the loop.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER = 4;
export const ACTION_MUTE = 8;
export const ACTION_TAXI = 16;

const UP = new Set(['KeyW', 'ArrowUp']);
const DOWN = new Set(['KeyS', 'ArrowDown']);
const LEFT = new Set(['KeyA', 'ArrowLeft']);
const RIGHT = new Set(['KeyD', 'ArrowRight']);
const RUN = new Set(['ShiftLeft', 'ShiftRight']);
const HANDBRAKE = new Set(['Space']);
const ENTER = new Set(['KeyE']);
const MUTE = new Set(['KeyM']);
const TAXI = new Set(['KeyT']);
const CONFIRM = new Set(['Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let mouseX = 0;
  let mouseY = 0;
  let mouseDown = false;
  let mouseClicked = false;

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    keys.add(event.code);
    if (ENTER.has(event.code)) actions |= ACTION_ENTER;
    else if (PAUSE.has(event.code)) actions |= ACTION_PAUSE;
    else if (MUTE.has(event.code)) actions |= ACTION_MUTE;
    else if (TAXI.has(event.code)) actions |= ACTION_TAXI;
    else if (CONFIRM.has(event.code)) actions |= ACTION_CONFIRM;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
      event.preventDefault();
    }
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
  });
  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
    mouseDown = true;
    mouseClicked = true;
  });
  window.addEventListener('pointerup', () => { mouseDown = false; });

  function has(set) {
    for (const code of set) if (keys.has(code)) return true;
    return false;
  }

  return {
    up: () => has(UP),
    down: () => has(DOWN),
    left: () => has(LEFT),
    right: () => has(RIGHT),
    run: () => has(RUN),
    handbrake: () => has(HANDBRAKE),
    mouse() { return { x: mouseX, y: mouseY, down: mouseDown }; },
    takeClick() {
      const clicked = mouseClicked;
      mouseClicked = false;
      return clicked;
    },
    enterHeld() { return keys.has('KeyE'); },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
