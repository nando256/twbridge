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
  const TWB_BLOCK_MENU_ITEMS = (() => {
    try {
      if (Array.isArray(TWB_BLOCK_CHOICES) && TWB_BLOCK_CHOICES.length > 0) {
        return TWB_BLOCK_CHOICES.map(entry => {
          if (Array.isArray(entry) && entry.length >= 2) {
            return { text: String(entry[0]), value: String(entry[1]) };
          }
          return null;
        }).filter(Boolean);
      }
    } catch (e) {}
    return [
      { text: 'stone', value: 'stone' },
      { text: 'dirt', value: 'dirt' },
      { text: 'cobblestone', value: 'cobblestone' }
    ];
  })();
  const TWB_EGG_CHOICES = (() => {
    try { return __EGG_LIST__; } catch (e) {
      return [
        ['Cow Spawn Egg','cow_spawn_egg'],
        ['Pig Spawn Egg','pig_spawn_egg']
      ];
    }
  })();
  const TWB_EGG_MENU_ITEMS = (() => {
    try {
      if (Array.isArray(TWB_EGG_CHOICES) && TWB_EGG_CHOICES.length > 0) {
        return TWB_EGG_CHOICES.map(entry => {
          if (Array.isArray(entry) && entry.length >= 2) {
            return { text: String(entry[0]), value: String(entry[1]) };
          }
          return null;
        }).filter(Boolean);
      }
    } catch (e) {}
    return [
      { text: 'Cow Spawn Egg', value: 'cow_spawn_egg' },
      { text: 'Pig Spawn Egg', value: 'pig_spawn_egg' }
    ];
  })();

  const TWB_LOCALES = {
    en: {
      extName: 'TurboAgent',
      blockConnect: 'reconnect saved link',
      blockDisconnect: 'disconnect ws',
      blockIsConnected: 'connected?',
      blockCurrentPlayer: 'connected player',
      blockRunCommand: 'execute [CMD]',
      blockTeleport: 'teleport agent [ID] to my player',
      blockDespawn: 'despawn agent [ID]',
      blockMove: 'move agent [ID] [DIRECTION] [BLOCKS] blocks',
      blockRotate: 'turn agent [ID] [TURN]',
      blockFacePlayer: 'turn agent [ID] toward player [PLAYER]',
      blockSlotActivate: 'activate agent [ID] slot [SLOT]',
      blockSlotSet: 'set agent [ID] slot [SLOT] to [BLOCK] x [COUNT]',
      blockSlotSetEgg: 'set agent [ID] slot [SLOT] to spawn egg [EGG] x [COUNT]',
      blockPlace: 'place from agent [ID] toward [DIR]',
      dirForward: 'forward',
      dirBack: 'back',
      dirRight: 'right',
      dirLeft: 'left',
      dirUp: 'up',
      dirDown: 'down',
      turnLeft: 'left',
      turnRight: 'right'
    }
  };

  let TWB_ACTIVE_LANG = 'en';

  function normalizeLang(raw) {
    const normalized = String(raw || '').trim().toLowerCase().replace(/_/g, '-');
    if (!normalized) return 'en';
    return normalized;
  }

  function scriptBaseUrl() {
    try {
      const script = typeof document !== 'undefined' ? document.currentScript : null;
      if (script && script.src) return script.src;
    } catch (e) {}
    try {
      if (typeof location !== 'undefined' && location.href) return location.href;
    } catch (e) {}
    return '';
  }

  async function loadLocale(lang) {
    const normalized = normalizeLang(lang);
    if (normalized === 'en') {
      TWB_ACTIVE_LANG = 'en';
      return 'en';
    }
    try {
      const base = scriptBaseUrl();
      const url = new URL(`./locale/${normalized}.json`, base || undefined);
      const res = await fetch(url.toString(), { credentials: 'same-origin' });
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === 'object') {
          TWB_LOCALES[normalized] = { ...TWB_LOCALES.en, ...data };
          TWB_ACTIVE_LANG = normalized;
          return normalized;
        }
      }
    } catch (e) {
      console.warn('[turboagent] locale load failed', e);
    }
    TWB_ACTIVE_LANG = 'en';
    return 'en';
  }

  function twbText(key) {
    const fallback = TWB_LOCALES.en || {};
    const dict = TWB_LOCALES[TWB_ACTIVE_LANG] || fallback;
    return (dict && dict[key]) || fallback[key] || key;
  }

  let bridge = null;

  class Bridge {
    constructor(bootConfig) {
      this.boot = bootConfig || { host: '', token: '', lang: '' };
      this.ws = null;
      this.wsUrl = (this.boot.host && this.boot.host.trim()) || WS_DEFAULT;
      this.sessionId = null;
      this.boundPlayer = null;
      this.blockChoices = Array.isArray(TWB_BLOCK_CHOICES)
        ? TWB_BLOCK_CHOICES.map(entry => {
          if (Array.isArray(entry) && entry.length >= 2) {
            return { name: String(entry[0]), id: String(entry[1]) };
          }
          return null;
        }).filter(Boolean)
        : [];
      this.waiters = new Map();
      this.opening = false;
      this.connected = false;
      this.autoConnecting = false;
      this._autoConnectFromBoot();
    }

    agentBlockChoicesMenu() {
      if (this.blockChoices && this.blockChoices.length > 0) {
        return this.blockChoices.map(({ id, name }) => [name, id]);
      }
      return [
        ['stone', 'stone'],
        ['dirt', 'dirt'],
        ['cobblestone', 'cobblestone']
      ];
    }

    _uuid() {
      if (typeof crypto !== 'undefined' && crypto && crypto.randomUUID) return crypto.randomUUID();
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
        console.warn('[turboagent] auto connect failed', e);
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
        id: 'turboagent',
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
            opcode: 'setAgentSlotEgg',
            blockType: Scratch.BlockType.COMMAND,
            text: twbText('blockSlotSetEgg'),
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'agent1' },
              EGG: {
                type: Scratch.ArgumentType.STRING,
                menu: 'agentEggChoices',
                defaultValue: 'cow_spawn_egg'
              },
              COUNT: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
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
            items: TWB_BLOCK_MENU_ITEMS
          },
          agentEggChoices: {
            acceptReporters: false,
            items: TWB_EGG_MENU_ITEMS
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
      return TWB_BLOCK_MENU_ITEMS.map(item => [item.text, item.value]);
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
    async setAgentSlotEgg(args) {
      await bridge.setAgentSlotBlock(
        String(args.ID || ""),
        String(args.EGG || "cow_spawn_egg"),
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
      console.error('[turboagent] Scratch.extensions.register not available');
    }
  }

  initTwBridge();
})();
