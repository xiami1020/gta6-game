// Drawing only: the world's state and the current screen in, pixels out. The camera shows a
// 1280x720 window of the city, scaled to fit the browser window. Flat shapes and canvas text:
// buildings with lit windows, roads with lane dashes, the beach and water at the south edge,
// cars, pedestrians, the HUD with its minimap, and the menu panels.
import { CAR, FONT, PALETTE, PLAYER, ROAD, ROAD_XS, ROAD_YS, VIEW, WORLD } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

function drawCar(ctx, car, isPlayer) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fillRect(-CAR.length / 2 + 3, -CAR.width / 2 + 4, CAR.length, CAR.width);
  ctx.fillStyle = car.color;
  ctx.fillRect(-CAR.length / 2, -CAR.width / 2, CAR.length, CAR.width);
  ctx.fillStyle = '#1d2733';
  ctx.fillRect(-8, -CAR.width / 2 + 3, 16, CAR.width - 6);
  ctx.fillStyle = '#dfe9f2';
  ctx.fillRect(CAR.length / 2 - 6, -CAR.width / 2 + 2, 4, 5);
  ctx.fillRect(CAR.length / 2 - 6, CAR.width / 2 - 7, 4, 5);
  ctx.fillStyle = '#ff5a3c';
  ctx.fillRect(-CAR.length / 2 + 1, -CAR.width / 2 + 2, 3, 5);
  ctx.fillRect(-CAR.length / 2 + 1, CAR.width / 2 - 7, 3, 5);
  if (car.kind === 'police') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-14, -CAR.width / 2 + 1, 10, 4);
    ctx.fillRect(4, -CAR.width / 2 + 1, 10, 4);
    ctx.fillStyle = '#ff2d2d';
    ctx.beginPath();
    ctx.arc(-4, -CAR.width / 2 - 2, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2d7dff';
    ctx.beginPath();
    ctx.arc(4, -CAR.width / 2 - 2, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  if (car.kind === 'taxi') {
    ctx.fillStyle = '#111111';
    ctx.font = 'bold 9px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText('TAXI', 0, 3);
  }
  if (isPlayer) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(-CAR.length / 2 - 3, -CAR.width / 2 - 3, CAR.length + 6, CAR.width + 6);
  }
  ctx.restore();
}

