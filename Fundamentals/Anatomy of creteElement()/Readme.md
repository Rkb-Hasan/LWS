# Anatomy of `React.createElement()`

Every piece of JSX you've ever written eventually becomes a call to this one function. It's the single most foundational building block in React — everything else (components, props, children, diffing, commits) is built on top of what this function returns. This doc walks through it slowly, from "what is it" to "what does it actually produce at each phase of React's lifecycle."

---

## Part 1 — The Basics

### 1.1 The signature

```js
React.createElement(type, props, ...children)
```

Three parts:
- **`type`** — what kind of thing this is (an HTML tag, or a component)
- **`props`** — an object of attributes/data, or `null`
- **`...children`** — anything nested inside, as extra arguments

### 1.2 Where it comes from

You almost never write `React.createElement` by hand — JSX is sugar for it. Babel (or whatever JSX compiler your tooling uses) transpiles JSX into these calls before your code ever runs.

```jsx
const element = <h1>Hello</h1>;
```
becomes:
```js
const element = React.createElement("h1", null, "Hello");
```

### 1.3 What it actually returns

Not a DOM node. Not a string. A **plain JavaScript object** — often called a "React element":

```js
{
  type: "h1",
  key: null,
  props: {
    children: "Hello"
  }
}
```

This is the single most important thing to internalize: **a React element is just data describing what you want, not the thing itself.** It's inert. It doesn't do anything on its own. Something else (React, during the commit phase) has to come along later and interpret this object to actually produce a real DOM node.

---

## Part 2 — The `type` Argument, in Depth

`type` is the first thing React looks at, and it determines everything about what happens next.

### 2.1 A string → a built-in HTML tag

```js
React.createElement("div", null, "content")
```
A string `type` means "this is a literal, intrinsic HTML element." React will eventually call something like `document.createElement("div")` to realize this.

### 2.2 A function → a custom component

```js
function Greeting() {
  return React.createElement("h1", null, "Hi");
}

React.createElement(Greeting, null)
```
Here, `type` is the **function reference itself** — not a string, not called with `()`. This is exactly the capital-letter rule from the Components notes: JSX uses casing to decide whether to output a string (`"greeting"` → lowercase → treated as an HTML tag) or a variable reference (`Greeting` → uppercase → treated as a component to look up and call).

When React encounters a function-type element while walking the tree, it **calls that function** to find out what it renders — this is the mechanism behind the whole Render Tree concept.

### 2.3 `React.Fragment` → a grouping-only type

```js
React.createElement(React.Fragment, null, child1, child2)
```
`React.Fragment` is a special, built-in `type` value React recognizes specifically. When React sees it, it knows: "group these children together for diffing purposes, but don't create any real DOM node for this entry at all." (Full detail in the dedicated Fragment README.)

### 2.4 A variable holding a string → dynamic tag type

```js
const Tag = "h1";
React.createElement(Tag, null, "Hello")
```
Since `Tag === "h1"`, this behaves exactly like `React.createElement("h1", ...)`. This is the mechanism behind `<Tag>Hello</Tag>` dynamic-tag JSX from the JSX notes — `type` doesn't care *how* it got a string, only that it has one.

---

## Part 3 — The `props` Argument, in Depth

### 3.1 `null` when there's nothing to pass

```js
React.createElement("h1", null, "Hello")
```
No attributes, no custom props — just `null`.

### 3.2 A plain object of attributes

```jsx
<img src="cat.png" alt="A cat" />
```
```js
React.createElement("img", { src: "cat.png", alt: "A cat" })
```
Every JSX attribute becomes a key on this object. Nothing React-specific is happening here — it's exactly the same as building any other object literal in JS.

### 3.3 `children` folds into `props` automatically

```jsx
<div>Hello</div>
```
```js
React.createElement("div", null, "Hello")
```
The third argument (`"Hello"`) isn't stored separately — React's own implementation of `createElement` takes everything from the third argument onward and places it into `props.children` before constructing the final element object:
```js
{
  type: "div",
  props: { children: "Hello" }
}
```
This is why `props.children` is an ordinary prop, not a special channel — it's just populated by argument position, as covered in the Props notes.

### 3.4 `key` — a prop with special treatment

```jsx
<li key="a1">Milk</li>
```
```js
React.createElement("li", { key: "a1" }, "Milk")
```
`key` technically rides along as part of the second argument, but React **pulls it out** and stores it on a separate `key` field of the final element object (not inside `props`) — which is exactly why a component never sees `props.key` even if it tries to read it. React reserves `key` purely for its own diffing use (see the Rendering Lists README for why).

---

## Part 4 — The `...children` Arguments, in Depth

### 4.1 A single child

```jsx
<p>Hello</p>
```
```js
React.createElement("p", null, "Hello")
```

