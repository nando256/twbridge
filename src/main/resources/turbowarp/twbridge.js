(() => {
  const WS_DEFAULT = "ws://127.0.0.1:8787";

  class Bridge {
    constructor() {
      this.ws = null;
      this.wsUrl = WS_DEFAULT;
      this.sessionId = null;
      this.boundPlayer = null;
      this.waiters = new Map();
      this.opening = false;
      this.connected = false;
    }

    _uuid() {
      if (crypto && crypto.randomUUID) return crypto.randomUUID();
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }

    async _ensureWS(url) {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) return;
      if (this.opening) {
        await new Promise(res => setTimeout(res, 100));
        return this._ensureWS(url);
      }
      this.opening = true;
      this.wsUrl = url || this.wsUrl || WS_DEFAULT;
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onmessage = ev => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.id && this.waiters.has(msg.id)) {
            const { resolve, reject } = this.waiters.get(msg.id);
            this.waiters.delete(msg.id);
            msg.ok ? resolve(msg.result || {}) : reject(msg.error || 'error');
          }
        } catch {}
      };
      this.ws.onclose = () => { this.sessionId = null; this.boundPlayer = null; this.connected = false; };
      await new Promise((resolve, reject) => {
        this.ws.onopen = () => resolve();
        this.ws.onerror = () => { this.connected = false; reject(new Error('ws open failed')); };
        setTimeout(() => reject(new Error('ws open timeout')), 3000);
      });
      this.connected = true;
      this.opening = false;
    }

    _send(payload) {
      return new Promise((resolve, reject) => {
        const id = this._uuid();
        this.waiters.set(id, { resolve, reject });
        this.ws.send(JSON.stringify({ id, sessionId: this.sessionId, ...payload }));
        setTimeout(() => {
          if (this.waiters.has(id)) { this.waiters.delete(id); reject('timeout'); }
        }, 5000);
      });
    }

    async connectAndPair(url, code, player) {
      const playerName = String(player || '').trim();
      if (!playerName) throw new Error('player required');
      await this._ensureWS(url);
      const res = await this._send({
        cmd: 'pair.start',
        code: String(code || '').trim(),
        player: playerName
      });
      if (!res.sessionId) throw new Error('pairing failed');
      this.sessionId = res.sessionId;
      this.boundPlayer = playerName;
    }

    disconnect() {
      this.sessionId = null;
      this.boundPlayer = null;
      this.connected = false;
      if (this.ws) {
        try { this.ws.close(); } catch {}
      }
      this.ws = null;
      this.opening = false;
      this.waiters.forEach(({ reject }) => { try { reject('disconnected'); } catch {} });
      this.waiters.clear();
    }

    isConnected() {
      return this.connected && this.ws && this.ws.readyState === WebSocket.OPEN;
    }

    currentPlayer() {
      return this.boundPlayer || '';
    }

    async runCommand(command) {
      if (!this.sessionId) throw new Error('not connected');
      const cmd = String(command || '').trim();
      if (!cmd) throw new Error('command required');
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) await this._ensureWS();
      return this._send({ cmd: 'command.run', command: cmd });
    }

    async teleportAgent(agentId) {
      if (!this.sessionId) throw new Error('not connected');
      if (!this.boundPlayer) throw new Error('player not bound');
      const id = String(agentId || '').trim();
      if (!id) throw new Error('agent id required');
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) await this._ensureWS();
      return this._send({ cmd: 'agent.teleportToPlayer', agentId: id });
    }

    async despawnAgent(agentId) {
      if (!this.sessionId) throw new Error('not connected');
      if (!this.boundPlayer) throw new Error('player not bound');
      const id = String(agentId || '').trim();
      if (!id) throw new Error('agent id required');
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) await this._ensureWS();
      return this._send({ cmd: 'agent.despawn', agentId: id });
    }

    async moveAgent(agentId, direction, blocks) {
      if (!this.sessionId) throw new Error('not connected');
      if (!this.boundPlayer) throw new Error('player not bound');
      const id = String(agentId || '').trim();
      const dir = String(direction || '').trim().toLowerCase();
      const stepsRaw = Number(blocks);
      if (!id) throw new Error('agent id required');
      if (!['forward', 'back', 'right', 'left'].includes(dir)) throw new Error('invalid direction');
      if (!Number.isFinite(stepsRaw)) throw new Error('blocks must be a number');
      const steps = Math.max(1, Math.min(Math.round(Math.abs(stepsRaw)), 64));
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) await this._ensureWS();
      return this._send({ cmd: 'agent.move', agentId: id, direction: dir, blocks: steps });
    }
  }

  const bridge = new Bridge();

  class TwBridgeExt {
    getInfo() {
      return {
        id: 'twbridge',
        name: 'Tw Bridge',
        color1: '#4b87ff',
        color2: '#2a5bd7',
        blocks: [
          {
            opcode: 'connect',
            blockType: Scratch.BlockType.COMMAND,
            text: 'connect ws [URL] with pair code [CODE] as player [PLAYER]',
            arguments: {
              URL: { type: Scratch.ArgumentType.STRING, defaultValue: WS_DEFAULT },
              CODE:{ type: Scratch.ArgumentType.STRING, defaultValue: '000000' },
              PLAYER:{ type: Scratch.ArgumentType.STRING, defaultValue: 'Steve' }
            }
          },
          {
            opcode: 'disconnect',
            blockType: Scratch.BlockType.COMMAND,
            text: 'disconnect ws'
          },
          {
            opcode: 'isConnected',
            blockType: Scratch.BlockType.BOOLEAN,
            text: 'connected?'
          },
          {
            opcode: 'currentPlayer',
            blockType: Scratch.BlockType.REPORTER,
            text: 'connected player'
          },
          {
            opcode: 'runCommand',
            blockType: Scratch.BlockType.COMMAND,
            text: 'execute [CMD]',
            arguments: {
              CMD: { type: Scratch.ArgumentType.STRING, defaultValue: 'say hello from tw' }
            }
          },
          {
            opcode: 'teleportAgent',
            blockType: Scratch.BlockType.COMMAND,
            text: 'teleport agent [ID] to my player',
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'agent1' }
            }
          },
          {
            opcode: 'despawnAgent',
            blockType: Scratch.BlockType.COMMAND,
            text: 'despawn agent [ID]',
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'agent1' }
            }
          },
          {
            opcode: 'moveAgent',
            blockType: Scratch.BlockType.COMMAND,
            text: 'move agent [ID] [DIRECTION] [BLOCKS] blocks',
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'agent1' },
              DIRECTION: {
                type: Scratch.ArgumentType.STRING,
                menu: 'agentDirections',
                defaultValue: 'forward'
              },
              BLOCKS: { type: Scratch.ArgumentType.NUMBER, defaultValue: 3 }
            }
          }
        ],
        menus: {
          agentDirections: {
            acceptReporters: false,
            items: [
              { text: 'forward', value: 'forward' },
              { text: 'back', value: 'back' },
              { text: 'right', value: 'right' },
              { text: 'left', value: 'left' }
            ]
          }
        }
      };
    }

    async connect(args) {
      await bridge.connectAndPair(
        String(args.URL),
        String(args.CODE),
        String(args.PLAYER || "")
      );
    }
    disconnect() { bridge.disconnect(); }
    isConnected() { return bridge.isConnected(); }
    currentPlayer() { return bridge.currentPlayer(); }
    async runCommand(args) { await bridge.runCommand(String(args.CMD || "")); }
    async teleportAgent(args) { await bridge.teleportAgent(String(args.ID || "")); }
    async despawnAgent(args) { await bridge.despawnAgent(String(args.ID || "")); }
    async moveAgent(args) {
      await bridge.moveAgent(
        String(args.ID || ""),
        args.DIRECTION || "forward",
        Number(args.BLOCKS || 0)
      );
    }
  }

  Scratch.extensions.register(new TwBridgeExt());
})();
