# TurboWarp Bridge Plugin (TwBridge)

TwBridge is a Paper plugin that exposes a simple WebSocket bridge for TurboWarp
(Scratch) projects. It lets you connect from TurboWarp, run Minecraft commands,
spawn/teleport a minimal "agent" armor stand, and despawn it programmatically.

## Features
- Pairing-based WebSocket endpoint (local-only by default)
- TurboWarp extension script served over HTTP (`/tw/twbridge.js`)
- Blocks for connect, disconnect, status, execute command, teleport agent,
  and despawn agent
- Agents are invisible to normal gameplay (armor stand, invulnerable,
  floating at block center, glowing, iron/leather armor with `MHF_Golem` head)
- `/twbridge reload` and `/twbridge pair` commands for admin control

## Building
```bash
cd /home/nando/gitrepo/twbridge
./gradlew clean build
```
The shaded jar is written to `build/libs/twbridge-<version>.jar`.

## Config
`src/main/resources/config.yml` is copied to `plugins/twbridge/config.yml` on
first run. The important keys are:
- `ws.*`: WebSocket bind address, rate limits, pairing behavior
- `http.*`: HTTP bind address/path, ws default URL for TurboWarp
- `debug`: when true, detailed logs are emitted for each request

## Hangar Publish
Set `HANGAR_API_TOKEN` and run:
```bash
./gradlew hangarPublish -Phangar.channel=Release -PpaperVersion=1.21.1
```
You can override the plugin version via `-Pversion.override=1.0.0`.
