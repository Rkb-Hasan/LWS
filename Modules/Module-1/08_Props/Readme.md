# React Props — Full Revision Notes

## What this covers
- What props actually are, at the `React.createElement` level
- Why data can only flow parent → child, never child → parent
- How the `children` prop mechanically works (+ common use cases)
- Why props are treated as an immutable snapshot, and why a fresh object is created on every render
- Setting default values for props
- Forwarding props with the JSX spread syntax
- Why props reflect a component's data at any point in time, not just the first render

---

## 1. What props actually are, under the hood

Recall the signature: `React.createElement(type, props, ...children)`.

**The second argument literally *is* the props object.** JSX attributes are collected by Babel into a plain JS object and passed in as that second argument.

```jsx
<Card name="Rakib" age={28} />
```
transpiles to:
```js
React.createElement(Card, { name: "Rakib", age: 28 })
```

So `props` isn't a special React-internal construct — it's a regular object, assembled from your JSX attributes, handed to your component function as its **one and only argument**:

```jsx
function Card(props) { ... }
// or, destructured:
function Card({ name, age }) { ... }
```

Props are essentially "knobs" a parent sets on a child — conceptually the same role function arguments play for a normal function call, since a component *is* a function, and props are the single argument it receives.

---

## 2. Why props can only flow parent → child (never the reverse)

This isn't an arbitrary rule React enforces — it falls directly out of how JavaScript function calls work.

**Sequence of events:**
1. The parent's function body runs
2. While running, the parent reaches the line where it calls `React.createElement(Child, {...})` — at that exact moment, the parent constructs and hands over the props object
3. Only now does `Child(props)` actually execute — as a completely normal function call

Once `Child` is invoked, it has no reference back into the parent's scope — a called function can't reach up and modify the caller's local variables or arguments in plain JavaScript. Data only ever flows in the direction the call happened: **parent → child**, because the parent is the one constructing the argument and initiating the call in the first place.

**If a child needs to affect the parent:** it can't do it through props flowing backward. Instead, the parent hands the child a *function* as a prop (a callback), and the child calls that function — the parent's own code then decides what to do in response. This is a different mechanism (callback props), not props reversing direction.

---

## 3. How `children` actually works

```jsx
<Parent>
  <h1>Hello</h1>
</Parent>
```
transpiles to:
```js
React.createElement(Parent, null, React.createElement("h1", null, "Hello"))
```

Everything nested between `<Parent>` and `</Parent>` becomes the **third-and-onward arguments** to `createElement`. React's `createElement` implementation collects those extra arguments and automatically packages them into `props.children` before building the final props object handed to `Parent`.

```jsx
function Parent(props) {
  return <div>{props.children}</div>;
}
```

`props.children` is a genuinely ordinary prop — there's no special separate channel for it. It's populated automatically based on argument position, and by convention, a component chooses **where** inside its own JSX to place `{props.children}`, which decides where the nested content actually ends up rendering.

Depending on how many children were nested, `props.children` could be a single element, a string, or an array — `createElement` doesn't force it into one fixed shape.

### `children` prop — common use cases
- **Layout/wrapper components** — a `Card`, `Modal`, or `Panel` component that provides consistent styling/structure but has no idea in advance what content will go inside it
- **Composition over configuration** — instead of a component accepting a dozen specific props to control every bit of content, it just accepts `children` and lets the parent decide the actual content/structure
- **Reusable containers** — e.g. a `Section` component that always applies the same padding/border, wrapping whatever is passed to it
- **Conditional wrapping** — a component that decides *whether* to render its children at all (e.g. an `AuthGuard` that only renders `children` if a user is logged in), without needing to know what those children are

---

## 4. Props are an immutable snapshot — and why a fresh object is made every render

**Yes — props are a snapshot of one specific render**, not a live/ongoing reference that mutates over time.

**The mechanism:** every time the parent component function re-runs, it re-executes its JSX — which means it re-executes the `React.createElement(Child, {...})` call. In plain JavaScript, **an object literal `{...}` creates a brand-new object every time that line of code runs** — nothing special to React here:

