# TurboWarp Bridge Plugin (TwBridge)

TwBridge is a Paper plugin that exposes a simple WebSocket bridge for TurboWarp
(Scratch) projects. It lets you connect from TurboWarp, run Minecraft commands,
spawn/teleport a minimal "agent" armor stand, and despawn it programmatically.

## Features
- Per-player token-based TurboWarp magic links via `/tw`
- TurboWarp extension script (single `twbridge.js` with locale JSON) that auto-connects with `host`/`token` from the link
- Blocks for connect, disconnect, status, execute command, teleport agent,
  and despawn agent
- Agents are invisible to normal gameplay (armor stand, invulnerable,
  floating at block center, glowing, iron/leather armor with `MHF_Golem` head)
- `/twbridge reload` command for admin control

## Usage
1. In Minecraft, run `/tw` to receive a one-time TurboWarp link bound to your player. The link includes the WebSocket host, token, and language (used to load locale JSON).
2. Click the link. TurboWarp opens, loads the extension from the local HTTP server, and immediately connects to the bridge using the token.
3. Use the `twbridge` blocks. The connected player is locked to the token, so other players cannot be impersonated.

## Building
```bash
cd /home/nando/gitrepo/twbridge
./gradlew clean build
```
The shaded jar is written to `build/libs/twbridge-<version>.jar`.

## Config
`src/main/resources/config.yml` is copied to `plugins/twbridge/config.yml` on
first run. The important keys are:
- `ws.*`: WebSocket bind address, advertise address for links, rate limits, auth requirement (`requireSession`)
- `magicLink.*`: token TTL, default language
- `debug`: when true, detailed logs are emitted for each request

## Hangar Publish
Set `HANGAR_API_TOKEN` and run:
```bash
./gradlew hangarPublish -Phangar.channel=Release -PpaperVersion=1.21.1
```
You can override the plugin version via `-Pversion.override=1.0.0`.
