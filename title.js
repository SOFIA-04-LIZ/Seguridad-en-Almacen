'use strict';
(() => {
  const title = document.querySelector('.game-name');
  if (!title) return;
  const measure = document.createElement('canvas').getContext('2d');
  function fitTitle() {
    const width = title.clientWidth;
    if (!width) return;
    const style = getComputedStyle(title);
    measure.font = style.fontWeight + ' 86px ' + style.fontFamily;
    const textWidth = measure.measureText(title.textContent.trim()).width;
    title.dataset.fit = width + '/' + textWidth + '/' + measure.font;
    if (textWidth) title.style.fontSize = Math.floor(Math.min(86, 86 * (width - 4) / textWidth) * 10) / 10 + 'px';
  }
  fitTitle();
  window.addEventListener('resize', fitTitle);
  if (typeof ResizeObserver !== 'undefined') {
    let lastWidth = 0;
    new ResizeObserver(entries => {
      const width = entries[0].contentRect.width;
      if (width !== lastWidth) { lastWidth = width; fitTitle(); }
    }).observe(title.parentElement);
  }
  if (document.fonts) {
    document.fonts.ready.then(fitTitle);
    document.fonts.addEventListener('loadingdone', fitTitle);
  }
})();