### 4.2 Multiple children → text and expressions mixed

```jsx
<h1>Hello {name}</h1>
```
```js
React.createElement("h1", null, "Hello ", name)
```
Each separate piece — literal text and each `{}` expression — becomes its own argument. This is the exact transpilation behind the curly-brace rules from the JSX notes.

### 4.3 An array as a single children value (the `.map()` case)

```jsx
<ul>{items.map(item => <li key={item.id}>{item.text}</li>)}</ul>
```
```js
React.createElement(
  "ul",
  null,
  items.map(item => React.createElement("li", { key: item.id }, item.text))
)
```
Here, the third argument is **one array value**, not multiple separate arguments — `.map()` already returns a single array, and that whole array is passed as-is. React knows how to walk into an array found in `children` and process each entry individually (covered fully in the Rendering Lists README — this is also why no commas ever appear in the rendered output).

### 4.4 Nested elements — children that are themselves elements

```jsx
<div>
  <h1>Title</h1>
  <p>Text</p>
</div>
```
```js
React.createElement(
  "div",
  null,
  React.createElement("h1", null, "Title"),
  React.createElement("p", null, "Text")
)
```
Each child here is itself a full React element object — this is exactly how nested component trees are built up, one `createElement` call producing an object that becomes an argument to the next one outward.

---

## Part 5 — `createElement` Across React's Phases

This is where the "anatomy" stops being static and becomes something that actually moves through a process.

### Phase 1 — Render phase: `createElement` calls happen, pure JS, nothing on screen yet

When a component function runs, every piece of JSX inside it becomes a `createElement` call, executed as completely ordinary JavaScript. Whether this is the first time this component has ever rendered, or the five-hundredth re-render, the mechanism is identical: run the function, every JSX line produces a plain object, those objects nest into each other to form one tree for this component.

```
App() runs
  → React.createElement("div", null, React.createElement(Hero, null))
  → this is just an object, nothing touched yet
```

If `Hero`'s `type` is a function, React (not `App`) is the one that later calls `Hero()` — expanding the tree further, one function call at a time, exactly as covered in the UI as a Tree notes. By the end of this phase, there's one complete object tree describing the whole UI — and, if this isn't the first render, this new tree gets diffed against the previous one.

### Phase 2 — Commit phase: the objects get *interpreted*, real DOM appears

`createElement`'s output is never itself a DOM node. During commit, React walks the finished (and diffed, if applicable) tree and, for each object:
- if `type` is a string → create (or update) a real DOM node of that tag
- if `type` is `React.Fragment` → create nothing, just insert its children directly
- props become real DOM attributes, or (for `onXxx`-named props) get registered as event listeners

This is the moment the abstract object tree stops being just data and becomes pixels on the page.

### Phase 3 — Later re-renders: brand-new objects, every time

On a state change, the component function runs again, and **every single `createElement` call runs again too** — producing an entirely new tree of brand-new objects, even for parts of the UI that didn't visually change. This is exactly the immutability point from the Props README: `{...}` and `createElement(...)` always produce new objects when the surrounding code re-executes; nothing is mutated in place. React's diffing step is what figures out that most of this new tree is identical in content to the old one, so most of it results in zero real DOM changes — but the objects themselves are still freshly created every time.

---

## Part 6 — `createElement` in Different Use Cases

### 6.1 A static, no-props element
```jsx
<br />
```
```js
React.createElement("br", null)
```

### 6.2 An element with only props, no children
```jsx
<input type="text" value={name} onChange={handleChange} />
```
```js
React.createElement("input", { type: "text", value: name, onChange: handleChange })
```
Notice `onChange` here is just a regular prop value — a function reference — exactly as covered in the Responding to Events README. `createElement` doesn't treat it specially; the special treatment happens later, in commit.

### 6.3 A component with children passed via nesting
```jsx
<Card>
  <h2>Title</h2>
</Card>
```
```js
React.createElement(Card, null, React.createElement("h2", null, "Title"))
```
Inside `Card`, this nested `h2` element becomes available as `props.children` — the mechanism behind the `children` prop use cases covered in the Props README.

### 6.4 Conditional rendering
```jsx
{isLoggedIn ? <Dashboard /> : <Login />}
```
This isn't special `createElement` syntax at all — it's a plain ternary **expression** (from the Conditional Rendering notes) that evaluates to *one* of two already-built element objects:
```js
isLoggedIn ? React.createElement(Dashboard, null) : React.createElement(Login, null)
```
Only one side's `createElement` call actually executes, because the other branch of a ternary never runs.

