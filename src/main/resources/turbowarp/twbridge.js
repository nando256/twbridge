(() => {
  const WS_DEFAULT = "ws://127.0.0.1:8787";
  const TWB_BOOT_CONFIG = (() => {
    const fromQuery = () => {
      try {
        const script = typeof document !== 'undefined' ? document.currentScript : null;
        if (!script || !script.src) return null;
        const idx = script.src.indexOf('?');
        if (idx < 0) return null;
        const query = script.src.substring(idx + 1);
        const params = new URLSearchParams(query);
        return {
          host: params.get('host') || '',
          token: params.get('token') || '',
          lang: params.get('lang') || ''
        };
      } catch (e) { return null; }
    };

    const fromHash = () => {
      try {
        const hash = (typeof location !== 'undefined' && location.hash) ? location.hash.replace(/^#/, '') : '';
        const params = new URLSearchParams(hash);
        return {
          host: params.get('host') || '',
          token: params.get('token') || '',
          lang: params.get('lang') || ''
        };
      } catch (e) { return null; }
    };

    return fromQuery() || fromHash() || { host: '', token: '', lang: '' };
  })();
  const TWB_DEFAULT_LANG = "en";
  const TWB_BLOCK_CHOICES = (() => {
    try { return __BLOCK_LIST__; } catch (e) {
      return [
        ['stone','stone'],
        ['dirt','dirt'],
        ['cobblestone','cobblestone']
      ];
    }
  })();
        setTimeout(() => {
          if (this.waiters.has(id)) { this.waiters.delete(id); reject('timeout'); }
        }, 5000);
      });
    }

    async connectWithToken(url, token) {
      const trimmedToken = String(token || '').trim();
      if (!trimmedToken) throw new Error('token required');
      await this._ensureWS(url);
      const res = await this._send({
        cmd: 'token.start',
        token: trimmedToken
      });
      if (!res.sessionId) throw new Error('auth failed');
      this.sessionId = res.sessionId;
      this.boundPlayer = res.player || '';
      this.boot.token = trimmedToken;
      this.boot.host = this.wsUrl;
    }

    async reconnectSaved() {
      const url = this.boot.host && this.boot.host.trim();
      const token = this.boot.token && this.boot.token.trim();
      if (!url || !token) throw new Error('missing saved link info');
      await this.connectWithToken(url, token);
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
      return this.connected && this.ws && this.ws.readyState === WebSocket.OPEN && !!this.sessionId;
    }

    currentPlayer() {
      return this.boundPlayer || '';
    }

    setAvailableBlocks(blocks) {
      if (!Array.isArray(blocks)) {
        this.blockChoices = this.blockChoices && this.blockChoices.length ? this.blockChoices : [];
        return;
      }
      this.blockChoices = blocks
        .map(block => {
          if (Array.isArray(block) && block.length >= 2) {
            const name = String(block[0] || '').trim();
            const id = String(block[1] || '').trim();
            if (!id) return null;
            return { id, name: name || id };
          }
          const id = String(block.id || '').trim();
          const name = String(block.name || '').trim();
          if (!id) return null;
          return { id, name: name || id };
        })
        .filter(Boolean);
    }

    async _autoConnectFromBoot() {
      if (this.autoConnecting) return;
      if (!this.boot || !this.boot.token) return;
      this.autoConnecting = true;
      try {
        await this.connectWithToken(this.boot.host || this.wsUrl, this.boot.token);
        await this.fetchBlocksSafe();
      } catch (e) {
        console.warn('[twbridge] auto connect failed', e);
      } finally {
        this.autoConnecting = false;
      }
    }

    async fetchBlocksSafe() {
      try {
        this.setAvailableBlocks(TWB_BLOCK_CHOICES);
      } catch (e) { /* ignore */ }
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
      if (!['forward', 'back', 'right', 'left', 'up', 'down'].includes(dir)) throw new Error('invalid direction');
      if (!Number.isFinite(stepsRaw)) throw new Error('blocks must be a number');
      const steps = Math.max(1, Math.min(Math.round(Math.abs(stepsRaw)), 64));
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) await this._ensureWS();
      return this._send({ cmd: 'agent.move', agentId: id, direction: dir, blocks: steps });
    }

    async rotateAgent(agentId, turn) {
      if (!this.sessionId) throw new Error('not connected');
      if (!this.boundPlayer) throw new Error('player not bound');
      const id = String(agentId || '').trim();
      const turnDir = String(turn || '').trim().toLowerCase();
      if (!id) throw new Error('agent id required');
      if (!['left', 'right'].includes(turnDir)) throw new Error('invalid turn');
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) await this._ensureWS();
      return this._send({ cmd: 'agent.rotate', agentId: id, direction: turnDir });
    }

    async faceAgentToPlayer(agentId, targetPlayer) {
      if (!this.sessionId) throw new Error('not connected');
      if (!this.boundPlayer) throw new Error('player not bound');
      const id = String(agentId || '').trim();
      const player = String(targetPlayer || '').trim();
      if (!id) throw new Error('agent id required');
      if (!player) throw new Error('target player required');
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) await this._ensureWS();
      return this._send({ cmd: 'agent.facePlayer', agentId: id, targetPlayer: player });
    }

    async activateAgentSlot(agentId, slot) {
      if (!this.sessionId) throw new Error('not connected');
      if (!this.boundPlayer) throw new Error('player not bound');
      const id = String(agentId || '').trim();
      const slotNum = Number(slot);
      if (!id) throw new Error('agent id required');
      if (!Number.isInteger(slotNum) || slotNum < 1 || slotNum > 27) throw new Error('slot must be 1-27');
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) await this._ensureWS();
      return this._send({ cmd: 'agent.slotActivate', agentId: id, slot: slotNum });
    }

    async setAgentSlotBlock(agentId, block, amount, slot) {
        if (!this.sessionId) throw new Error('not connected');
        if (!this.boundPlayer) throw new Error('player not bound');
        const id = String(agentId || '').trim();
        const blockId = String(block || '').trim();
        const qty = Number(amount);
        const slotNum = Number(slot);
        if (!id) throw new Error('agent id required');
        if (!blockId) throw new Error('block required');
        if (!Number.isInteger(qty) || qty < 1 || qty > 64) throw new Error('amount must be 1-64');
        if (!Number.isInteger(slotNum) || slotNum < 1 || slotNum > 27) throw new Error('slot must be 1-27');
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) await this._ensureWS();
      return this._send({ cmd: 'agent.slotSetBlock', agentId: id, block: blockId, amount: qty, slot: slotNum });
    }

    async placeBlock(agentId, dir) {
      if (!this.sessionId) throw new Error('not connected');
      if (!this.boundPlayer) throw new Error('player not bound');
      const id = String(agentId || '').trim();
      const direction = String(dir || '').trim().toLowerCase();
      if (!id) throw new Error('agent id required');
      if (!['forward','back','left','right','up','down'].includes(direction)) throw new Error('invalid direction');
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) await this._ensureWS();
      return this._send({ cmd: 'agent.place', agentId: id, direction });
    }
  }

  class TwBridgeExt {
    getInfo() {
      return {
        id: 'twbridge',
        name: twbText('extName'),
        color1: '#4b87ff',
        color2: '#2a5bd7',
        blocks: [
          {
            opcode: 'connect',
            blockType: Scratch.BlockType.COMMAND,
            text: twbText('blockConnect')
          },
          {
            opcode: 'disconnect',
            blockType: Scratch.BlockType.COMMAND,
            text: twbText('blockDisconnect')
          },
          {
            opcode: 'isConnected',
            blockType: Scratch.BlockType.BOOLEAN,
            text: twbText('blockIsConnected')
          },
          {
            opcode: 'currentPlayer',
            blockType: Scratch.BlockType.REPORTER,
            text: twbText('blockCurrentPlayer')
          },
          {
            opcode: 'runCommand',
            blockType: Scratch.BlockType.COMMAND,
            text: twbText('blockRunCommand'),
            arguments: {
              CMD: { type: Scratch.ArgumentType.STRING, defaultValue: 'say hello from tw' }
            }
          },
          {
            opcode: 'teleportAgent',
            blockType: Scratch.BlockType.COMMAND,
            text: twbText('blockTeleport'),
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'agent1' }
            }
          },
          {
            opcode: 'despawnAgent',
            blockType: Scratch.BlockType.COMMAND,
            text: twbText('blockDespawn'),
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'agent1' }
            }
          },
          {
            opcode: 'moveAgent',
            blockType: Scratch.BlockType.COMMAND,
            text: twbText('blockMove'),
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'agent1' },
              DIRECTION: {
                type: Scratch.ArgumentType.STRING,
                menu: 'agentDirections',
                defaultValue: 'forward'
              },
              BLOCKS: { type: Scratch.ArgumentType.NUMBER, defaultValue: 3 }
            }
          },
          {
            opcode: 'rotateAgent',
            blockType: Scratch.BlockType.COMMAND,
            text: twbText('blockRotate'),
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'agent1' },
              TURN: {
                type: Scratch.ArgumentType.STRING,
                menu: 'agentTurnDirections',
                defaultValue: 'left'
              }
            }
          },
          {
            opcode: 'faceAgentToPlayer',
            blockType: Scratch.BlockType.COMMAND,
            text: twbText('blockFacePlayer'),
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'agent1' },
              PLAYER: { type: Scratch.ArgumentType.STRING, defaultValue: '' }
            }
          },
          {
            opcode: 'activateAgentSlot',
            blockType: Scratch.BlockType.COMMAND,
            text: twbText('blockSlotActivate'),
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'agent1' },
              SLOT: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 }
            }
          },
          {
            opcode: 'setAgentSlotBlock',
            blockType: Scratch.BlockType.COMMAND,
            text: twbText('blockSlotSet'),
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'agent1' },
              BLOCK: {
                type: Scratch.ArgumentType.STRING,
                menu: 'agentBlockChoices',
                defaultValue: 'stone'
              },
              COUNT: { type: Scratch.ArgumentType.NUMBER, defaultValue: 16 },
              SLOT: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 }
            }
          },
          {
            opcode: 'placeBlock',
            blockType: Scratch.BlockType.COMMAND,
            text: twbText('blockPlace'),
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'agent1' },
              DIR: {
                type: Scratch.ArgumentType.STRING,
                menu: 'agentPlaceDirections',
                defaultValue: 'forward'
              }
            }
          }
        ],
        menus: {
          agentDirections: {
            acceptReporters: false,
            items: [
              { text: twbText('dirForward'), value: 'forward' },
              { text: twbText('dirBack'), value: 'back' },
              { text: twbText('dirRight'), value: 'right' },
              { text: twbText('dirLeft'), value: 'left' },
              { text: twbText('dirUp'), value: 'up' },
              { text: twbText('dirDown'), value: 'down' }
            ]
          },
          agentTurnDirections: {
            acceptReporters: false,
            items: [
              { text: twbText('turnLeft'), value: 'left' },
              { text: twbText('turnRight'), value: 'right' }
            ]
          },
          agentBlockChoices: {
            acceptReporters: false,
            items: 'agentBlockChoicesMenu'
          },
          agentPlaceDirections: {
            acceptReporters: false,
            items: [
              { text: twbText('dirForward'), value: 'forward' },
              { text: twbText('dirBack'), value: 'back' },
              { text: twbText('dirRight'), value: 'right' },
              { text: twbText('dirLeft'), value: 'left' },
              { text: twbText('dirUp'), value: 'up' },
              { text: twbText('dirDown'), value: 'down' }
            ]
          }
        }
      };
    }

    agentBlockChoicesMenu() {
      return bridge.agentBlockChoicesMenu();
    }

    async connect() {
      await bridge.reconnectSaved();
      await bridge.fetchBlocksSafe();
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
    async rotateAgent(args) {
      await bridge.rotateAgent(
        String(args.ID || ""),
        args.TURN || "left"
      );
    }
    async faceAgentToPlayer(args) {
      await bridge.faceAgentToPlayer(
        String(args.ID || ""),
        String(args.PLAYER || "") || bridge.currentPlayer()
      );
    }
    async activateAgentSlot(args) {
      await bridge.activateAgentSlot(
        String(args.ID || ""),
        Number(args.SLOT || 1)
      );
    }
    async setAgentSlotBlock(args) {
      await bridge.setAgentSlotBlock(
        String(args.ID || ""),
        String(args.BLOCK || "stone"),
        Number(args.COUNT || 1),
        Number(args.SLOT || 1)
      );
    }
    async placeBlock(args) {
      await bridge.placeBlock(
        String(args.ID || ""),
        args.DIR || "forward"
      );
    }
  }

  async function initTwBridge() {
    await loadLocale(TWB_BOOT_CONFIG.lang || TWB_DEFAULT_LANG);
    bridge = new Bridge(TWB_BOOT_CONFIG);
    if (Scratch && Scratch.extensions && typeof Scratch.extensions.register === 'function') {
      Scratch.extensions.register(new TwBridgeExt());
    } else {
      console.error('[twbridge] Scratch.extensions.register not available');
    }
  }

  initTwBridge();
})();
