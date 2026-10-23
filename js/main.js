(() => {
  'use strict';
  const root = document.getElementById('tolstoy-project');
  if (!root) return;
  const $ = selector => root.querySelector(selector);
  const $$ = selector => [...root.querySelectorAll(selector)];
  const clamp = value => Math.max(0, Math.min(1, value));
  const interval = (p, start, end) => clamp((p - start) / (end - start));
  const smooth = p => p * p * (3 - 2 * p);
  const set = (el, key, value) => el.style.setProperty(key, value);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const shortWindow = matchMedia('(max-height:660px)');
  const hero = $('.hero-scroll');
  const quests = $('.quests');
  const scan = $('.scan-scroll');
  const treeLevels = $$('.tree-level');
  const scanButtons = $$('[data-stage]');
  const treePanorama = $('.tree-panorama');
  const moments = $$('.tree-moment');
  const stages = $$('[data-scan-copy]').map(item => [item.querySelector('h3').textContent, item.querySelector('p').textContent]);
  let metrics;
  let queued = false;
  let pendingMeasure = true;
  let manualProgress = null;
  let stageIndex = -1;
  function measure() {
    const bounds = el => ({top:el.getBoundingClientRect().top + scrollY, height:el.offsetHeight});
    const canvas = $('.scan-canvas');
    metrics = {hero:bounds(hero), quests:bounds($('.tree-scroll')), scan:bounds(scan), viewport:innerHeight, mobile:innerWidth <= 600, canvasWidth:canvas.clientWidth, canvasHeight:canvas.clientHeight, paperWidth:$('.scan-document').clientWidth, treeHeight:treePanorama.clientHeight, treeViewport:$('.tree-viewport').clientHeight};
    window.TolstoyManuscript.measure();
    pendingMeasure = false;
  }
  function progress(bounds) { return clamp((scrollY - bounds.top) / Math.max(1, bounds.height - metrics.viewport)); }
  function paintTree(p, staticMode = false) {
    const starts = [0, .12, .28, .48, .70];
    const ends = [.12, .28, .48, .70, .89];
    treeLevels.forEach((group, index) => set(group, '--growth', interval(p, starts[index], ends[index]).toFixed(4)));
    set(quests, '--terminal-opacity', interval(p, .89, .93).toFixed(4));
    const camera = staticMode ? 0 : smooth(interval(p, .25, .92)) * Math.max(0, metrics.treeHeight - metrics.treeViewport);
    set(treePanorama, '--tree-camera', `${(-camera).toFixed(2)}px`);
    moments.forEach((moment, index) => {
      const reached = p >= [0, .31, .80][index];
      moment.classList.toggle('is-hidden', !reached);
      moment.setAttribute('aria-hidden', String(!reached));
    });
    quests.dataset.progress = p.toFixed(4);
  }
  function paintScan(p) {
    const next = window.TolstoyManuscript.paint(p);
    if (next !== stageIndex) {
      stageIndex = next;
      $('.scan-description h3').textContent = stages[next][0];
      $('.scan-description p').textContent = stages[next][1];
      $('.scan-counter').textContent = `${'ABCDE'[next]} / E`;
      scanButtons.forEach(button => button.setAttribute('aria-pressed', String(+button.dataset.stage === next)));
    }
    scan.dataset.stage = String(next);
    scan.dataset.progress = p.toFixed(4);
  }
  function render() {
    queued = false;
    if (pendingMeasure || !metrics) measure();
    const staticMode = reducedMotion.matches || shortWindow.matches;
    // Natural-height cover: title departs, portrait lags, cream sheet overlaps the lower edge.
    const coverProgress = clamp((scrollY - metrics.hero.top) / metrics.hero.height);
    set(hero, '--portrait-y', `${staticMode ? 0 : Math.min(96, coverProgress * metrics.hero.height * .18).toFixed(2)}px`);
    set(hero, '--cover-title-y', `${staticMode ? 0 : (-56 * coverProgress).toFixed(2)}px`);
    set(hero, '--cover-caption-opacity', staticMode ? 1 : (1 - coverProgress * .45).toFixed(3));
    set(root, '--cream-y', `${staticMode ? 0 : ((metrics.mobile ? 28 : 60) * (1 - smooth(interval(coverProgress, 0, .60)))).toFixed(2)}px`);
    hero.dataset.progress = coverProgress.toFixed(4);
    paintTree(staticMode ? 1 : progress(metrics.quests), staticMode);
    paintScan(manualProgress ?? (staticMode ? 1 : progress(metrics.scan)));
  }
  function schedule(needsMeasure = false) {
    pendingMeasure ||= needsMeasure;
    if (!queued) { queued = true; requestAnimationFrame(render); }
  }
  root.classList.add('enhanced');
  render();
  window.addEventListener('scroll', () => { manualProgress = null; schedule(); }, {passive:true});
  window.addEventListener('resize', () => schedule(true), {passive:true});
  window.addEventListener('pageshow', () => schedule(true));
  reducedMotion.addEventListener('change', () => {manualProgress = null; schedule(true);});
  shortWindow.addEventListener('change', () => {manualProgress = null; schedule(true);});
  if ('ResizeObserver' in window) new ResizeObserver(() => schedule(true)).observe(root);
  document.fonts?.ready.then(() => schedule(true));
  scanButtons.forEach(button => button.addEventListener('click', () => {
    manualProgress = [.04, .24, .43, .65, .90][+button.dataset.stage];
    schedule();
  }));
})();
