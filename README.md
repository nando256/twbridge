# TurboWarp Bridge Plugin (TwBridge)

TwBridge is a Paper plugin that exposes a simple WebSocket bridge for TurboWarp
(Scratch) projects. It lets you connect from TurboWarp, run Minecraft commands,
spawn/teleport a minimal "agent" armor stand, and despawn it programmatically.

## Features
- Per-player token-based TurboWarp magic links via `/tw` (optional legacy pairing codes can be re-enabled)
- TurboWarp extension script (published per language) that auto-connects with `host`/`token` from the link
- Blocks for connect, disconnect, status, execute command, teleport agent,
  and despawn agent
- Agents are invisible to normal gameplay (armor stand, invulnerable,
  floating at block center, glowing, iron/leather armor with `MHF_Golem` head)
- `/twbridge reload` and `/twbridge pair` commands for admin control

## Usage
1. In Minecraft, run `/tw` to receive a one-time TurboWarp link bound to your player. The link includes the right language file (`twbridge-<lang>.js`), WebSocket host, and token. For development, `/tw <branch>` lets you point the extension to a different git branch (default `main`).
2. Click the link. TurboWarp opens, loads the extension, and immediately connects to the bridge using the token.
3. Use the `twbridge` blocks. The connected player is locked to the token, so other players cannot be impersonated.

Legacy pairing (`/twbridge pair`) is disabled by default and can be re-enabled by setting `ws.allowLegacyPairing: true` if you really need it.

## Building
```bash
cd /home/nando/gitrepo/twbridge
./gradlew clean build
```
The shaded jar is written to `build/libs/twbridge-<version>.jar`.

## Config
`src/main/resources/config.yml` is copied to `plugins/twbridge/config.yml` on
first run. The important keys are:
- `ws.*`: WebSocket bind address, advertise address for links, rate limits, auth requirement (`requireSession`), legacy pairing toggle
- `magicLink.*`: TurboWarp base URL, extension template (`twbridge-:lang.js`), token TTL, default language
- `debug`: when true, detailed logs are emitted for each request

## Hangar Publish
Set `HANGAR_API_TOKEN` and run:
```bash
./gradlew hangarPublish -Phangar.channel=Release -PpaperVersion=1.21.1
```
You can override the plugin version via `-Pversion.override=1.0.0`.
