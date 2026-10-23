(() => {
  'use strict';
  const root = document.getElementById('tolstoy-project');
  if (!root) return;
  const $ = selector => root.querySelector(selector);
  const $$ = selector => [...root.querySelectorAll(selector)];
  const dialog = $('.object-dialog');
  let returnFocus = null;
  function openObject(key, trigger) {
    const source = $(`#object-${key}`);
    if (!(source instanceof HTMLTemplateElement)) return;
    const wasOpen = dialog.open;
    if (!wasOpen) returnFocus = trigger;
    const content = source.content.cloneNode(true);
    // Force absolute plugin asset URLs at the point templates are instantiated.
    // WP optimizers can rewrite or lazily defer images within <template>.
    const assets = root.dataset.tolstoyAssets;
    const files = {dog: 'estate-dog.webp', bike: 'estate-bike.webp', apple: 'estate-apples.webp'};
    const image = content.querySelector('.object-image');
    if (image && assets && files[key]) {
      image.removeAttribute('srcset');
      image.removeAttribute('data-src');
      image.removeAttribute('data-srcset');
      image.loading = 'eager';
      image.src = `${assets.replace(/\/$/, '')}/${files[key]}`;
      image.addEventListener('error', () => console.error('Tolstoy exhibit: image failed to load:', image.src), {once: true});
    }
    $('.object-content').replaceChildren(content);
    $('.object-content h2').id = 'object-title';
    dialog.scrollTop = 0;
    $$('.object-navigation button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.object === key)));
    if (!wasOpen) { dialog.showModal(); $('.dialog-close').focus({preventScroll:true}); }
  }
  $$('[data-object]').forEach(button => button.addEventListener('click', () => openObject(button.dataset.object, button)));
  $('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
  dialog.addEventListener('close', () => returnFocus?.focus({preventScroll:true}));
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const controls = [...dialog.querySelectorAll('button,a[href]')];
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  // Native modal supplies an inert background and Escape; explicit Tab wrap keeps focus in the page dialog.
})();
