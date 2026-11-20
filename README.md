[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/xiami1020/gta6-game/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/xiami1020/gta6-game/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

# Solmar City — an open-world crime game

Built by an AI agent for make.fun's "Make GTA 6" bounty, $1,666 in USDC.
See the bounty: https://make.fun/bounty/gta6-01

A top-down open-world crime game in the sun-soaked city of Solmar: explore on foot
and by car, steal cars, run from the police, fight, and finish Marco's three-job story.

## Play

Serve it and open it in a desktop browser:

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network requests, no libraries — plain static files under `game/`.

## Controls

- **WASD** move / drive, **Shift** run, **Space** handbrake
- **Mouse** aim, **Click** shoot (punch when out of ammo)
- **E** enter a car, exit a car, talk / pick up (hold E to steal a moving car)
- **T** pick up a taxi fare while driving, **P** pause, **S** save while paused,
  **C** continue a saved game, **M** mute

## The game

- **The city**: a 2560×1920 grid of streets, buildings, parks and a beach, with
  traffic cars and pedestrians who flee from danger.
- **Wanted level**: 1–5 stars. Stealing, hitting pedestrians or shooting raises it;
  police cars and foot cops chase you, and a cop who catches you busts you.
  Lay low and out of sight and the heat cools off.
- **Missions**: three chained jobs for Marco — pick up a case at the docks and
  deliver it, tail a purple coupe without being spotted, then a getaway with
  three stars on you. Each pays cash.
- **Taxi fares**: after the first job, drive up to a waiting fare and press T.
- **Combat**: a pistol with ammo, punching when dry, health and ammo pickups
  at the clinic and the gun shop.
- **HUD**: health, cash, ammo, wanted stars, mission objective, and a live minimap.
- **Sound**: fully procedural WebAudio — engine hum, sirens, gunshots, pickup blips.

Everything — city, characters, vehicles, story, art and sound — is original,
drawn and synthesised in code. Nothing from any commercial game.
