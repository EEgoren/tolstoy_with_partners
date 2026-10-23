/* v0.6: only the archival manuscript scene; the existing scroll scheduler calls paint. */
(() => {
  'use strict';
  const root = document.getElementById('tolstoy-project');
  const scene = root.querySelector('.scan-scroll');
  const canvas = scene.querySelector('.scan-canvas');
  const documentImage = scene.querySelector('.scan-document');
  const sheet = scene.querySelector('.ms-sheet');
  const output = scene.querySelector('.ms-output');
  const quotes = [...scene.querySelectorAll('[data-ms-fragment]')];
  const tabs = [...scene.querySelectorAll('[data-ms-tab]')];
  const NS = 'http://www.w3.org/2000/svg';
  const clamp = value => Math.max(0, Math.min(1, value));
  const interval = (p, start, end) => clamp((p - start) / (end - start));
  const smooth = value => value * value * (3 - 2 * value);
  const set = (key, value) => scene.style.setProperty(key, value);
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const short = matchMedia('(max-height:660px)');
  let size, lastProgress = 0, selected = 0, manual = false, paths = [];
  // Focus centers are calculated from the same archival baseline JSON as the
  // underlines. Fallbacks keep the zoom usable even when data is unavailable.
  let focusCenters = [{x: 185, y: 312}, {x: 183, y: 507}];
  const lerp = (a, b, t) => a + (b - a) * t;

  function measure() {
    const width = canvas.clientWidth, height = canvas.clientHeight;
    const mobile = innerWidth <= 650;
    const paperHeight = Math.min(height * .96, width * .94 * 702 / 554);
    const paperWidth = paperHeight * 554 / 702;
    const finalHeight = mobile ? Math.min(paperHeight, height * .41) : paperHeight * .78;
    size = {width, height, mobile, paperHeight, paperWidth, finalHeight};
    set('--ms-paper-h', `${paperHeight}px`);
    set('--ms-paper-w', `${paperWidth}px`);
    set('--ms-output-top', `${finalHeight + 14}px`);
  }

  function paint(progress) {
    if (!size) measure();
    const staticMode = motion.matches || short.matches;
    const p = staticMode ? 1 : progress;
    if (Math.abs(p - lastProgress) > .0001) manual = false;
    const stage = p < .12 ? 0 : p < .36 ? 1 : p < .50 ? 2 : p < .82 ? 3 : 4;
    const previousStage = scene.dataset.msStage;
    if (stage === 3 && !manual) selected = p >= .71 ? 1 : 0;
    if (staticMode && previousStage !== '4') selected = 0;
    const split = smooth(interval(p, .50, .60));
    const scanned = interval(p, .12, .36);
    const scale = 1 - (1 - size.finalHeight / size.paperHeight) * split;
    const dx = size.mobile ? 0 : -size.width * .25 * split;
    const dy = size.mobile ? (-size.height / 2 + size.finalHeight / 2 + 4) * split : 0;
    set('--document-x', `${dx.toFixed(3)}px`);
    set('--document-y', `${dy.toFixed(3)}px`);
    set('--document-scale', scale.toFixed(5));
    set('--scan-reveal', `${(scanned * 100).toFixed(3)}%`);
    set('--beam-px', `${(scanned * Math.max(0, size.paperWidth - 4)).toFixed(3)}px`);
    set('--beam', stage === 1 && !staticMode ? 1 : 0);
    // Focus on the corresponding lines during recognition (D); return to the
    // complete manuscript in E. A viewport crops the enlarged page instead of
    // allowing it to cover the text column. All overlays zoom with the paper.
    const focusIn = smooth(interval(p, .60, .66));
    const focusOut = 1 - smooth(interval(p, .82, .87));
    const focusAmount = staticMode ? 0 : focusIn * focusOut;
    const zoom = lerp(1, 1.46, focusAmount);
    const switchAmount = manual ? selected : smooth(interval(p, .70, .745));
    const focusX = lerp(focusCenters[0].x, focusCenters[1].x, switchAmount);
    const focusY = lerp(focusCenters[0].y, focusCenters[1].y, switchAmount);
    const translateX = (277 - focusX) / 554 * zoom * focusAmount * 100;
    const translateY = (351 - focusY) / 702 * zoom * focusAmount * 100;
    sheet.style.setProperty('--ms-focus-x', `${translateX.toFixed(3)}%`);
    sheet.style.setProperty('--ms-focus-y', `${translateY.toFixed(3)}%`);
    sheet.style.setProperty('--ms-focus-scale', zoom.toFixed(4));
    sheet.dataset.manualFocus = String(manual && focusAmount > 0);
    const textVisible = p >= .60;
    output.classList.toggle('is-visible', textVisible);
    output.setAttribute('aria-hidden', String(!textVisible));
    output.inert = !textVisible;
    scene.dataset.msStage = String(stage);
    scene.dataset.msSelected = String(selected);
    scene.dataset.msStatic = String(staticMode);
    scene.dataset.msReady = 'true';
    quotes.forEach((quote, index) => {
      const visible = textVisible && (stage === 4 && (!size.mobile || staticMode) || index === selected);
      quote.hidden = !visible;
      quote.setAttribute('aria-pressed', String(index === selected));
    });
    tabs.forEach((tab, index) => tab.setAttribute('aria-pressed', String(index === selected)));
    paths.forEach(({node, fragment, order, count}) => {
      let reveal = 0;
      if (stage >= 3 && textVisible && fragment === selected) {
        const start = fragment === 0 ? .60 : .71;
        const end = fragment === 0 ? .70 : .81;
        reveal = stage === 4 || manual ? 1 : interval(interval(p, start, end), order / count, (order + 1) / count);
      }
      node.style.setProperty('--ms-line', reveal.toFixed(4));
      node.style.opacity = reveal > 0 ? '1' : '0';
    });
    lastProgress = p;
    return stage;
  }

  function choose(index) {
    selected = index; manual = true;
    paint(lastProgress);
  }
  quotes.forEach((quote, index) => { quote.disabled = false; quote.addEventListener('click', () => choose(index)); });
  tabs.forEach((tab, index) => { tab.disabled = false; tab.addEventListener('click', () => choose(index)); });
  window.TolstoyManuscript = {measure, paint};

  fetch(root.dataset.tolstoyAssets + '/manuscript-alignment.json')
    .then(response => { if (!response.ok) throw Error(`Manuscript alignment HTTP ${response.status}`); return response.json(); })
    .then(data => {
      if (data.image.width !== 554 || data.image.height !== 702 || data.geometry !== 'baseline' || data.fragments.length !== 2 || data.fragments[0].lines.length !== 4 || data.fragments[1].lines.length !== 6) throw Error('Unexpected manuscript geometry');
      focusCenters = data.fragments.map(fragment => {
        const points = fragment.lines.flatMap(line => line.points);
        return {
          x: (Math.min(...points.map(p => p[0])) + Math.max(...points.map(p => p[0]))) / 2,
          y: (Math.min(...points.map(p => p[1])) + Math.max(...points.map(p => p[1]))) / 2
        };
      });
      data.fragments.forEach((fragment, fi) => fragment.lines.forEach((line, order) => {
        const group = document.createElementNS(NS, 'g');
        group.classList.add('ms-line'); group.dataset.msLine = line.id;
        const points = line.points.map(point => point.join(',')).join(' ');
        for (const className of ['ms-baseline-under', 'ms-baseline']) {
          const polyline = document.createElementNS(NS, 'polyline');
          polyline.setAttribute('points', points); polyline.setAttribute('pathLength', '1');
          polyline.setAttribute('class', className); group.append(polyline);
        }
        scene.querySelector(`[data-ms-lines="${fi}"]`).append(group);
        paths.push({node:group, fragment:fi, order, count:fragment.lines.length});
      }));
      paint(lastProgress);
    })
    .catch(error => { scene.dataset.msError = 'alignment'; console.error(error); });
})();
