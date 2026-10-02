# State as a Snapshot, and How Updates Are Batched

> A render is a photograph. State lives on a shelf outside your component. A setter doesn't edit the photo, it asks React to take a new one, and it waits until your code finishes before doing so.

---

## 1. Setting state asks for a new render

A local variable changes in place, and nothing else happens. State works differently: calling the setter **queues a render**, and the new value shows up in that next render.

```jsx
const [number, setNumber] = useState(0);

<button onClick={() => setNumber(number + 1)}>+1</button>
```

You never edit `number` yourself. You ask React for a new render, and React hands your component a fresh `number`.

## 2. Where state actually lives

State does not live inside your component function, because that function's variables are thrown away after every call. React keeps the values on a **shelf outside the component**. On each render, your component reads from that shelf and gets the current value.

```
shelf (React):   number = 0
                     │
         render ─────┘  → component receives number = 0
```

The setter writes a new note on the shelf and schedules the next render. That is why the value persists between renders even though your function starts fresh each time.

## 3. A render is a snapshot

Everything the component returns for one render is a **photograph of that moment**: its JSX, its state values, its props, and its event handlers, all captured together.

Inside one render, `number` never changes. Not after you call the setter, and not later in async code.

```jsx
function handleClick() {
  setNumber(number + 5);
  console.log(number);      // still the old value
}
```

The setter doesn't change the `number` in your current snapshot. It only asks for a new one.

### Even async code sees the old snapshot

```jsx
<button onClick={() => {
  setNumber(number + 5);
  setTimeout(() => {
    alert(number);          // shows 0, not 5
  }, 3000);
}}>
```

With `number = 0`, the alert shows **0**. The timer callback was created during the render where `number` was `0`, and it holds that snapshot. When it fires, React has already rendered a new snapshot with `5`, but that is a *different* `number` that belongs to a *different* render. A later photo never changes an earlier one.

---

## 4. Batching: wait, then render once

When you call a setter, React does not render right away. It records the update in a queue and renders **after your code finishes**. If several setters are called, all of them go in the queue and share **one** render. This is **batching**.

```jsx
function handleClick() {
  setFirstName("Rokibul");
  setLastName("Islam");
}
```

Why not render after each setter? Two reasons:

- **No half-updated screen.** After the first setter alone, the screen would show the new first name with the old last name, a combination that should never exist.
- **Less work.** One render instead of two.

The restaurant picture helps here: the waiter doesn't run to the kitchen after every word you say. They wait until you finish ordering, then take the whole order at once.

### What "this piece of code" means

When we say React waits until the code finishes, the "piece" is **one run of your event handler**: from the moment React calls it until it returns. It is not a `{ }` block and not a single line.

```jsx
function handleClick() {          // React calls this when you click
  setFirstName("Rokibul");        // queued
  setLastName("Islam");           // queued
}                                 // handler returns, THEN React renders
```

Why must React wait? JavaScript does one thing at a time. While your handler runs, React's code can't run. It only gets control back when the handler returns, and at that moment it sees the queue and renders once. Setters called inside the handler just write to the queue and return immediately.

Functions called from inside the handler are part of the same run:

```jsx
function handleClick() {
  updateName();     // same run
  updateAge();      // same run, so still one render
}
```

A new click is a **new run** and gets its own render.

---

## 5. Our questions, answered

**How many setters can be batched?**
There is no fixed number. Every setter called during the same run of code is collected and handled in one render.

**Does each setter run, or just one?**

```jsx
<button onClick={() => {
  setNumber(number + 1);
  setNumber(number + 1);
  setNumber(number + 1);
}}>
```

All three run. Each call puts an item in the queue. Here `number` is `0` in this render's snapshot, so each `number + 1` is worked out as `1` **before** React ever sees it:

```
queue: [ replace with 1,  replace with 1,  replace with 1 ]
0 → 1 → 1 → 1      final: 1
```

Three updates were processed. They just all said the same thing. (There is a way to build on the pending value instead of the snapshot. That's saved for a later session.)

Plain values mean **"replace the state with this"**, so the last one wins:

```jsx
setNumber(number + 5);   // replace with 5
setNumber(42);           // replace with 42
// final: 42
```

**Does the handler's snapshot get a new value if the handler is async?**
No. A state value never changes within a render, even inside timers and async code, because those callbacks were created during that render and keep its values.

**Is a `setTimeout` with `0` part of the same batch?**

```jsx
function handleClick() {
  setA(1);
  setB(2);
  setTimeout(() => {
    setC(3);
  }, 0);
}
```

No. That gives **two renders**:

1. The handler returns, and React renders once for A and B.
2. The timer callback runs as a new run, and React renders again for C.

`setTimeout(fn, 0)` doesn't mean "run now". It means "run as soon as possible, but only after the current code finishes". JavaScript never interrupts a running handler to run a timer callback.

If the timer callback called two setters, they'd share **one** render. In modern React (18 and later), async code is batched too. The rule is always: **one run of code, one batch, one render.**

---

## 6. Common mistakes

**Expecting the new value right after the setter**

```jsx
setNumber(number + 1);
console.log(number);       // old value, since the update is queued for the next render
```

**Expecting three setters to add three**

```jsx
setNumber(number + 1);
setNumber(number + 1);
setNumber(number + 1);     // result is +1, because all three use the same snapshot
```

**Expecting a timer or async callback to see the new value**

```jsx
setNumber(number + 5);
setTimeout(() => alert(number), 3000);   // old snapshot's value
```

**Expecting two separate runs to share a render**
A click handler and a timer callback it creates are two different runs, so they render separately.

---

## Quick recall

- A setter asks React for a new render. It never changes your current variable.
- State lives on a shelf outside the component, which is why it persists between renders.
- A render is a snapshot: JSX, state, props and handlers all belong to that moment.
- Async code and timers keep the snapshot of the render that created them.
- Setters queue their updates, and React renders once after the run of code ends.
- "This piece of code" means one run of your handler, from call to return.
- Three `setNumber(number + 1)` calls all queue "replace with the same value", so the result is `+1`.
- `setTimeout(..., 0)` still waits for the current run to finish, so it makes a separate render.

---

## Self-check questions

1. Why does `console.log(number)` right after `setNumber(number + 1)` print the old value?
2. Where does the state value actually live, and how does it survive between renders?
3. What does "this piece of code" mean when we say React renders after it finishes?
4. How many renders come from a handler that calls `setA`, `setB`, then schedules `setC` inside a `setTimeout`?
5. A timer set during a render where `count` was `3` fires later, after `count` is `7`. What value does the callback see, and why?
