# Your First Component

## What this video covered

- Components as the core building block of React (React's official docs framing)
- Components as reusable, nestable tags — similar in spirit to HTML tags
- The capital-letter naming rule for components
- The rule that a component function must return a single element
- The concept of a "root" — where ReactDOM injects the whole React tree into the real page

---

## 1. Components — the basics

- Components are the **building blocks** of a React app, per React's own documentation
- Just like HTML elements, components are **reusable** and can be **nested** inside one another
- A component is, under the hood, just a JavaScript function that returns JSX

---

## 2. Why component names must start with a Capital letter

**Rule:** `<MyComponent />` ✅ — `<myComponent />` ❌ (won't work as a component)

**Why (the mechanical reason):**
JSX transpiles to `React.createElement(type, props, children)`, and Babel needs a rule to decide what to pass as `type`:

- Lowercase tag (`<div>`) → Babel treats it as a **string**: `React.createElement("div", ...)`
- Uppercase tag (`<MyComponent>`) → Babel treats it as a **variable reference**: `React.createElement(MyComponent, ...)` — no quotes, the actual function is passed in

This isn't a style convention — it's a hard requirement. If a component were written lowercase, Babel would output it as a plain string, and React would try (and fail) to render it as a literal, unrecognized HTML tag — the component function would never even get called.

---

## 3. Why a component must return a single element

**Rule:** A component's `return` can only return **one** root JSX element.

```jsx
// ❌ Invalid
function Card() {
  return (
    <h1>Title</h1>
    <p>Description</p>
  );
}
```

**Why:** This isn't actually a React-specific restriction — it's inherited from plain JavaScript. Each JSX tag transpiles into its own separate `React.createElement(...)` call (its own expression). Two bare expressions sitting next to each other with nothing connecting them is not valid JavaScript syntax at all — it fails at parsing, before "a function can only return one value" even becomes relevant.

**Fix:** wrap in a single parent element:

```jsx
function Card() {
  return (
    <div>
      <h1>Title</h1>
      <p>Description</p>
    </div>
  );
}
```

This becomes one single `React.createElement("div", ...)` call, with the other two nested inside as `children` — genuinely one expression, one return value.

**Noted for later:** React has a `<>...</>` **Fragment** syntax that groups elements without adding an extra real DOM node — spotted but not yet covered in depth.

---

## 4. The root — where React gets injected into the page

```html
<div id="root"></div>
```

```js
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
```

React isn't handed the whole page automatically — it's explicitly told which single container element to manage.

**Why:** React needs its own tracked object-tree description of everything inside the area it controls, in order to diff and patch correctly. It can't reason about random pre-existing HTML it didn't create. By scoping React to one container (`#root`), everything **outside** that container — existing HTML, old jQuery/PHP-rendered content, etc. — is left completely untouched, which is exactly what lets React be dropped into just _part_ of an existing website rather than requiring a full rewrite.

---

## Q&A Summary (for quick revision)

**Q: Why must component names be capitalized?**
A: Babel decides whether a JSX tag becomes a string (`"div"`) or a variable reference (`MyComponent`) based on casing alone. Capital = treated as a variable/function reference; lowercase = treated as a literal HTML tag string.

**Q: Why can't a component return two sibling elements with nothing wrapping them?**
A: It's a plain JavaScript syntax limitation, not a React-specific one — two separate expressions with nothing connecting them isn't valid JS. Each JSX tag becomes its own `React.createElement(...)` call, so multiple siblings need one shared parent to become a single valid expression.

**Q: Why does React need a specific root element (`#root`) instead of taking over the whole page?**
A: React can only diff/manage what it created and is tracking. Scoping it to one container means everything outside that container — existing non-React HTML — is left alone, allowing React to be adopted incrementally inside an existing site instead of requiring a full rewrite.

---

## Still fuzzy / to revisit later

- Fragments (`<>...</>`) — seen, not yet explained in depth
- `render()` internals (render phase vs commit phase, what happens to pre-existing raw HTML inside root) — explored in a side discussion today; will get its own proper README once covered in an actual video
- `state` (`useState`) — still pending a dedicated video

---

## One-line takeaway

Components are just JS functions returning JSX; the capital-letter rule and single-return rule both trace back to how Babel/JS actually parse and execute the code, and the "root" concept exists so React only ever has to manage — and is only ever responsible for diffing — the one container it's explicitly told to own.