function drawPed(ctx, ped) {
  ctx.save();
  ctx.translate(ped.x, ped.y);
  if (ped.dead) {
    ctx.rotate(1.2);
    ctx.fillStyle = '#7a2020';
    ctx.fillRect(-7, -4, 14, 8);
    ctx.restore();
    return;
  }
  ctx.rotate(ped.angle);
  ctx.fillStyle = ped.color;
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2b2118';
  ctx.beginPath();
  ctx.arc(4, 0, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (ped.state === 'fare') {
    ctx.fillStyle = '#ffd94a';
    ctx.font = 'bold 16px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText('!', ped.x, ped.y - 16);
  }
}

function drawCop(ctx, cop) {
  ctx.save();
  ctx.translate(cop.x, cop.y);
  ctx.rotate(cop.angle);
  ctx.fillStyle = '#1d3fae';
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#dfe9f2';
  ctx.beginPath();
  ctx.arc(4, 0, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffd94a';
  ctx.fillRect(-9, -2, 6, 4);
  ctx.restore();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function drawWorld(state, scale, camX, camY) {
    ctx.save();
    ctx.scale(scale, scale);
    ctx.translate(-camX + VIEW.width / 2, -camY + VIEW.height / 2);
    // Ground.
    ctx.fillStyle = PALETTE.grass;
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    ctx.fillStyle = PALETTE.grassAlt;
    for (let gx = 0; gx < WORLD.width; gx += 320) {
      for (let gy = 0; gy < 1800; gy += 320) {
        if (((gx + gy) / 320) % 2 === 0) ctx.fillRect(gx, gy, 320, 320);
      }
    }
    // Beach and water along the south edge.
    ctx.fillStyle = PALETTE.sand;
    ctx.fillRect(0, 1800, WORLD.width, 60);
    ctx.fillStyle = PALETTE.water;
    ctx.fillRect(0, 1860, WORLD.width, 60);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    for (let wx = 0; wx < WORLD.width; wx += 160) {
      ctx.fillRect(wx, 1868 + ((wx / 160) % 2) * 14, 90, 3);
    }
    // Sidewalks, then roads.
    ctx.fillStyle = PALETTE.sidewalk;
    for (const x of ROAD_XS) ctx.fillRect(x - ROAD.width / 2 - 14, 0, ROAD.width + 28, 1800);
    for (const y of ROAD_YS) ctx.fillRect(0, y - ROAD.width / 2 - 14, WORLD.width, ROAD.width + 28);
    ctx.fillStyle = PALETTE.road;
    for (const x of ROAD_XS) ctx.fillRect(x - ROAD.width / 2, 0, ROAD.width, 1800);
    for (const y of ROAD_YS) ctx.fillRect(0, y - ROAD.width / 2, WORLD.width, ROAD.width);
    // Lane dashes.
    ctx.fillStyle = PALETTE.lane;
    for (const x of ROAD_XS) {
      for (let y = 40; y < 1800; y += 64) ctx.fillRect(x - 2, y, 4, 30);
    }
    for (const y of ROAD_YS) {
      for (let x = 40; x < WORLD.width; x += 64) ctx.fillRect(x, y - 2, 30, 4);
    }
    // Buildings with roofs and lit windows.
    for (const b of state.buildings) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(b.x + 5, b.y + 6, b.w, b.h);
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = b.roof;
      ctx.fillRect(b.x + 6, b.y + 6, b.w - 12, b.h - 12);
      ctx.fillStyle = '#ffe9a8';
      const cols = Math.max(1, Math.floor(b.w / 34));
      const rows = Math.max(1, Math.floor(b.h / 34));
      for (let cx = 0; cx < cols; cx += 1) {
        for (let cy = 0; cy < rows; cy += 1) {
          if ((cx * 7 + cy * 3 + b.w) % 5 === 0) {
            ctx.fillRect(b.x + 12 + cx * 34, b.y + 12 + cy * 34, 12, 10);
          }
        }
      }
    }
    // Trees.
    for (const tree of state.trees) {
      ctx.fillStyle = '#4a3220';
      ctx.fillRect(tree.x - 2, tree.y - 2, 4, 8);
      ctx.fillStyle = PALETTE.tree;
      ctx.beginPath();
      ctx.arc(tree.x, tree.y - 6, tree.r, 0, Math.PI * 2);
      ctx.fill();
    }
    // Pickups.
    for (const pickup of state.pickups) {
      if (pickup.respawn > 0) continue;
      ctx.save();
      ctx.translate(pickup.x, pickup.y);
      ctx.fillStyle = pickup.kind === 'health' ? PALETTE.health : PALETTE.ammo;
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px ' + FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pickup.kind === 'health' ? '+' : 'A', 0, 1);
      ctx.restore();
    }
    // Mission marker: a pulsing beacon.
    const marker = state.mission.marker || (state.taxi.state === 'riding' ? state.taxi.dest : null);
    if (marker) {
      const pulse = 18 + 6 * Math.sin(state.time * 4);
      ctx.strokeStyle = PALETTE.marker;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(marker.x, marker.y, pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = PALETTE.marker;
      ctx.beginPath();
      ctx.arc(marker.x, marker.y, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    if (state.taxi.state === 'waiting' && state.taxi.fare) {
      ctx.strokeStyle = PALETTE.taxi;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(state.taxi.fare.x, state.taxi.fare.y, 20 + 4 * Math.sin(state.time * 5), 0, Math.PI * 2);
      ctx.stroke();
    }
    // Cars, peds, cops, player.
    for (const car of state.cars) {
      if (car.kind === 'player') continue;
      drawCar(ctx, car, false);
    }
    for (const ped of state.peds) drawPed(ctx, ped);
    for (const cop of state.cops) drawCop(ctx, cop);
    for (const car of state.policeCars) drawCar(ctx, car, false);
    const p = state.player;
    if (p.inCar) {
      drawCar(ctx, p.inCar, true);
    } else {
      // The player on foot, with an aim line.
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = PALETTE.player;
      ctx.beginPath();
      ctx.arc(0, 0, PLAYER.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2b2118';
      ctx.beginPath();
      ctx.arc(4, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      if (p.hurtTimer > 0) {
        ctx.strokeStyle = 'rgba(255, 40, 40, 0.7)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 18, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.x + Math.cos(p.aim) * 16, p.y + Math.sin(p.aim) * 16);
      ctx.lineTo(p.x + Math.cos(p.aim) * 44, p.y + Math.sin(p.aim) * 44);
      ctx.stroke();
      if (p.stealing) {
        const frac = p.stealTimer / PLAYER.stealTime;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(p.x - 26, p.y - 34, 52, 8);
        ctx.fillStyle = '#ffd94a';
        ctx.fillRect(p.x - 25, p.y - 33, 50 * frac, 6);
      }
    }
    // Shot tracers and crash puffs.
    for (const fx of state.effects) {
      if (fx.kind === 'shot') {
        ctx.strokeStyle = `rgba(255, 220, 90, ${fx.t / 0.12})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(fx.x, fx.y);
        ctx.lineTo(fx.x2, fx.y2);
        ctx.stroke();
      } else if (fx.kind === 'crash') {
        ctx.fillStyle = `rgba(200, 200, 200, ${fx.t})`;
        ctx.beginPath();
        ctx.arc(fx.x, fx.y, 26 * (1 - fx.t / 0.4) + 8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawMinimap(state, scale, canvasW, canvasH) {
    const mw = 190;
    const mh = 142;
    const x0 = canvasW - mw - 16;
    const y0 = canvasH - mh - 16;
    ctx.fillStyle = PALETTE.panel;
    ctx.fillRect(x0 - 6, y0 - 6, mw + 12, mh + 12);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, y0, mw, mh);
    ctx.clip();
    const sx = mw / WORLD.width;
    const sy = mh / WORLD.height;
    ctx.fillStyle = '#22331c';
    ctx.fillRect(x0, y0, mw, mh);
    ctx.strokeStyle = '#5a5f68';
    ctx.lineWidth = 3;
    for (const x of ROAD_XS) {
      ctx.beginPath();
      ctx.moveTo(x0 + x * sx, y0);
      ctx.lineTo(x0 + x * sx, y0 + mh);
      ctx.stroke();
    }
    for (const y of ROAD_YS) {
      ctx.beginPath();
      ctx.moveTo(x0, y0 + y * sy);
      ctx.lineTo(x0 + mw, y0 + y * sy);
      ctx.stroke();
    }
    const marker = state.mission.marker || (state.taxi.state === 'riding' ? state.taxi.dest : null);
    if (marker) {
      ctx.fillStyle = PALETTE.marker;
      ctx.beginPath();
      ctx.arc(x0 + marker.x * sx, y0 + marker.y * sy, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const car of state.policeCars) {
      ctx.fillStyle = '#5a8dff';
      ctx.beginPath();
      ctx.arc(x0 + car.x * sx, y0 + car.y * sy, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    const p = state.player;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x0 + p.x * sx, y0 + p.y * sy, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = PALETTE.text;
    ctx.font = '11px ' + FONT;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('SOLMAR', x0, y0 - 10);
  }

  function drawHud(state, stars, canvasW, canvasH, muted) {
    const p = state.player;
    ctx.textBaseline = 'alphabetic';
    // Top-left: health, cash, ammo.
    ctx.fillStyle = PALETTE.panel;
    ctx.fillRect(12, 12, 250, 84);
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 20px ' + FONT;
    ctx.textAlign = 'left';
    ctx.fillText(`$${state.cash}`, 24, 40);
    ctx.fillStyle = '#333';
    ctx.fillRect(24, 50, 180, 12);
    ctx.fillStyle = state.health > 30 ? PALETTE.health : '#ff5a3c';
    ctx.fillRect(24, 50, 180 * (state.health / 100), 12);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '14px ' + FONT;
    ctx.fillText(`Health ${Math.ceil(state.health)}`, 24, 82);
    ctx.fillText(`Ammo ${state.ammo}`, 150, 82);
    // Top-right: wanted stars.
    ctx.fillStyle = PALETTE.panel;
    ctx.fillRect(canvasW - 190, 12, 178, 44);
    ctx.font = '26px ' + FONT;
    ctx.textAlign = 'center';
    for (let i = 0; i < 5; i += 1) {
      ctx.fillStyle = i < stars ? PALETTE.star : '#555a63';
      ctx.fillText('★', canvasW - 168 + i * 34, 44);
    }
    // Objective bar, top centre.
    ctx.fillStyle = PALETTE.panel;
    const obj = state.mission.objective;
    ctx.font = '15px ' + FONT;
    const objW = Math.min(canvasW - 460, ctx.measureText(obj).width + 28);
    ctx.fillRect((canvasW - objW) / 2, 12, objW, 34);
    ctx.fillStyle = '#ffd94a';
    ctx.textAlign = 'center';
    ctx.fillText(obj, canvasW / 2, 34);
    // Taxi timer.
    if (state.taxi.state === 'riding') {
      ctx.fillStyle = PALETTE.panel;
      ctx.fillRect((canvasW - 200) / 2, 52, 200, 28);
      ctx.fillStyle = PALETTE.text;
      ctx.font = '14px ' + FONT;
      ctx.fillText(`Fare $${state.taxi.pay} — ${Math.ceil(state.taxi.timer)}s`, canvasW / 2, 71);
    }
    // Context prompt, bottom-left.
    let prompt = '';
    if (!p.inCar) {
      const nearCar = state.cars.some((c) => Math.hypot(c.x - p.x, c.y - p.y) < 58);
      const nearMarker = state.mission.marker && Math.hypot(state.mission.marker.x - p.x, state.mission.marker.y - p.y) < 70;
      if (nearMarker) prompt = 'E — Talk / pick up';
      else if (nearCar) prompt = 'E — Enter car (hold E to steal)';
      else prompt = 'WASD move · Shift run · Click shoot · E enter car';
    } else {
      prompt = 'WASD drive · Space handbrake · E get out';
      if (state.taxi.state === 'waiting' && state.taxi.fare && Math.hypot(state.taxi.fare.x - p.x, state.taxi.fare.y - p.y) < 70) {
        prompt = 'T — Pick up the fare';
      }
    }
    ctx.fillStyle = PALETTE.panel;
    ctx.font = '14px ' + FONT;
    const pw = ctx.measureText(prompt).width + 24;
    ctx.fillRect(12, canvasH - 40, pw, 28);
    ctx.fillStyle = PALETTE.muted;
    ctx.textAlign = 'left';
    ctx.fillText(prompt, 24, canvasH - 21);
    if (muted) {
      ctx.fillStyle = PALETTE.text;
      ctx.font = '14px ' + FONT;
      ctx.textAlign = 'right';
      ctx.fillText('Muted (M)', canvasW - 16, canvasH - 48);
    }
    // Toast.
    if (state.toast) {
      ctx.fillStyle = PALETTE.panel;
      ctx.font = 'bold 16px ' + FONT;
      const tw = ctx.measureText(state.toast.text).width + 28;
      ctx.fillRect((canvasW - tw) / 2, canvasH - 108, tw, 32);
      ctx.fillStyle = PALETTE.text;
      ctx.textAlign = 'center';
      ctx.fillText(state.toast.text, canvasW / 2, canvasH - 86);
    }
    // Dialogue box (kept clear of the minimap at bottom-right).
    if (state.dialogue) {
      const d = state.dialogue;
      ctx.fillStyle = PALETTE.panel;
      ctx.fillRect(80, canvasH - 170, canvasW - 340, 56);
      ctx.fillStyle = '#ffd94a';
      ctx.font = 'bold 15px ' + FONT;
      ctx.textAlign = 'left';
      ctx.fillText(d.speaker, 100, canvasH - 146);
      ctx.fillStyle = PALETTE.text;
      ctx.font = '15px ' + FONT;
      wrapText(d.text, 100, canvasH - 126, canvasW - 380, 19);
    }
  }

  function wrapText(text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let yy = y;
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, yy);
        line = word;
        yy += lineHeight;
      } else {
        line = test;
      }
    }
    ctx.fillText(line, x, yy);
  }

  function panel(title, lines, prompt, canvasW, canvasH) {
    ctx.fillStyle = 'rgba(8, 10, 16, 0.72)';
    ctx.fillRect(0, 0, canvasW, canvasH);
    const w = 640;
    const h = 150 + lines.length * 30;
    const x = (canvasW - w) / 2;
    const y = (canvasH - h) / 2;
    ctx.fillStyle = '#161a23';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#ffd94a';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = '#ffd94a';
    ctx.font = 'bold 44px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText(title, canvasW / 2, y + 64);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '17px ' + FONT;
    lines.forEach((line, i) => ctx.fillText(line, canvasW / 2, y + 108 + i * 30));
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '15px ' + FONT;
    ctx.fillText(prompt, canvasW / 2, y + h - 24);
  }

  function draw(state, screen, options) {
    const dpr = window.devicePixelRatio || 1;
    const cw = canvas.clientWidth || VIEW.width;
    const ch = canvas.clientHeight || VIEW.height;
    if (canvas.width !== Math.floor(cw * dpr) || canvas.height !== Math.floor(ch * dpr)) {
      canvas.width = Math.floor(cw * dpr);
      canvas.height = Math.floor(ch * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const scale = Math.min(cw / VIEW.width, ch / VIEW.height);
    const ox = (cw - VIEW.width * scale) / 2;
    const oy = (ch - VIEW.height * scale) / 2;
    ctx.fillStyle = '#0d0f14';
    ctx.fillRect(0, 0, cw, ch);
    ctx.save();
    ctx.translate(ox, oy);
    const cam = state.camera;
    const camX = Math.max(VIEW.width / 2, Math.min(WORLD.width - VIEW.width / 2, cam.x));
    const camY = Math.max(VIEW.height / 2, Math.min(WORLD.height - VIEW.height / 2, cam.y));
    drawWorld(state, scale, camX, camY);
    ctx.restore();
    // HUD and overlays are drawn in screen space over the whole canvas.
    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(scale, scale);
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) {
      drawHud(state, options.stars, VIEW.width, VIEW.height, options.muted);
      drawMinimap(state, scale, VIEW.width, VIEW.height);
    }
    ctx.restore();
    if (screen === SCREEN_TITLE) {
      panel(
        'SOLMAR CITY',
        [
          'An open-world crime story in the sun-soaked city of Solmar.',
          'Steal cars, dodge the law, run fares — and finish Marco\'s three jobs.',
          'WASD move / drive · Mouse aim · Click shoot · E enter or steal a car',
          'Space handbrake · T pick up a fare · P pause · M mute',
        ],
        options.hasSave ? 'Press Enter to start — or C to continue your saved game' : 'Press Enter or click to start',
        cw, ch,
      );
    } else if (screen === SCREEN_PAUSED) {
      panel('PAUSED', ['The city waits for you.', `Cash $${state.cash} · Mission: ${state.mission.objective}`], 'P or Enter to resume · S to save', cw, ch);
    } else if (screen === SCREEN_OVER) {
      const busted = options.overKind === 'busted';
      panel(
        busted ? 'BUSTED' : 'WASTED',
        busted
          ? ['The Solmar police caught up with you.', `You lost $${Math.min(state.cash, 50)} in fines.`, 'The city is still out there.']
          : ['Solmar got the better of you this time.', 'Patch up at the clinic and try again.'],
        'Press Enter to start over',
        cw, ch,
      );
    }
    if (screen === SCREEN_PLAY && state.storyDone && !options.storyShown) {
      // A one-line banner is handled by the toast; nothing extra to draw.
    }
  }

  return { draw };
}
