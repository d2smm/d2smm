(() => {
  'use strict';

  function create({getGame, coreReady, onChange, connectGame}) {
    let core = null, binding = null, pending = null, closed = false, problem = '';

    function fail(error) {
      if (closed) return;
      problem = error.message;
      core?.d2smm_zoom_configure(0);
      console.warn('[QoL] wheel zoom unavailable', error);
      onChange();
    }

    async function connect() {
      if (closed || binding || pending || problem || !core) return;
      pending = (async () => {
        const contract = await connectGame();
        if (!contract || closed) return;
        const base = await D2GameContract.analyze(contract.url);
        const layout = base.method('layout');
        const calls = base.calls(layout).filter(call => {
          const argument = call.arguments[0];
          return call.arguments.length === 1 && argument?.type === 'MemberExpression' &&
            argument.object?.type === 'ThisExpression' && argument.property?.name === 'scale';
        });
        if (calls.length !== 1) throw Error('Native zoom label binding changed');
        const labels = await base.binding(calls[0]);
        if (typeof labels.value !== 'function') throw Error('Native zoom label scale is unavailable');
        const prototype = contract.Game.prototype, original = prototype.layout;
        if (!Object.getOwnPropertyDescriptor(prototype, 'layout')?.writable)
          throw Error('Native viewport layout is unavailable');
        if (closed) return;
        const wrapper = function(...args) {
          const result = original.apply(this, args);
          if (closed || problem || this !== getGame() || !this.world?.view) return result;
          const nativeScale = this.scale, screen = this.app.screen;
          this.scale = core.d2smm_zoom_scale(nativeScale);
          this.world.view.halfW = core.d2smm_zoom_half_extent(screen.width, nativeScale);
          this.world.view.halfH = core.d2smm_zoom_half_extent(screen.height, nativeScale);
          labels.value(this.scale);
          return result;
        };
        prototype.layout = wrapper;
        binding = {prototype, original, wrapper, source: contract.url, labelExport: labels.name};
        onChange();
      })().catch(fail).finally(() => { pending = null; });
      await pending;
    }

    function wheel(event) {
      const game = getGame();
      if (!core || !binding || closed || problem || !game) return;
      const target = event.composedPath()[0];
      const facts = Number(target === game.app?.canvas) |
        (Number(game.state === 'camp' || game.state === 'playing') << 1) |
        (Number(!event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey && !event.defaultPrevented) << 2) |
        (Number(!game.hud?.skillsOpen && !game.hud?.questLogOpen && !game.frontend?.surface?.screen) << 3);
      if (!core.d2smm_zoom_wheel(event.deltaY, event.deltaMode, game.app.screen.height, facts)) return;
      event.preventDefault();
      event.stopPropagation();
    }

    document.addEventListener('wheel', wheel, {passive: false});
    const ready = coreReady.then(value => { core = value; return connect(); }).catch(fail);
    return Object.freeze({
      ready, connect,
      configure(enabled) { if (core) core.d2smm_zoom_configure(Number(enabled)); },
      status: () => ({connected: !!binding, problem, distance: core?.d2smm_zoom_distance() ?? 1}),
      async dispose() {
        closed = true;
        document.removeEventListener('wheel', wheel);
        await ready;
        if (pending) await pending;
        core?.d2smm_zoom_configure(0);
        if (binding && binding.prototype.layout === binding.wrapper) binding.prototype.layout = binding.original;
        const game = getGame();
        if (game?.world) game.layout();
      }
    });
  }

  globalThis.D2QolZoom = Object.freeze({create});
})();
