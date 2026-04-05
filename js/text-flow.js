import { prepareWithSegments, layoutNextLineRange, materializeLineRange } from '../node_modules/@chenglou/pretext/dist/layout.js';

const graphic = document.querySelector('.graphic');
const frameEl = document.querySelector('.frame');
const canvas = document.querySelector('.text-canvas');
const ctx = canvas.getContext('2d');

const TEXT = canvas.dataset.text;

function render() {
  const graphicRect = graphic.getBoundingClientRect();
  const frameRect = frameEl.getBoundingClientRect();

  const dpr = window.devicePixelRatio || 1;
  const W = graphicRect.width;
  const H = graphicRect.height;

  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.scale(dpr, dpr);

  // Match CSS: font-size clamp(36px, 5vw, 72px), line-height 1.05
  // updated to smaller text as justify text needs more characters to work
  const fontSize = Math.min(Math.max(W * 0.03, 16), 24);
  const lineHeight = fontSize * 1.05;
  const fontStr = `${fontSize}px Coconat`;

  ctx.font = fontStr;
  ctx.fillStyle = '#570001';
  ctx.textBaseline = 'alphabetic';

  // Frame bounds relative to graphic
  const padding = 60;
  const frameLeft = frameRect.left - graphicRect.left - padding;
  const frameRight = frameRect.right - graphicRect.left + padding;
  const frameTop = frameRect.top - graphicRect.top - (padding/2);
  const frameBottom = frameRect.bottom - graphicRect.top + (padding/2);

  function fillJustifiedText(text, x, y, maxWidth) {
    const words = text.trim().split(' ');
    if (words.length <= 1) { ctx.fillText(text, x, y); return; }
    const totalWordWidth = words.reduce((sum, w) => sum + ctx.measureText(w).width, 0);
    const gap = (maxWidth - totalWordWidth) / (words.length - 1);
    const spaceWidth = ctx.measureText(' ').width;
    if (gap > spaceWidth * 4) { ctx.fillText(text, x, y); return; }
    let curX = x;
    for (const word of words) {
      ctx.fillText(word, curX, y);
      curX += ctx.measureText(word).width + gap;
    }
  }

  const prepared = prepareWithSegments(TEXT, fontStr);
  let cursor = { segmentIndex: 0, graphemeIndex: 0 };

  // repeat text if exhausted
  function nextRange(cur, width) {
    let range = layoutNextLineRange(prepared, cur, width);
    if (range === null) {
      cursor = { segmentIndex: 0, graphemeIndex: 0 };
      range = layoutNextLineRange(prepared, cursor, width);
    }
    return range;
  }

  let y = lineHeight;

  while (y - lineHeight < H) {
    const lineTop = y - lineHeight;
    const lineBottom = y;
    const overlapsFrame = lineBottom > frameTop && lineTop < frameBottom;

    if (!overlapsFrame) {
      const range = nextRange(cursor, W);
      if (!range) break;
      const line = materializeLineRange(prepared, range);
      fillJustifiedText(line.text, 0, y, W);
      cursor = range.end;
    } else {
      // Left column
      const leftWidth = frameLeft;
      if (leftWidth > fontSize) {
        const range = nextRange(cursor, leftWidth);
        if (range) {
          const line = materializeLineRange(prepared, range);
          fillJustifiedText(line.text, 0, y, leftWidth);
          cursor = range.end;
        }
      }

      // Right column
      const rightWidth = W - frameRight;
      if (rightWidth > fontSize) {
        const range = nextRange(cursor, rightWidth);
        if (range) {
          const line = materializeLineRange(prepared, range);
          fillJustifiedText(line.text, frameRight, y, rightWidth);
          cursor = range.end;
        }
      }
    }

    y += lineHeight;
  }
}

function renderDuringAnimation(deadline) {
  render();
  if (performance.now() < deadline) requestAnimationFrame(() => renderDuringAnimation(deadline));
}

document.fonts.ready.then(() => {
  render();
  // poll for the duration of the animation (1s delay + 0.8s duration + buffer)
  renderDuringAnimation(performance.now() + 2000);
});
window.addEventListener('resize', render);
