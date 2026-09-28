# Pure Components in React

A pure component is one that **minds its own business**: give it the same inputs and it returns the same JSX, and it never changes anything that existed before it started rendering.

That's the whole idea. The rest of this doc is *why* it matters, *how to spot a violation*, and *where the impure stuff is supposed to live instead*.

---

## 1. The core rule: same input, same output

Think of a function like `double(n)`. `double(4)` is always `8`, no matter when or how many times you call it. A pure component works the same way.

```jsx
function Greeting({ name }) {
  return <h1>Hello, {name}</h1>;
}
```

`<Greeting name="Rakib" />` always produces `<h1>Hello, Rakib</h1>`. Call it once, twice, or a hundred times, same result.

**"Input" means more than props.** A component's inputs are its **props, state, and context**. A component that reads state is still pure:

```jsx
function Counter() {
  const [count, setCount] = useState(0);
  return <p>Count: {count}</p>;   // same state → same JSX → still pure
}
```

Pure doesn't mean "no state." It means the JSX is fully determined by props, state, and context, with nothing hidden.

---

## 2. What breaks purity: reaching outside during render

Here is the classic impure component:

```jsx
let guestCount = 0;

function Cup() {
  guestCount = guestCount + 1;          // ❌ changes something outside the component
  return <h2>Guest #{guestCount}</h2>;
}

export default function App() {
  return (
    <>
      <Cup />
      <Cup />
      <Cup />
    </>
  );
}
```

Two problems here:

- `Cup` **changes `guestCount`**, a variable that existed before the render started.
- `Cup` **reads that same shared variable**, so its output depends on *how many times it ran before*, not on its inputs.

The fix is to make the outside world an input instead:

```jsx
function Cup({ guest }) {
  return <h2>Guest #{guest}</h2>;   // ✅ everything it needs comes from props
}

export default function App() {
  return (
    <>
      <Cup guest={1} />
      <Cup guest={2} />
      <Cup guest={3} />
    </>
  );
}
```

Now each `Cup` is predictable, independent, and doesn't care what order React renders them in.

---

## 3. Local mutation is fine

The rule is *"don't change things that existed before this render."* Something you create **during** the render isn't visible to anyone else yet, so changing it is harmless.

```jsx
function TagList({ tags }) {
  const items = [];                                   // created fresh this render
  for (const tag of tags) {
    items.push(<li key={tag}>{tag}</li>);             // ✅ local mutation
  }
  return <ul>{items}</ul>;
}
```

`items` is born and dies inside this one render, so `push` can't leak into another component or another render. This is called **local mutation**, and it's allowed.

Compare the same idea done wrongly:

```jsx
const items = [];                                     // ❌ lives outside the component

function TagList({ tags }) {
  for (const tag of tags) items.push(<li key={tag}>{tag}</li>);
  return <ul>{items}</ul>;                            // grows on every render
}
```

Same `push`, but now the array survives between renders. That's what turns it into a bug.

---

## 4. Strict Mode: the impurity detector

In development, React's `<StrictMode>` calls your component function **twice** per render and throws away one result. You won't see a difference if the component is pure, because the same input gives the same output both times.

If the component is impure, the double call exposes it:

```jsx
let guestCount = 0;
function Cup() {
  guestCount++;                        // runs twice per render in Strict Mode
  return <h2>Guest #{guestCount}</h2>; // shows 2, 4, 6 instead of 1, 2, 3
}
```

So the double render isn't a React quirk to work around. It's a smoke alarm, and seeing weird doubled behavior in development is a sign to look for impurity. It only runs in development and has no effect in production.

---

## 5. Where logic lives: the space before `return`

A component has two zones:

```jsx
function ProductCard({ price, discount, onAdd }) {
  // ── Zone 1: the space before return ──────────────
  // Pure calculations and local mutation live here.
  const finalPrice = price - price * discount;
  const label = finalPrice < 10 ? "Cheap!" : "Regular";

  // ── Zone 2: what gets returned ───────────────────
  // Pure JSX, no surprises.
  return (
    <div>
      <p>{label}: ${finalPrice}</p>
      <button onClick={onAdd}>Add to cart</button>
    </div>
  );
}
```

- **Before `return`:** calculations, filtering, sorting a *copy*, building local arrays. All of it must be safe to run twice.
- **`return`:** JSX that just describes the UI.
- **Side effects don't go in either zone.** They go in event handlers or `useEffect` (next section).

The goal is that the returned JSX is a **pure description of the UI**: it doesn't reach into another world (network, DOM, storage, globals) while being built.

---

## 6. So where do side effects go?

Side effects are things that *reach outside* the component: network calls, changing `document.title`, writing to storage, sending analytics. Apps need them, they just can't happen during render.

**First choice: event handlers.** If the effect is caused by something the user did, put it in the handler. Handlers don't run during render, so they're allowed to be impure.

```jsx
function LikeButton({ postId }) {
  function handleClick() {
    fetch(`/api/posts/${postId}/like`, { method: "POST" });   // ✅ side effect in a handler
    analytics.track("liked", postId);                         // ✅ also fine here
  }
  return <button onClick={handleClick}>Like</button>;
}
```

**Last resort: `useEffect`.** When there is no event to attach the effect to (for example "this component appeared on screen, so do X"), `useEffect` runs the code *after* rendering instead of during it. It hasn't been introduced yet, so for now just remember its role:

