(() => {
  // Minimal test extension to verify loading; no WS dependencies.
  const Scratch = (typeof globalThis !== 'undefined' && globalThis.Scratch) ? globalThis.Scratch : null;
  if (!Scratch || !Scratch.extensions || typeof Scratch.extensions.register !== 'function') {
    console.error('[twbridge-test] Scratch environment not available');
    return;
  }
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

  Scratch.extensions.register(new TwBridgeTest());
})();
