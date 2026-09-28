# UI as a Tree

React encourages thinking of a UI as a **tree** — a root at the top, branches in the middle, leaves at the ends. This single idea underlies almost everything else we've covered: how components nest, how diffing works, even why `key` matters for lists. This doc walks through the tree, calls it by its two actual names (Render Tree and render pass), and covers a second, completely different tree that shows up before the app even runs: the Module Dependency Tree.

---

## 1. The component tree, concretely

Take a tiny app:

```jsx
function Button() {
  return <button>Click</button>;
}

function Hero() {
  return (
    <section>
      <h1>Welcome</h1>
      <Button />
    </section>
  );
}

function App() {
  return (
    <div>
      <Hero />
    </div>
  );
}
```

Drawn as a tree:
```
App
 └── div
      └── Hero
           └── section
                ├── h1
                │    └── "Welcome"   (leaf)
                └── Button
                     └── button
                          └── "Click"   (leaf)
```

- **Root:** `App` — the top, nothing renders it.
- **Branches:** anything with children hanging off it — `div`, `Hero`, `section`, `Button` are all branches.
- **Leaves:** any node with **no further children** — not "the deepest custom component," just anything that's a dead end. Here, `h1`'s text and `button`'s text are the leaves. A leaf can be a plain HTML tag just as easily as a component; the tree doesn't care which kind it is.

---

## 2. Building this tree from `createElement`, one call at a time

This is the part that makes the tree feel mechanical instead of abstract. React doesn't build the whole tree in one shot — it expands it **one function call at a time**, depth-first.

**Step 1 — React calls `App()`.**
```js
React.createElement("div", null,
  React.createElement(Hero, null)
)
```
At this exact moment, `Hero` has **not run yet**. `React.createElement(Hero, null)` just builds a plain object `{ type: Hero, props: {} }` — `Hero` sits there as a *reference*, not an invocation.

**Step 2 — React sees `type: Hero` is a function, so it calls `Hero()`.**
```js
React.createElement("section", null,
  React.createElement("h1", null, "Welcome"),
  React.createElement(Button, null)
)
```
`h1` has a string `type`, so there's nothing further to expand there — it's already resolved. `Button` is still just a reference at this point.

**Step 3 — React sees `type: Button`, calls `Button()`.**
```js
React.createElement("button", null, "Click")
```
`button` is a string type with plain text inside — nothing left to expand. **Leaf reached.**

**The rule, stated plainly:** whenever a node's `type` is a function (a component), React calls that function to find out what it renders, and keeps doing this — expanding node after node — until every branch ends in a string-type tag or plain text. That's the entire mechanism behind "React starts at the root and keeps going until the last component," and it's *not* a callback relationship between components. Each nested component is a function call **React itself makes** while walking the tree it's building — the parent never calls the child directly, and nothing is deferred or handed off the way a real callback would be.

---

## 3. Render Tree vs. render pass — two different words for two different things

It's easy to blur these, so here's the distinction, explicitly:

- **Render Tree** = a **structure**. The actual tree shape drawn above — the map of what contains what, built from both custom components and HTML tags together. You'd look at this to answer "what's `Button`'s parent?" or "how deep is this nested?"
- **Render pass** = an **event**. One complete execution of the render phase, start to finish — calling `App()`, then `Hero()`, then `Button()`, building the whole tree once. Every time a render is triggered (initial mount, or any state update anywhere in the tree), that entire walk counts as one render pass.

**How they relate:** a Render Tree is the *output* of a render pass. If `count` changes five times, that's five separate render passes, and each one produces its own Render Tree — possibly identical to the last one, possibly different, depending on what actually changed.

---

## 4. Does React commit one node at a time, or all at once?

**Calling the functions happens one at a time, in order** — exactly as traced above: `App`, then `Hero`, then `Button`, sequentially, each call finishing before the next starts.

**But applying changes to the real DOM (commit) happens as one single batch.** React collects the entire list of real-DOM changes produced by the whole render pass, then applies all of them together in one synchronous step — and only after every change has landed does the browser get a chance to paint.

This is deliberate: it guarantees the user never sees a half-updated screen (e.g. `Hero`'s text updated but `Button`'s still stale, flickering mid-update). So: **the tree is built one node at a time, but the real DOM is flipped over all at once.**

---

## 5. A completely different tree: the Module Dependency Tree

Forget rendering for a moment — this tree exists **before the app ever runs**, while your code is still just files sitting on disk.

Look at a real `App.jsx`:
```jsx
import Header from "./components/Header/Header";
import Hero from "./components/Hero/Hero";
```

