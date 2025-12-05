(() => {
  // Minimal test extension to verify loading; no WS dependencies.
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
            text: 'twbridge test (loaded)',
            arguments: {}
          }
        ]
      };
    }

    ping() {
      return 'loaded';
    }
  }

  if (typeof Scratch?.extensions?.register === 'function') {
    Scratch.extensions.register(new TwBridgeTest());
  } else if (typeof window !== 'undefined') {
    console.error('[twbridge-test] Scratch.extensions.register not available');
  }
})();
