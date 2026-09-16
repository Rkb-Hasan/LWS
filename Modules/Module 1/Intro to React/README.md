# Video 1 — Introduction to React

## What this video covered
- Who built React, and the general "why React exists" framing
- A hands-on demo: a product card where clicking updates a running total
- First shown the hassle of doing it in plain JavaScript/vanilla script
- Then shown the same thing solved with React
- Quick intro to: React, ReactDOM, Babel, "library vs framework," and a first mention of **state**

---

## Setting up React without any build tools

```html
<script
  crossorigin
  src="https://unpkg.com/react@18/umd/react.development.js"
></script>
<script
  crossorigin
  src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"
></script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
<script type="text/babel" src="./reactScript.js"></script>
```

**What each line is actually doing:**

| Script | Job |
|---|---|
| `react.development.js` | Runs in the browser and creates a global `React` object with functions like `React.createElement` |
| `react-dom.development.js` | Creates a global `ReactDOM` object — the piece that talks to the actual browser DOM |
| `babel.min.js` | Scans the page for `<script type="text/babel">` tags and transpiles their contents before running them |
| `reactScript.js` (`type="text/babel"`) | My actual React code, written in JSX |

**Why `type="text/babel"` instead of normal JS?**
The browser only knows how to run scripts with a recognized type (JS is the default). `text/babel` is *not* a real browser type — so the browser sees it and **skips it entirely**, doesn't run it, doesn't error. That's intentional: it's a signal meaning *"browser, ignore this — Babel, this one's yours."* Babel is watching the page, grabs the raw text from that tag, transpiles it, and executes the converted version itself.

**Is Babel only for React/JSX?**
No. Babel's actual job is general-purpose: convert newer or non-standard JS syntax into older, widely-supported JS. JSX is just one thing it knows how to transpile — Babel is also used for lots of other modern-JS-to-old-JS conversions unrelated to React.

---

## What JSX actually becomes

JSX is not real JavaScript — browsers don't understand `<h1>Hello</h1>` written inside a `.js` file. Babel's job is to convert it into something the browser *can* run.

```
JSX
  ↓ (Babel transpiles)
React.createElement("h1", null, "Hello")
  ↓ (browser runs this as a normal JS function call)
a plain JS object, e.g. { type: "h1", props: { children: "Hello" } }
```

Key realization: `React.createElement(...)` is just a **normal function call** — no special browser support needed for it, same as calling `Math.max(1, 2)`. The browser never needs to "understand React" as a concept.

That returned object is just data describing *what should be on screen* — this plain-object description is what's meant by the **Virtual DOM**. It is not real HTML yet.

---

## What React vs ReactDOM each actually do

Two separate jobs, done by two separate libraries:

- **React** → figures out *what* the UI should look like. Produces the object tree (Virtual DOM). Has zero knowledge of "browser" or "DOM."
- **ReactDOM** → takes that object tree and does something to the *real* browser DOM about it.

### First render
1. ReactDOM receives the object tree from `React.createElement` calls
2. Walks the tree and creates real DOM elements for each node (internally, like calling `document.createElement`)
3. Inserts those real elements into the page, inside the root container (e.g. `<div id="root">`)

### Re-render (something changes, e.g. quantity click updates total)
1. React re-runs the component function top to bottom → produces a **brand-new** object tree describing the whole UI again
2. ReactDOM compares the new tree against the previous one — this comparison step is called **reconciliation** ("diffing")
3. ReactDOM works out the *minimum* real change needed (e.g. "only this one `<span>`'s text changed")
4. Only that small change is applied to the real DOM — nothing is torn down and rebuilt wholesale

**Why bother diffing instead of just updating the DOM directly myself?**
For one counter, doing it manually is easy. But for a big UI with many pieces of state affecting different parts of the page, manually tracking "which exact DOM node needs updating when X changes" becomes unmanageable. React lets you just describe *what the UI should look like right now*, and it figures out the efficient real-DOM update for you.

**Why are React and ReactDOM separate libraries at all?**
Because React only produces the abstract object description — it doesn't care what that description gets turned into. ReactDOM turns it into real browser DOM. This separation is exactly why React Native can exist: same `React`, but a different renderer turns the same object descriptions into native mobile UI elements instead of HTML.

---

## Still fuzzy / to revisit later
- `state` — mentioned as "something that tracks a variable," not explained yet
- The array-destructuring syntax used with state (the "tuple"-looking thing) — likely `useState`, to be covered when that video comes up
- Library vs framework distinction — noted but not deeply explored yet

---

## One-line takeaway
Babel turns JSX into plain `React.createElement()` calls → those calls are just normal JS that produce a lightweight object description of the UI (Virtual DOM) → ReactDOM turns that description into real DOM nodes, and on updates, only patches the real DOM where the new description actually differs from the last one.