```js
function outer() {
  return { x: 1 }; // runs → a NEW object every call
}
outer() === outer(); // false — always different references
```

The exact same thing happens with props: each render of the parent produces a fresh object, even when the *values* inside happen to be identical to the previous render.

**Why not just mutate the same object in place instead of creating a new one each time?**

- **React needs to tell old vs. new apart.** When something changes, React has to compare "what the props were" against "what the props are now" to figure out what to update. If the same object were mutated in place, there would be nothing left to compare — old and "new" would be the exact same reference, with the old values already overwritten and gone. Keeping the previous object intact and building a separate new one is what makes that comparison possible at all.
- **Predictability.** If props could be silently mutated by anyone holding a reference to them, a child could never fully trust that a prop value it read earlier in its own logic is still the same value later — a fresh, unmutated object per render guarantees exactly what a given render saw.

So immutability isn't a philosophical stance — it's a practical requirement for React to reliably know what changed between renders.

---

## 5. Default values for props

When a parent doesn't pass a prop at all, that prop's value inside the component is simply `undefined` — same as any regular JS function parameter that isn't given an argument. React doesn't do anything special here; it's ordinary JavaScript behavior.

```jsx
function Button({ color }) {
  return <button style={{ color }}>Click</button>;
}
```

`<Button />` with no `color` given → `color` is `undefined` inside the function.

**Setting a default — the plain-JS way, using destructuring default values:**
```jsx
function Button({ color = "blue" }) {
  return <button style={{ color }}>Click</button>;
}
```

This is exactly the same default-parameter syntax JavaScript already supports for any function:
```js
function greet(name = "friend") {
  console.log(`Hello, ${name}`);
}
```

There's no React-specific "default props" magic happening in modern function components — it's plain destructuring defaults applied to the `props` object, which is itself just a regular JS object/argument (Section 1).

**Important detail:** a default only kicks in when the prop is `undefined` — **not** when it's `null`, `0`, `false`, or an empty string. Those are all valid, intentionally-passed values, and React (and JS destructuring) won't override them with the default.

```jsx
<Button color={null} />   // color stays null, default does NOT apply
<Button />                // color is undefined, default DOES apply → "blue"
```

---

## 6. Forwarding props with the JSX spread syntax

Since `props` is just a plain object (Section 1), it makes sense that JavaScript's regular **object spread syntax** works on it directly.

**The problem it solves:** sometimes a component wraps another component and wants to pass *all* the props it received straight through, without manually listing each one.

```jsx
function FancyButton(props) {
  return <button className="fancy" {...props} />;
}
```

`{...props}` here spreads every key from the `props` object onto the underlying `<button>` as individual attributes — equivalent to manually writing out each one:
```jsx
// {...props} where props = { onClick: fn, disabled: true, children: "Click" }
// is equivalent to:
<button className="fancy" onClick={fn} disabled={true}>Click</button>
```

**Why this is useful:** it lets `FancyButton` act as a thin wrapper — it doesn't need to know in advance every possible prop someone might want to pass to the underlying `<button>` (like `onClick`, `disabled`, `aria-label`, etc.). It just forwards whatever it was given.

**A subtlety worth noting:** order matters, same as with any object spread. Since `{...props}` is spread *after* `className="fancy"` in the example above, if `props` also contained a `className`, it would **override** the `"fancy"` value — later keys win, exactly like plain object spread behavior:
```js
{ a: 1, ...{ a: 2 } } // → { a: 2 }
```
So if you want to guarantee your own value always wins regardless of what's forwarded, you'd place it *after* the spread instead.

---

## 7. Props reflect data "at any point in time" — not just the beginning

This is easy to accidentally conflate with Section 4 (props are immutable, a fresh object every render), so let's be precise about what's actually different here.

**What stays true (from Section 4):** any *single* props object, once created for a given render, is never mutated — it's a frozen snapshot of that one render.

**What's being added here:** across the *lifetime* of a component, props aren't fixed to whatever was passed in on the very first render. Every time the parent re-renders and passes a **new** props object down, the child receives that new object on its next render — the child's view of its data updates to match.