```jsx
useEffect(() => {
  document.title = `${count} new messages`;   // runs after render, not during
});
```

A quick way to decide:

- Did a **user action** cause this? → event handler.
- Does it need to happen because the component **appeared or changed**, with no event? → `useEffect`.
- Is it just a **calculation** for the JSX? → do it before `return`, no effect needed.

---

## 7. Why pure components pay off

Writing components this way isn't just tidiness. It buys real things:

- **Predictable UI.** Same data always gives the same screen, so bugs are reproducible.
- **They work on the server.** A pure component doesn't need `window`, mutable globals, or the browser, so the server can render it and produce exactly what the client would. Impure components that depend on browser-only state break here.
- **React can safely re-run them.** Strict Mode, discarded renders, and future rendering features only work if calling a component twice is harmless.
- **React can skip work.** If output depends only on inputs, React can reuse a previous result when inputs haven't changed. Later optimizations depend on this.
- **Easy to test.** Call the function with props, check the output. No setup, no mocking a hidden global.
- **Order doesn't matter.** Components can render in any order, or be skipped, without changing results.

---

## 8. Common mistakes (note these)

**Mistake 1: changing a variable outside the component**
```jsx
let total = 0;
function Item({ price }) {
  total += price;               // ❌
  return <li>{price}</li>;
}
```
Fix: calculate the total in the parent from the data, and pass it down.

**Mistake 2: mutating props**
```jsx
function List({ items }) {
  items.push("extra");          // ❌ changes the parent's array
  return <ul>{items.map(i => <li key={i}>{i}</li>)}</ul>;
}
```
```jsx
function List({ items }) {
  const withExtra = [...items, "extra"];   // ✅ copy, then change the copy
  return <ul>{withExtra.map(i => <li key={i}>{i}</li>)}</ul>;
}
```

**Mistake 3: sneaky mutating array methods on props or state**

`sort()`, `reverse()`, `splice()`, `push()`, `pop()` all change the original array.
```jsx
const sorted = items.sort();          // ❌ sorts the prop in place
const sorted = [...items].sort();     // ✅ sort a copy
```

**Mistake 4: unpredictable values during render**
```jsx
function Clock() {
  return <p>{new Date().toString()}</p>;   // ❌ different output every call
}
function Badge() {
  return <span>{Math.random()}</span>;     // ❌ same input, different output
}
```
Same input, different output means impure. (This is the same reason `key={Math.random()}` is a bug.)

**Mistake 5: mutating state directly**
```jsx
user.name = "Rakib";                        // ❌ edits the existing object
setUser({ ...user, name: "Rakib" });        // ✅ build a new one
```

**Mistake 6: side effects written straight into the component body**
```jsx
function Page() {
  document.title = "Home";                       // ❌ runs on every render
  localStorage.setItem("visited", "true");       // ❌
  fetch("/api/track");                           // ❌
  return <h1>Home</h1>;
}
```
Move each into an event handler or `useEffect`.

**Mistake 7: silencing Strict Mode instead of fixing the cause.** If something behaves oddly in development, the double render is usually telling you the truth. Find the impurity rather than removing `<StrictMode>`.

---

## 9. Common patterns to follow

**Derive, don't copy.** Compute values from props during render instead of copying them into extra state.
```jsx
const visible = items.filter(i => i.active);   // recalculated each render, no extra state
```

**Copy, then change.** Use spread to build new arrays and objects.
```jsx
const added   = [...items, newItem];
const updated = { ...user, name: "New" };
const removed = items.filter(i => i.id !== id);
```

**Data comes in through props**, never through a hidden global.

**Build JSX locally.** Make a variable or array inside the component, fill it, return it.

**User action means a handler; "appeared on screen" means an effect.**

---

## 10. One more thing: single responsibility

Keeping each component focused on one job is a good habit, and it usually makes purity easier. But it's a **separate idea** from purity. A component doing three jobs can still be pure, and a tiny one-job component can be impure if it mutates a global. Treat them as two different checks.

---

## Quick self-check before you finish a component

- Does the same props/state/context always produce the same JSX?
- Am I only changing things I created *during this render*?
- Did I avoid `Math.random()`, `Date.now()`, and direct mutation of props or state?
- Are all network calls, storage writes, and DOM changes in handlers or effects?
- Would it still behave if React called it twice in a row?

---

## Q&A summary (for quick revision)

**Q: What makes a component pure?**
A: Same props, state, and context always produce the same JSX, and it doesn't change anything that existed before the render started.

**Q: Is local mutation allowed?**
A: Yes. Changing a variable you created during the same render can't affect anything else.

**Q: How does Strict Mode help?**
A: In development it calls components twice. Pure components look identical both times, impure ones show visible bugs.

**Q: Where do side effects go?**
A: Event handlers first, `useEffect` as a last resort when there's no event. Never in the render body.

**Q: Why can pure components render on the server?**
A: They depend only on their inputs, not on browser-only or shared mutable state.

---

## Still fuzzy / to revisit later
- `useEffect` itself (deliberately not introduced yet)
- How React uses purity to skip re-rendering unchanged components (memoization)
- Controlled patterns for reading external data in render (e.g. subscribing to external stores)

---

## One-line takeaway
Keep the space before `return` pure: calculate from props, state, and context, mutate only what you created this render, and push everything that reaches outside into event handlers or `useEffect`, so the same input always gives the same JSX.
