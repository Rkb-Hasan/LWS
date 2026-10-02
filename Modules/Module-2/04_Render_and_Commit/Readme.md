# Render and Commit — How React Puts Things on Screen

> React updates the UI in three steps: **Trigger → Render → Commit**.
> Then the browser **paints**. Keep this one line in your head and the rest of this page is just detail.

---

## The restaurant picture

Imagine a restaurant:

1. **Trigger**: a customer places an order.
2. **Render**: the chef prepares the dish in the kitchen.
3. **Commit**: the waiter carries the dish to the table.

And the customer actually *seeing* the dish? That's the browser **painting** the screen. React isn't responsible for that last part.

Keep this picture. Every section below is one of these steps.

---

## Step 1: Trigger

Something has to ask React to update the UI. There are only **two** possible triggers:

1. **The first render**: your app starts.

```jsx
import { createRoot } from "react-dom/client";

const root = createRoot(document.getElementById("root"));
root.render(<App />);        // <-- this triggers the initial render
```

2. **A state update**: a setter function gets called.

```jsx
const [count, setCount] = useState(0);

<button onClick={() => setCount(count + 1)}>+1</button>   // <-- triggers a re-render
```

That's the whole list. A plain variable change triggers nothing, because React isn't watching variables.

### Why setters *queue* a render instead of rendering instantly

When you call a setter, React doesn't re-render on the spot. It records the new value and **schedules** a render for after your event handler finishes.

Why wait? Think of the waiter taking your order. They don't sprint to the kitchen after every word you say; they wait until you finish ordering, then take the whole order at once.

```jsx
function handleClick() {
  setFirstName("Rokibul");
  setLastName("Islam");
}
```

If each setter re-rendered immediately:
- after the first setter, the screen would show the **new first name with the old last name**, a mix that should never exist
- you'd render twice for no reason

With queueing, React waits, collects **both** updates, and renders **once**. This is called **batching**.

---

## Step 2: Render

"Render" means **React calls your component functions** to find out what the UI should look like.

- On the first render, React calls the root component, then every component inside it, one by one, going down the tree.
- On a re-render, React calls the component whose state changed (and the components inside it).

The result of calling your components is **not real DOM**. It's a lightweight tree of plain JavaScript objects (called React elements) that *describe* the UI:

```jsx
function Greeting() {
  return <h1>Hello</h1>;
}
// Calling Greeting() gives React a description: "an h1 containing the text Hello"
// Nothing has touched the browser's DOM yet.
```

> **Render phase = thinking and drawing a plan. The screen is untouched.**

### State inside a render is a snapshot

During one render, the state values never change. The new value shows up in the *next* render.

```jsx
function handleClick() {
  setCount(count + 1);
  console.log(count);     // still the OLD value, because this render's snapshot is fixed
}
```

This is the second reason setters queue: your running code keeps a stable snapshot until the render finishes.

---

## Step 3: Commit

Commit is the only step that **touches the real DOM**. What React does depends on whether this is the first render or a later one.

### Initial render: build everything

Nothing exists on the page yet, so React creates all the DOM nodes and puts them in with `appendChild`.

### Re-render: edit only what changed

The page already exists. Instead of rebuilding it, React:

1. compares the **new tree** with the **previous tree** (this comparison is called the *diff*, or *reconciliation*)
2. makes only the smallest edits needed, using the same basic DOM operations you'd write by hand: update a text node, set an attribute, insert an element, remove an element
3. touches **nothing** if nothing differs

An example. Render 1 produces:

```jsx
<div>
  <h1>Count: 0</h1>
  <input placeholder="type here" />
</div>
```

You type "hello" into the input and click the button. Render 2 produces:

```jsx
<div>
  <h1>Count: 1</h1>
  <input placeholder="type here" />
</div>
```

React compares: the `div` is the same, the `input` is the same, only the `h1` text is different. So the commit changes **one text node** and leaves everything else alone.

The proof is that your typed "hello" is **still in the input**. React never touched that element. This is why we say React updates the DOM *surgically*.

---

## Then the browser paints

After the commit, the DOM has changed, and **the browser** notices, recalculates layout, and paints the pixels. React's job is done once the commit finishes.

```
Trigger  →  Render  →  Commit  →  (browser) Paint
 "order"    "chef"     "waiter"      "you see the dish"
```

---

## Why compare trees instead of rebuilding the DOM?

Building and comparing plain JavaScript objects is **cheap**; it all happens in memory. Changing the real DOM is **expensive**, because the browser may have to redo style calculations, **layout** (where everything sits), and paint.

Rebuilding the whole DOM on every render would also destroy things the browser is holding on to: the text you typed, input focus, scroll position, a playing video.

So React does the cheap work (render and diff) to avoid the expensive work (touching the DOM more than necessary). Also, because all changes are applied together in one commit, the browser usually does its layout and paint work once rather than once per change.

---

## Common mistakes and wrong beliefs

**"Render means the screen updated."**
Not necessarily. A render only means React *called your components*. If the new tree is identical to the old one, the commit changes nothing and the DOM is untouched.

**"Render happens in the browser's DOM."**
No. Render builds a plain-JS description. Only the commit touches the DOM.

**Expecting the new value right after calling the setter**

```jsx
setCount(count + 1);
console.log(count);        // old value; the update is queued for the next render
```

**Making three updates and getting only one**

```jsx
setCount(count + 1);
setCount(count + 1);
setCount(count + 1);       // result: +1, all three used the same snapshot

setCount(c => c + 1);
setCount(c => c + 1);
setCount(c => c + 1);      // result: +3, each one builds on the previous queued result
```

**Changing a plain variable and expecting an update**

```jsx
let count = 0;
count = count + 1;         // React hears nothing, so no trigger and no render
```

---

## Quick recall

- Three steps: **Trigger → Render → Commit**, then the browser paints.
- Triggers: the first render, or a state setter call.
- Setters **queue** the update, so React can batch them, avoid half-updated screens, and keep each render a stable snapshot.
- **Render** = call components, build a plain-JS tree. No DOM touched.
- **Commit** = update the real DOM. First time: create and `appendChild`. After that: diff, then make the smallest edits, or none.
- Comparing JS objects is cheap and DOM work is expensive, so React diffs first.
- Render ≠ screen updated, and the browser (not React) does the painting.

---

## Self-check questions

1. Name the two things that can trigger a render.
2. Does the render phase change the real DOM? What does it produce instead?
3. Why does a typed value stay in an input when the count next to it changes?
4. You call `setCount(count + 1)` three times in one handler. Why do you get +1, and how do you get +3?
5. Who actually paints pixels on the screen: React or the browser?