So the accurate way to think about it: a component doesn't see "the props from when it was first created, forever." It sees **whatever props object the parent most recently constructed and passed down**, and that can be different from one render to the next — reflecting new data, new user interaction results, new parent state, etc.

**Concrete example:**
```jsx
function App() {
  const [count, setCount] = useState(0);
  return <Display value={count} />;
}

function Display({ value }) {
  return <p>{value}</p>;
}
```
On the first render, `Display` receives `{ value: 0 }`. If `count` later becomes `1`, `App` re-renders, constructs a **new** props object `{ value: 1 }`, and passes that down — `Display` re-renders too, and now sees `value: 1`.

Put together with Section 4's immutability point, the full picture is:
- Each individual props object, once handed to a component for a given render, is frozen/immutable — the component can't reach back and change it
- But the component isn't stuck seeing the *first* props object forever — a new one arrives on each subsequent render, so from the component's perspective, its data can and does change over time, just never by mutating an existing object — always by receiving a brand-new one

---

## Q&A Summary (for quick revision)

**Q: What is `props`, literally, in terms of `React.createElement`?**
A: It's the second argument to `React.createElement(type, props, ...children)` — a plain object built by Babel from JSX attributes, passed as the single argument to the component function.

**Q: Why can't a child pass data back up to its parent via props?**
A: Because of how function calls work — the parent constructs the props object and initiates the call *before* the child function ever runs. A called function has no way to reach back into its caller's scope. A child can only affect a parent by calling a callback function the parent passed down as a prop.

**Q: How does `props.children` get populated?**
A: Anything nested between a component's opening and closing JSX tags becomes extra arguments to `React.createElement`, which `createElement` automatically collects into `props.children` — it's an ordinary prop, not a special mechanism.

**Q: Are props mutable?**
A: No — props are treated as immutable. Each render of a parent creates a brand-new props object (because JS object literals always create new objects on execution), rather than reusing or mutating the previous one.

**Q: Why create a new props object every render instead of reusing/mutating the same one?**
A: So React always has both the old and new values available to compare — mutating in place would destroy the old data needed for that comparison, and would make it impossible to reliably know what actually changed.

**Q: What is a prop's value if the parent doesn't pass it at all?**
A: `undefined` — same as any unset JS function parameter. No React-specific behavior involved.

**Q: How do you set a default value for a prop in a function component?**
A: Plain JS destructuring defaults: `function Button({ color = "blue" }) {}` — ordinary JavaScript syntax, not something React adds.

**Q: Does a default value apply if a prop is explicitly passed as `null` or `false`?**
A: No — defaults only apply when the value is `undefined`. Explicitly passed `null`, `0`, `false`, or `""` are left as-is.

**Q: What does `{...props}` do when forwarding to an underlying element?**
A: Spreads every key in the `props` object onto that element as individual attributes — plain JavaScript object spread, nothing React-specific about the mechanism itself.

**Q: If you spread `{...props}` after a hardcoded attribute like `className="fancy"`, and `props` also has a `className`, which one wins?**
A: The spread one — it comes later, so it overrides, exactly like normal object spread precedence.

**Q: Do props stay fixed to whatever was passed on the very first render?**
A: No — each render of the parent can construct and pass down a brand-new props object reflecting current data. The child's props update over time; what's immutable is each individual snapshot, not the overall value across the component's lifetime.

---

## Still fuzzy / to revisit later
- `React.memo` and how it uses props' immutability/reference-equality to decide whether to skip a re-render — deliberately parked, will get its own dedicated pass
- The render phase vs. commit phase distinction, which underlies exactly *when* a new props object gets constructed vs. when it's actually reflected on screen — also deliberately parked for later

---

## One-line takeaway
Props are just a plain object — the second argument to `React.createElement` — that only flows parent → child because of how function calls work; `children` is that same object's contents populated automatically from nested JSX; missing props default to `undefined` and defaults are handled with plain JS destructuring; `{...props}` is ordinary object spread with last-key-wins precedence; and while each individual props object is an immutable snapshot, a component's props as a whole update over time — a new object arrives on every render where the parent passes fresh data down.
