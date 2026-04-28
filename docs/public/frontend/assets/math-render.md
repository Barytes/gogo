# `app/frontend/assets/math-render.js`

Source: [`app/frontend/assets/math-render.js`](../../../../app/frontend/assets/math-render.js)

`math-render.js` wraps KaTeX auto-render for wiki page content and chat message content.

## Role

This file is the frontend math-rendering boundary. Other modules do not call KaTeX directly; they call `window.GogoMath.renderElement(element)` after inserting Markdown-derived HTML into the DOM.

Keep this file as a thin integration layer over the vendored KaTeX scripts. Markdown parsing, chat rendering, and wiki rendering belong in their owning modules.

## Main Responsibilities

- Define the supported inline and display math delimiters.
- Call KaTeX auto-render only when the vendored `window.renderMathInElement` function exists.
- Render math inside one supplied DOM subtree rather than re-rendering the whole document.
- Avoid rendering inside script, style, textarea, pre, code, existing KaTeX, and `.no-math` regions.
- Expose one stable global API: `window.GogoMath.renderElement(element)`.

## Main Function Call Chains

### Wiki Page Rendering

```text
wiki.js renderPageData(data)
  -> markdownToHtml(data.content)
  -> contentEl.innerHTML = ...
  -> window.GogoMath.renderElement(contentEl)
  -> renderElement(contentEl)
  -> window.renderMathInElement(contentEl, options)
```

Wiki rendering calls math rendering after Markdown has been converted to HTML and link handlers have been prepared.

### Chat Message Rendering

```text
chat.js renderMessageBody(container, role, content)
  -> markdownToHtml(content)
  -> container.innerHTML = ...
  -> window.GogoMath.renderElement(container)
  -> renderElement(container)
  -> window.renderMathInElement(container, options)
```

Both streamed assistant text and hydrated history messages eventually pass through the same message body rendering path.

### Graceful Web Failure

```text
renderElement(element)
  -> return early if element is missing
  -> return early if window.renderMathInElement is unavailable
```

This makes the app usable even if the vendored KaTeX auto-render script fails to load.

## Dependencies

This file depends on:

- `app/frontend/assets/vendor/katex/katex.min.js`
- `app/frontend/assets/vendor/katex/auto-render.min.js`
- `app/frontend/assets/vendor/katex/katex.min.css`

It must be loaded after the vendored KaTeX scripts and before the modules that call `window.GogoMath`.

## Change Notes

If delimiter support changes, update this file and test both wiki pages and chat messages. Do not add Markdown parsing rules here; math rendering should remain a post-processing step over already-rendered DOM nodes.
