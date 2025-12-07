# TurboAgent (TurboWarp Bridge Plugin)

TurboAgent is a Paper plugin that exposes a WebSocket bridge for TurboWarp
(Scratch) projects. It lets you connect from TurboWarp, run Minecraft commands,
spawn/teleport a minimal "agent" armor stand, and despawn it programmatically.

Japanese README: [README.ja.md](README.ja.md)

## Features
- Magic link: `/tw` generates a per-player link to the local HTTP-served TurboWarp (`editor.html` / `turboagent.js`) and connects to the local WS.
- Extension script: single `turboagent.js` plus `locale/*.json` for i18n. Block/spawn-egg lists are embedded server-side at startup and served as static files.
- Blocks: connect, disconnect, status, run command, summon/teleport/rotate/face player, switch slot, set block, set spawn egg, place forward, etc.
- Login prompt: players with permission get an automatic magic link prompt (English/Japanese based on client locale) with click and ad-block hints.
- Agents: armor stands that are invulnerable, hover at block center, glow, and wear iron/leather with `MHF_Golem` head.

## Usage
1. Run `/tw` in Minecraft to receive a player-bound TurboWarp link (WS host/port, token, language). A prompt also appears on login for permitted players.
2. Click the link. TurboWarp opens from the local HTTP server (default `http://<bind>:8788`) and connects to WS (default `ws://<bind>:8787`) with the token.
3. Use the `turboagent` blocks. The token is bound to the player, preventing impersonation.

## Building
```bash
./gradlew clean build
```
The shaded jar is written to `build/libs/turboagent-<version>.jar`.

## Config
`src/main/resources/config.yml` is copied to `plugins/TurboAgent/config.yml` on
first run. Key settings:
- `ws.bindAddress`, `ws.port`: WebSocket bind target; the same host/port is embedded in links.
- `ws.requireSession`, `ws.requirePairing`, `ws.maxMsg*`, `ws.originWhitelist`: auth and rate limits.
- `http.*`: Local TurboWarp static file server (default 0.0.0.0:8788).
- `magicLink.*`: token TTL and default language.
- `debug`: enable verbose logging.

## Hangar Publish
Set `HANGAR_API_TOKEN` and run:
```bash
./gradlew hangarPublish -Phangar.channel=Release -PpaperVersion=1.21.1
```
You can override the plugin version via `-Pversion.override=1.0.0`.

## Credits / Licenses

This project uses **TurboWarp**, which is a modification of Scratch.
- **TurboWarp**: Copyright (c) 2020-2023 Thomas Weber (GarboMuffin). Licensed under the BSD-3-Clause License.
- **Scratch**: Copyright (c) 2019 Massachusetts Institute of Technology. Licensed under the BSD-3-Clause License.

Full license text can be found in the web-client directory after installation.
