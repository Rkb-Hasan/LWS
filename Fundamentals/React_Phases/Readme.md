# React — Rendering Phases (Trigger → Render → Commit)

## What this covers
- The full sequence React follows for every update, step by step
- How that sequence plays out differently for: initial mount, a simple state update, and a list reorder
- The anatomy of `React.createElement()`
- The anatomy of `render()` (`createRoot(...).render(...)`)

---

## 1. The three-part sequence

```
Trigger → Render phase (build + diff, pure JS) → Commit phase (apply changes to real DOM) → Browser layout/paint (visible update)
```

### Trigger
Something causes a render to become necessary:
- **Initial mount** — the very first `root.render(<App />)` call
- **State update** — a `setState` call (or equivalent) somewhere in the tree

### Render phase (pure JavaScript — nothing on screen changes yet)
1. React calls the relevant component function(s), top to bottom
2. This produces a new tree of React elements (plain objects — `React.createElement` output)
3. If this isn't the very first render, React compares (diffs/reconciles) this new tree against the previously committed tree
4. The output of this phase is a **list of exactly what needs to change** in the real DOM — nothing has actually been touched yet

### Commit phase (touches the real DOM)
5. React applies that list of changes to the actual DOM: creating new nodes, updating attributes/text, removing nodes, or **moving** nodes (this is exactly where `key`-based matching gets used — deciding "move existing node" vs. "destroy and recreate")

### Browser takes over
6. Once committed, the browser's own native pipeline runs — layout (reflow) and paint — and only now does the user actually see the update on screen

---

## 2. Visualizing three different scenarios

### Scenario A — Initial mount (nothing to diff against)

```
Trigger: root.render(<App />)
   │
   ▼
Render phase:
   App() runs → builds full element tree
   No previous tree exists → NO diffing happens
   │
   ▼
Commit phase:
   Walk the ENTIRE tree
   Create every real DOM node, one by one
   Insert them all into #root
   │
   ▼
Browser: layout + paint entire page for the first time
```

**Key point:** first mount is pure construction — there's nothing to compare against, so every single node must be built from scratch. This is why first load/first paint is inherently heavier than any later update.

### Scenario B — A simple state update (e.g. a counter increments)

```
Trigger: setCount(count + 1)
   │
   ▼
Render phase:
   Counter component function re-runs
   Produces a NEW element tree (e.g. { type:"span", props:{children:"6"} } instead of "5")
   Diff new tree vs. previous committed tree
   → Result: "only this one <span>'s text content changed"
   │
   ▼
Commit phase:
   Apply ONLY that one text update to the real DOM node
   (everything else in the tree is left completely untouched)
   │
   ▼
Browser: repaint only the affected region
```

**Key point:** because a previous tree exists, diffing can happen — and the commit phase does the minimum possible real work.

### Scenario C — A list reorder (where `key` actually matters)

```
Trigger: setItems([itemB, itemA])   // order swapped, same two items

Render phase:
   Component re-runs, produces new children array:
   [{type:"li", key:"b"}, {type:"li", key:"a"}]

   Diff against previous children array:
   [{type:"li", key:"a"}, {type:"li", key:"b"}]

   React matches by KEY, not position:
   → key "a" still exists (now at index 1)
   → key "b" still exists (now at index 0)
   → Result: "MOVE these two existing nodes, don't recreate them"

Commit phase:
   Reorder the two existing real <li> DOM nodes in place
   (their internal state, if any, is preserved)

Browser: repaint only the reordered region
```

**Key point:** without stable keys, this same reorder would be misread as "delete both old items, create two brand-new ones" — full teardown/rebuild instead of a cheap move, and any internal state on those list items would be lost.

---

## 3. Anatomy of `React.createElement()`

```js
React.createElement(type, props, ...children)
```

| Part | What it is |
|---|---|
| `type` | A string (`"div"`, `"li"`) for a built-in HTML tag, or a function/class reference (`MyComponent`) for a custom component — this is exactly the capital-vs-lowercase distinction from the Components notes |
| `props` | A plain object of attributes/props, or `null` if none given. Nested JSX content automatically gets folded into this object as `props.children` |
| `...children` | Any arguments beyond the second are collected as additional children — this is the mechanism behind nested JSX content becoming `props.children` |

**What it returns** — not a DOM node, not a string, but a plain JS object (a "React element"):
```js
{
  type: "li",
  key: null,          // or whatever key was assigned
  props: {
    children: "some content"
    // ...other attributes
  }
}
```
This object is the lightweight description that flows through the render phase, gets diffed, and only becomes a real DOM node during the commit phase.

---

## 4. Anatomy of `render()`

```js
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
```

Two distinct steps, deliberately separated:

**`createRoot(domNode)`** — setup only. Takes a real DOM node and creates a special internal object React uses to track everything about this app instance: the current element tree, scheduling info, etc. Called **once**, ever, for a given root.

**`root.render(<App />)`** — "here's what I want displayed right now." This is what actually kicks off the render phase → commit phase sequence described above.
- On the **first** call, there's no previous tree → full construction (Scenario A)
- Conceptually, later updates (via `setState`) trigger the same render → diff → commit sequence again, just without you calling `.render()` manually — React schedules it internally

**What `render()` does to pre-existing content already inside the target node:** React doesn't try to merge with or preserve anything it didn't create and isn't tracking. On its first run, it simply clears out whatever is inside the target container and builds its own tree from scratch based on what was passed in — anything not created by React (e.g. hand-written raw HTML sitting in `#root` beforehand) is treated as disposable.

---

## Still fuzzy / to revisit later
- `hydrateRoot` — a related-but-different function (used in frameworks like Next.js) where React is told "the HTML is already correct, don't wipe it, just attach event listeners" — flagged for when SSR/Next.js topics come up
- The exact scheduling/priority mechanics behind how React decides *when* to run a queued render (relevant to more advanced concurrent-rendering behavior) — not needed yet

---

## One-line takeaway
Every update follows Trigger → Render phase (pure JS: build + diff) → Commit phase (apply minimal real DOM changes) → browser layout/paint; the first mount skips diffing entirely (nothing to compare against, so everything is built from scratch), while later updates — especially reordered lists — rely on `key`-based diffing to do the least possible real DOM work.
