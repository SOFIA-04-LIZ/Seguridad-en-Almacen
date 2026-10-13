'use strict';
(() => {
  const title = document.querySelector('.game-name');
  if (!title) return;
  const context = document.createElement('canvas').getContext('2d');
  function sizeTitle() {
    const style = getComputedStyle(title);
    context.font = style.fontWeight + ' 86px ' + style.fontFamily;
    const width = context.measureText(title.textContent.trim()).width;
    if (width) title.style.setProperty('--title-fit-ratio', String(100 * 86 / width * 0.95));
  }
  sizeTitle();
  if (document.fonts) {
    document.fonts.ready.then(sizeTitle);
    document.fonts.addEventListener('loadingdone', sizeTitle);
  }
})();