### 6.5 A keyed Fragment inside a list
```jsx
items.map(item => (
  <React.Fragment key={item.id}>
    <dt>{item.term}</dt>
    <dd>{item.definition}</dd>
  </React.Fragment>
))
```
```js
items.map(item =>
  React.createElement(
    React.Fragment,
    { key: item.id },
    React.createElement("dt", null, item.term),
    React.createElement("dd", null, item.definition)
  )
)
```

### 6.6 Spread props forwarding
```jsx
<button className="fancy" {...props} />
```
```js
React.createElement("button", { className: "fancy", ...props })
```
The spread happens at the plain-JavaScript-object level, before `createElement` is even called — `createElement` just receives whatever the finished merged object turns out to be, with later keys (from `...props`) overriding earlier ones, exactly as covered in the Props README.

---

## Part 7 — A Note on the Modern JSX Transform

Not every build tool compiles JSX to `React.createElement` anymore. Since React 17, many tools (including Vite, which your projects use) default to the **automatic JSX runtime**, producing something like:
```js
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
_jsx("h1", { children: "Hello" });
```
This is a different function (`_jsx`/`_jsxs`, auto-imported) rather than `React.createElement`, but **conceptually identical** — same idea of "a `type`, a props-like object, children folded in," same resulting element-object shape, same render/commit behavior afterward. Everything in this document applies to both forms; only the exact function name and import mechanics differ. (`jsxs`, plural, is used specifically when there's more than one child — a small internal optimization, not a conceptual difference.)

---

## Common mistakes

**Mistake: assuming `createElement` creates a DOM node immediately.**
```js
const el = React.createElement("div", null, "Hi");
document.body.appendChild(el);   // ❌ el is a plain object, not a DOM node
```
`createElement`'s output always needs to go through React's render/commit pipeline (or be returned from a component) to ever become real DOM.

**Mistake: thinking `key` lives inside `props`.**
```jsx
function Item(props) {
  console.log(props.key);   // ❌ always undefined
}
```
`key` is pulled out onto its own field of the element object specifically so components can't accidentally read or rely on it. Pass identity data under a different prop name if the component itself needs it.

**Mistake: forgetting that children-as-array vs. children-as-separate-arguments look different in the transpiled output.**
```jsx
<ul>{items.map(i => <li key={i}>{i}</li>)}</ul>     // ONE array argument
<ul><li>A</li><li>B</li></ul>                        // TWO separate arguments
```
Both eventually get walked and rendered correctly, but it's worth recognizing they arrive at `createElement` differently — one as a single array value, the other as multiple positional arguments.

---

## Q&A summary (for quick revision)

**Q: What does `React.createElement()` actually return?**
A: A plain JavaScript object — a "React element" — describing `type`, `props`, and `key`. It is not a DOM node and does nothing on its own.

**Q: What are the three things `type` can be?**
A: A string (built-in HTML tag), a function/class reference (a component), or `React.Fragment` (a grouping-only type with no real DOM output).

**Q: How does `props.children` get populated?**
A: Everything from the third `createElement` argument onward is automatically folded into `props.children` by React's own implementation — it's not a separately passed thing.

**Q: Where does `key` actually live on the element object?**
A: On its own `key` field, separate from `props` — which is why a component can never read its own key via `props.key`.

**Q: What's different about an array passed as `children` (like from `.map()`) versus multiple separate child arguments?**
A: An array stays as one single argument/value; React recognizes it's an array and iterates it internally. Multiple hand-written JSX children instead arrive as several separate positional arguments. Both get rendered correctly, just via a different path into `createElement`.

**Q: During which phase does a `createElement` call's object actually turn into a real DOM node?**
A: The commit phase. The render phase only builds/diffs the object tree — nothing touches the real DOM until commit.

**Q: Does a re-render reuse the previous `createElement` output?**
A: No — every re-render re-runs every `createElement` call in that component, producing entirely new objects, even where nothing visually changed. Diffing is what later determines most of this results in zero real DOM changes.

**Q: Is the modern `_jsx()`/`_jsxs()` output fundamentally different from `React.createElement()`?**
A: No — same underlying concept (type + props-like object + children), just a different function name/import, used by tools like Vite's default React plugin since React 17.

---

## Still fuzzy / to revisit later
- The exact internal diffing algorithm's shortcuts (type-based bail-outs, how it decides "move" vs. "destroy and recreate" beyond the key-matching basics already covered)
- Event delegation internals — how React's one shared listener maps a real event back to the correct component's handler (parked from the Responding to Events notes)

---

## One-line takeaway
`React.createElement(type, props, ...children)` always returns the same kind of thing — a plain, inert object describing what should exist — whether `type` is a tag, a component, or Fragment, and whether it's called once by hand or thousands of times automatically by JSX; the real work only begins later, when the render phase diffs these objects and the commit phase finally turns them into something the browser can show.
