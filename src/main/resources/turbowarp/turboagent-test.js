(() => {
  // Minimal test extension to verify loading; no WS dependencies.
  const Scratch = (typeof globalThis !== 'undefined' && globalThis.Scratch) ? globalThis.Scratch : null;
  if (!Scratch || !Scratch.extensions || typeof Scratch.extensions.register !== 'function') {
    console.error('[turboagent-test] Scratch environment not available');
    return;
  }
  const { BlockType } = Scratch;

  class TurboAgentTest {
    getInfo() {
      return {
        id: 'turboagentTest',
        name: 'TurboAgent Test',
        blocks: [
          {
            opcode: 'ping',
            blockType: BlockType.REPORTER,
            text: 'turboagent test (loaded)',
            arguments: {}
          }
        ]
      };
    }

    ping() {
      return 'loaded';
    }
  }

  Scratch.extensions.register(new TurboAgentTest());
})();
