(() => {
  // Minimal test extension to verify loading; no WS dependencies.
  const boot = (() => {
    try {
      const script = typeof document !== 'undefined' ? document.currentScript : null;
      if (script && script.src && script.src.includes('?')) {
        const params = new URLSearchParams(script.src.split('?')[1]);
        return {
          host: params.get('host') || '',
          token: params.get('token') || ''
        };
      }
    } catch (e) {}
    return { host: '', token: '' };
  })();

  const Scratch = window.Scratch || {};
  const { BlockType } = Scratch;

  class TwBridgeTest {
    getInfo() {
      return {
        id: 'twbridgeTest',
        name: 'Tw Bridge Test',
        blocks: [
          {
            opcode: 'ping',
            blockType: BlockType.REPORTER,
            text: 'twbridge test (host:[HOST] token:[TOKEN])',
            arguments: {}
          }
        ]
      };
    }

    ping() {
      return `loaded host:${boot.host || ''} token:${boot.token || ''}`;
    }
  }

  if (typeof Scratch?.extensions?.register === 'function') {
    Scratch.extensions.register(new TwBridgeTest());
  } else if (typeof window !== 'undefined') {
    console.error('[twbridge-test] Scratch.extensions.register not available');
  }
})();