This has nothing to do with calling functions or building UI. It's a file saying: *"I need the content of that other file to exist before I can be built."* A **module** here just means a single file — anything with an `import`/`export`.

Before the app can run in a browser, a build tool (like Vite, which your Nexusflow project uses) has to work out the full chain of "who needs whom" — starting from an entry file and following every `import` outward:

```
App.jsx
 ├── Header.jsx
 │     └── Logo.jsx
 ├── Hero.jsx
 └── Footer.jsx
```

If `Header.jsx` itself contains `import Logo from "./Logo"`, then **`Logo.jsx` must be resolved and bundled before `Header.jsx` can be considered "ready"** — because `Header.jsx` literally cannot be complete without whatever `Logo.jsx` exports. The build tool walks this whole graph, bottom-up, resolving leaves first, so that by the time it gets back to `App.jsx`, every single thing it imports (directly or indirectly) already exists.

**Why this tree matters, practically:**
- It's what a bundler (Vite, Webpack) uses to figure out **what order to process files in**, and what to bundle together
- It's the basis for **code-splitting** — a bundler can look at this graph and decide "this branch is only needed on one page, ship it separately"
- A circular dependency (file A imports B, B imports A) shows up as a cycle in this graph — and is a real bug class this tree helps catch
- It's a **build-time / static** tree — it exists whether or not the app is even running. The Render Tree, by contrast, is a **runtime** tree — it only exists because the app executed and components actually got called.

**The core distinction to keep straight:**

| | Render Tree | Module Dependency Tree |
|---|---|---|
| Exists when | While the app is running | Before the app runs (build time) |
| Nodes are | Components and HTML tags | Files/modules |
| Built by | React, calling functions | A bundler, following `import`s |
| Relationship shown | "renders" / "contains" | "needs the code of" |

---

## Q&A summary (for quick revision)

**Q: What counts as a leaf in the component tree?**
A: Any node with no further children — could be a deeply nested component or a plain HTML tag; the tree doesn't distinguish.

**Q: How does React actually build the Render Tree?**
A: One function call at a time. `createElement(Component, ...)` just creates an object referencing the component — it isn't called yet. React itself walks the tree and invokes each function-type node, expanding it until every branch bottoms out at a string-type tag or plain text.

**Q: Is a nested component "called back" by its parent?**
A: No. The parent's `createElement` call only *describes* where a child belongs. React, while walking the tree it's building, is the one that actually invokes the child function — not a callback handed off between components.

**Q: What's the difference between Render Tree and render pass?**
A: Render Tree is the structure (a map of what contains what). Render pass is the event — one full walk through the render phase that produces a Render Tree as its output.

**Q: Does React update the real DOM one node at a time?**
A: No. Function calls happen one at a time during the render phase, but the resulting DOM changes are applied together in a single commit, so the user never sees a partially updated screen.

**Q: What is the Module Dependency Tree, and how is it different from the Render Tree?**
A: It's a build-time graph of which files import which other files — used by bundlers to figure out build order, bundling, and code-splitting. Unlike the Render Tree, it exists before the app ever runs and its nodes are files, not components.

---

## Common mistakes / misconceptions to avoid

**Mistake: assuming "leaf" means "the most deeply nested component."**
A leaf is about having no children, not about nesting depth. A shallow `<img />` with nothing inside is just as much a leaf as a component five levels deep.

**Mistake: thinking a parent component "calls" its child directly, like a normal function call.**
```jsx
function App() {
  return <Hero />;   // this does NOT call Hero() itself
}
```
`<Hero />` only produces a description (`{ type: Hero, props: {} }`). React is the one that later calls `Hero()` while walking the tree — not `App`.

**Mistake: assuming the DOM updates node-by-node as each component function finishes.**
The function calls happen sequentially, but the actual visible update is a single batched commit at the end — not a live, node-by-node flicker.

**Mistake: confusing the Render Tree with the Module Dependency Tree because both are "trees of the app."**
One is about runtime UI structure (components/tags, built by React). The other is about build-time file structure (modules, built by a bundler). Different nodes, different builder, different point in time.

---

## Still fuzzy / to revisit later
- How exactly a bundler decides what counts as a separate "chunk" for code-splitting, beyond just following the import graph
- Circular dependencies in the Module Dependency Tree — what actually happens when they occur, not just that they're a bug class

---

## One-line takeaway
The Render Tree is the runtime map of components and tags that React builds one function call at a time (and then flips into the real DOM as a single batched commit) — a render pass is one full walk that produces it — while the Module Dependency Tree is a completely separate, build-time graph of which files need which other files' code, used by the bundler before the app ever runs.
