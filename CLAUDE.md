# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development

No build step required — open `index.html` directly in a browser (or use a local static server). The JS is loaded as an ES module (`type="module"`).

```sh
npx serve .   # or any static file server
```

## Architecture

There are two HTML entry points with different approaches:

- **`index-canvas.html`** — the canvas text-layout experiment. Uses `@chenglou/pretext` to render repeating fashion editorial text on a `<canvas>` that wraps around a centered `.frame` image. Text is stored in the canvas's `data-text` attribute. Uses `.frame-animate` class.
- **`index.html`** — a DOM-based version. Uses a `<p class="graphic-text">` element for the text. Loads GSAP (v3.14.2) and TextPlugin via CDN for animation.

### Key files

- **`js/text-flow.js`** — all canvas rendering logic (used by `index-canvas.html`). On each `render()` call it:
  1. Measures `.graphic` and `.frame` bounding rects
  2. Computes per-frame padding (exclusion zone around the image)
  3. Iterates lines top-to-bottom; lines that overlap the frame are split into left/right columns, others span full width
  4. Draws each line with manual justification (`fillJustifiedText`)
  5. Re-renders during CSS animations via `requestAnimationFrame` loop

- **`css/style.css`** — layout and the `grow` keyframe animation (`transform: scale`) on `.frame`. Because scale transforms don't affect layout size, `ResizeObserver` won't catch them — the rAF loop in `text-flow.js` handles this instead.

### `@chenglou/pretext` usage

The project uses the line-at-a-time API:
- `prepareWithSegments(text, fontStr)` — called once per render (font/size can change on resize)
- `layoutNextLineRange(prepared, cursor, width)` — returns the next line's range for a given column width
- `materializeLineRange(prepared, range)` — converts a range to the actual string

`prepared` is **not** cached across renders because `fontSize` is responsive (`clamp`-based) and changes on resize.
