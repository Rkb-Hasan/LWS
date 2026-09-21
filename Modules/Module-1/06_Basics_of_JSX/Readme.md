# React JSX — Revision Notes

## What this covers
- What JSX actually is (and isn't)
- Why a component/return needs a single root element
- Why Fragments can group elements without adding a DOM node
- Why JSX is stricter than HTML
- What curly braces `{}` mean, and what's allowed inside them
- Why tag names can't be dynamic with `<{tag}>`, and the actual way to do it

---

## 1. JSX is not HTML

JSX is a JavaScript syntax extension — it lets you describe a React UI using HTML-like syntax, but the browser never runs JSX directly. It's transformed into plain JavaScript before it executes.

```jsx
const element = <h1>Hello</h1>;
```

Conceptually becomes (classic transform):
```js
const element = React.createElement("h1", null, "Hello");
```

Or, with the modern JSX transform some tooling uses:
```js
const element = _jsx("h1", { children: "Hello" });
```

The exact output form depends on the tooling, but the flow is always:
```
JSX → JSX transformation → JavaScript → React → UI
```

---

## 2. Why a single root element is required

```jsx
// ❌ Invalid
return (
  <h1>Hello</h1>
  <p>Welcome</p>
);
```

A function's `return` produces **one** value, and JSX needs to resolve to **one** React element/tree. Wrapping in a parent fixes it:

```jsx
return (
  <div>
    <h1>Hello</h1>
    <p>Welcome</p>
  </div>
);
```

This becomes one `React.createElement("div", ...)` call, with the `h1` and `p` nested inside as children — genuinely one outer element. So the single-root rule isn't an arbitrary React restriction; it's a direct consequence of JSX needing to form one resulting tree.

---

## 3. Why Fragments can wrap multiple elements without a wrapper

Sometimes you want a single root but don't want an unnecessary `<div>` showing up in the DOM. A Fragment solves this:

```jsx
return (
  <>
    <h1>Hello</h1>
    <p>Welcome</p>
  </>
);
```

`<>...</>` is shorthand for `<React.Fragment>...</React.Fragment>`. The key distinction: **a Fragment is a React grouping mechanism, not a real DOM element.**

- With a `div` wrapper → the browser gets an actual `<div>` in the DOM
- With a Fragment → no extra wrapper appears at all — just the raw children:
  ```html
  <h1>Hello</h1>
  <p>Welcome</p>
  ```

**Takeaway:** Fragment gives React a single root/group without creating an extra DOM node.

---

## 4. Why JSX is stricter than HTML

JSX only *looks* like HTML — it's actually parsed by JSX/JavaScript parsing rules, not HTML's more forgiving parsing rules. That's why it enforces things HTML doesn't require:

- Elements must be properly closed: `<img />` not `<img>`
- Proper nesting is enforced
- Some attributes use JS-oriented names instead of HTML's: `className` instead of `class`, `htmlFor` instead of `for`

**Key idea:** React didn't just "make HTML stricter" — JSX is a different syntax that happens to resemble HTML, and it must follow JavaScript's parsing rules, which are inherently less forgiving.

---

## 5. What curly braces `{}` actually mean

```jsx
const name = "Rakib";
return <h1>Hello {name}</h1>;
```

`{}` tells the JSX parser: *"interpret what's inside here as a JavaScript expression."* It creates a boundary between JSX syntax and JavaScript expression syntax — nothing more mystical than that. In the example above, `<h1>Hello` is JSX, `{name}` is JavaScript, and `</h1>` is JSX again.

---

## 6. What happens during transpilation

```jsx
const name = "Rakib";
const element = <h1>Hello {name}</h1>;
```

Transpiles roughly to:
```js
const element = React.createElement("h1", null, "Hello ", name);
```

Notice `{name}` simply became `name` — the `{}` disappear because they were only an instruction to the parser, not something that exists at runtime.

Another example:
```jsx
const age = 28;
<h1>I am {age} years old</h1>
```
→
```js
React.createElement("h1", null, "I am ", age, " years old");
```

**Mental model:**
```
JSX text + JavaScript expressions inside {}
   → JSX transformation
   → JavaScript / React element creation
```

---

## 7. Why only expressions are allowed inside `{}`

**Expressions work** because they produce a value:
```jsx
{2 + 3}
{name}
{user.name}
{getName()}
{isLoggedIn ? "Logout" : "Login"}
```

**Statements don't work** because they're instructions, not value-producers:
```jsx
{if (isLoggedIn) {}}   // ❌
{const x = 10}         // ❌
{for (...) {}}         // ❌
```

A ternary works because it's a conditional *expression* — it evaluates to a value. An `if` statement doesn't evaluate to anything JSX can insert.

**Workaround:** run the statement in plain JS outside JSX, then insert the resulting value:
```jsx
let content;
if (isLoggedIn) {
  content = <Dashboard />;
} else {
  content = <Login />;
}
return <div>{content}</div>;
```

**Rule of thumb:** inside `{}`, JSX expects a JavaScript expression, because React needs an actual value to place into the UI tree — not an instruction.

---

## 8. Why tag names can't be dynamic with `<{tag}>`

It seems natural to try:
```jsx
const tag = "h1";
<{tag}>Hello</{tag}>   // ❌ not valid JSX
```

This doesn't work because the **tag-name position has its own JSX grammar** — `{}` is only usable for entering JS expressions in the specific places JSX's grammar allows it, and the tag-name slot isn't one of them.

**The actual way to do it:** use a capitalized variable holding the tag/component type:
```jsx
const Tag = "h1";
return <Tag>Hello</Tag>;
```
→ `React.createElement(Tag, null, "Hello")` — and since `Tag === "h1"`, React creates an `h1`.

This mirrors the capital-letter rule from earlier: `<h1>` is a literal, fixed HTML tag. `<Tag>` means "look up the JS value stored in `Tag` and use *that* as the element type" — dynamic by nature.

---

## Q&A Summary (for quick revision)

**Q: Is JSX HTML?**
A: No — it's a JavaScript syntax extension that resembles HTML. It's transformed into plain JS (`React.createElement(...)` or similar) before it ever runs.

**Q: Why must JSX have a single root element?**
A: A `return` produces one value, and JSX must resolve to one React element/tree. Multiple siblings need a common parent to become a single valid expression.

**Q: How does Fragment differ from wrapping in a `div`?**
A: A Fragment groups elements for React's purposes only — it adds no real node to the DOM, unlike a `div`.

**Q: Why is JSX stricter than HTML (e.g. must close `<img />`)?**
A: JSX is parsed by JavaScript's parser, not HTML's — HTML tolerates things JS syntax simply can't.

**Q: What do `{}` do in JSX?**
A: Mark a boundary telling the parser "treat what's inside as a JavaScript expression," not JSX markup.

**Q: Why can't statements (`if`, `for`, `const x = 10`) go inside `{}`?**
A: `{}` needs something that evaluates to a value (an expression). Statements are instructions and don't produce a value JSX can insert — run them outside JSX and pass in the result instead.

**Q: Why doesn't `<{tag}>Hello</{tag}>` work, and what's the real way to make an element type dynamic?**
A: The tag-name position isn't a place JSX's grammar allows `{}` expressions. Instead, assign the type to a capitalized variable (`const Tag = "h1"`) and use `<Tag>` — this passes the JS value as the element type via `React.createElement(Tag, ...)`.

---

## Still fuzzy / to revisit later
- The modern JSX transform (`_jsx(...)`) vs the classic `React.createElement` output — noted that both exist, not dug into why/when each is used
- `{age >= 18 && <p>Adult</p>}` pattern (conditional rendering via `&&`) — appeared in the combined example, not yet explicitly broken down

---

## One-line takeaway
JSX is JavaScript syntax dressed up to look like HTML — it must resolve to a single expression/tree, `{}` is strictly a doorway into JavaScript expressions (never statements), and anywhere JSX seems to break an HTML habit (closing tags, `className`, no dynamic `<{tag}>`), it's because JSX is following JS parsing rules, not HTML's.
