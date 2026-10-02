# Queueing a Series of State Updates

> Calling a setter does not change anything right now. It drops an item in a queue and asks React for a render. The queue is processed later, inside `useState`, in the next render.

---

## 1. Two separate moments

Everything in this chapter comes from one idea: a setter call and its effect happen at **two different times**.

**Moment 1: when you call the setter (inside your handler, in the old render)**
- React writes an item into the queue.
- React schedules a render.
- Your variables don't change at all.

**Moment 2: the next render, when the `useState` line runs**
- React walks the queue in order and works out the final state.
- It saves that state on the shelf and clears the queue.
- It returns the result, and a brand-new `const` is created holding it.

```
Your handler runs     →  setters write to the queue
Handler returns       →  React gets control back
Render starts         →  React calls your component
useState line runs    →  queue is processed here
```

The old variable never changes. The next render has a different variable that is created already holding the processed value.

---

## 2. Where is the queue stored?

Not in your component function (its variables die after every call), and not in the variable you got from `useState`.

The queue lives **on the shelf**: React's own memory, in the same slot as your state value. Each `useState` call in a component instance has its own slot, and each slot has its own queue. The setter you receive is tied to that slot, so when you call it, it knows exactly where to write.

This also explains why the queue isn't "found" when `useState` runs. React already owns it. The setter writes into it at call time, and `useState` reads and clears it at render time.

---

## 3. Two kinds of items in the queue

You can pass a setter one of two things, and they get queued differently.

### A plain value means "replace the state with this"

```jsx
setNumber(number + 5);
```

The expression `number + 5` is **resolved at call time**, in the old render, using that render's snapshot. If `number` is `0`, React receives the finished answer `5`:

```
queue: [ replace with 5 ]
```

### An updater function means "calculate the next state from the latest one"

```jsx
setNumber(n => n + 1);
```

Nothing is calculated at call time. React stores the **function itself**, uncalled:

```
queue: [ n => n + 1 ]
```

During the next render, React calls it and passes in the running result as `n`. That's why `n` is just a parameter name. It isn't connected to your snapshot, so it can see earlier pending updates that your snapshot variable can't.

A naming habit: people name the parameter after the state variable's first letter, like `setEnabled(e => !e)` or `setLastName(ln => ln.trim())`.

---

## 4. Execution order

Three different things run in order, and it helps to keep them apart.

**Setter functions run in the order you call them, right away, inside the handler.** Each one just writes an item to the queue and returns. Nothing is worked out yet.

**Plain-value expressions are resolved at the same moment**, when the line runs. The argument is calculated before the setter is even entered.

**Updater functions run later, in queue order, inside `useState` in the next render.** Each one receives the result of the item before it.

Put together:

```
call time (handler):    evaluate arguments, write items to the queue, in call order
render time (useState): walk the queue in order, call each updater with the running result
```

---

## 5. Which line does what

```jsx
function Counter() {
  const [number, setNumber] = useState(0);      // (A)

  function handleClick() {
    setNumber(number + 5);                      // (B)
    setNumber(n => n + 1);                      // (C)
    setNumber(42);                              // (D)
  }

  return <button onClick={handleClick}>{number}</button>;
}
```

With `number = 0` and one click:

- **(B)** `number + 5` is worked out now: `5`. React queues "replace with 5".
- **(C)** Nothing is worked out. React queues the function `n => n + 1`.
- **(D)** React queues "replace with 42".
- The handler returns, and React starts a render.
- **(A)** runs again. React walks the queue:

```
queue: [ replace with 5,  n => n + 1,  replace with 42 ]

start 0  →  5  →  6  →  42        final: 42
```

The last plain "replace" wins, because it throws away whatever came before. `useState` returns `42`, and the component shows it.

---

## 6. Batching

When you call several setters in one run of code, React doesn't render after each one. It collects all the updates and renders **once**, after the code finishes. This is **batching**.

```jsx
function handleSubmit() {
  setLoading(true);
  setError(null);
  setSubmitted(true);        // three setters, one render
}
```

Why not render after every setter? The screen would pass through half-updated states (new name, old surname), and you'd do extra work for nothing.

**How many setters can be batched?** There is no fixed limit. Every setter called during the same run of code goes into the same batch, across any number of different state variables.

**What counts as "one run of code"?** One run of your event handler, from the moment React calls it until it returns. Functions you call from inside the handler are part of the same run. JavaScript does one thing at a time, so React can't render until your handler hands control back.

**What makes a new batch?** A new click, or a later callback such as a timer.

```jsx
function handleClick() {
  setA(1);
  setB(2);                    // render 1: A and B together
  setTimeout(() => {
    setC(3);                  // render 2: a separate run, even with a 0 delay
  }, 0);
}
```

`setTimeout(fn, 0)` means "as soon as possible, but after the current code finishes", so it can never join the handler's batch. In modern React (18 and later), setters called together inside a timer, a promise, or after a `fetch` are batched too. The rule is always: one run of code, one batch, one render.

---

## 7. Worked examples

**Three plain values, all from the same snapshot**

```jsx
// number = 0
setNumber(number + 1);
setNumber(number + 1);
setNumber(number + 1);
```

Each `number + 1` is resolved at call time to `1`:

```
queue: [ replace with 1,  replace with 1,  replace with 1 ]
0 → 1 → 1 → 1        final: 1
```

All three ran. They just all said the same thing.

**Three updaters, each building on the last**

```jsx
setNumber(n => n + 1);
setNumber(n => n + 1);
setNumber(n => n + 1);
```

```
queue: [ n => n+1,  n => n+1,  n => n+1 ]
0 → 1 → 2 → 3        final: 3
```

**A mixed queue**

```jsx
// number = 0
setNumber(n => n + 1);       // updater
setNumber(number + 10);      // resolved now: replace with 10
setNumber(n => n * 2);       // updater
```

```
queue: [ n => n + 1,  replace with 10,  n => n * 2 ]
0 → 1 → 10 → 20        final: 20
```

The `1` from the first updater was calculated, then thrown away by the replace. It still mattered for one step.

---

## 8. Blank setters and other special cases

**A setter with no argument sets the state to `undefined`**

```jsx
setCount();                  // same as setCount(undefined)
```

The queue gets "replace with `undefined`". Then `count + 1` becomes `NaN`, and calling a string method like `name.toUpperCase()` on it crashes.

**An updater that forgets to return gives back `undefined`**

```jsx
setCount(n => { n + 1; });   // braces need an explicit return, so this gives undefined
setCount(n => n + 1);        // no braces, so the value is returned for you
```

**Setting the same value does nothing visible**
If the new value is identical to the current state (compared with `Object.is`), React skips re-rendering the component and its children. This matters for objects and arrays:

```jsx
user.age = 26;               // mutating the existing object
setUser(user);               // same object reference, so React sees no change and the UI stays stale

setUser({ ...user, age: 26 });   // new object, so React sees the change
```

**Calling a setter inside an updater**

```jsx
setCount(n => {
  setOther(5);               // wrong: updaters run during rendering
  return n + 1;
});
```

Updaters run while React is rendering, and rendering must be pure: it only calculates and does nothing else. React may run an updater more than once, and in development Strict Mode deliberately calls it twice to catch exactly this. An updater should take the old value and return the new one, and nothing more.

**One value that depends on another variable**
Do the work in the handler with the snapshot values and call each setter normally. Both go in the same batch.

```jsx
setCount(count + 1);
setMessage("Clicked " + (count + 1) + " times");
```

**Reading state right after the setter**

```jsx
setCount(count + 1);
console.log(count);          // still the old value; this render's snapshot never changes
```

---

## 9. Real-life uses of setters

**A form field: replace with what the user typed.** A plain value is exactly right, because the new text doesn't depend on the old state.

```jsx
<input value={name} onChange={e => setName(e.target.value)} />
```

**A toggle: depends on the previous value.** Use an updater, so rapid clicks and several calls in one handler stay correct.

```jsx
<button onClick={() => setOpen(o => !o)}>Menu</button>
```

**A submit button: several setters, one render.**

```jsx
function handleSubmit() {
  setLoading(true);
  setError(null);
  setSubmitted(false);
}
```

**After a fetch: results arrive, loading ends.** The setters in the async callback are batched together.

```jsx
fetch("/api/products")
  .then(res => res.json())
  .then(data => {
    setProducts(data);
    setLoading(false);       // one render for both
  });
```

**Adding to a list: depends on the previous list.** The updater builds on the latest queued list, and it creates a new array instead of mutating the old one.

```jsx
setTodos(prev => [...prev, { id: Date.now(), text }]);
```

**An "add 3" button, or quantity in a cart: stacks on the pending value.**

```jsx
function addThree() {
  setQuantity(q => q + 1);
  setQuantity(q => q + 1);
  setQuantity(q => q + 1);   // +3, not +1
}
```

**A reset: replace with a known value.**

```jsx
<button onClick={() => setCount(0)}>Reset</button>
```

The rule of thumb: if the new value doesn't depend on the old one, pass a plain value. If it does, pass an updater.

---

## 10. A tiny model of what useState does with the queue

This is a simplified version of the queue walk that happens at the `useState` line in the next render:

```js
function getFinalState(baseState, queue) {
  let finalState = baseState;

  for (const item of queue) {
    if (typeof item === "function") {
      finalState = item(finalState);     // updater: call it with the running result
    } else {
      finalState = item;                 // plain value: replace
    }
  }

  return finalState;
}

getFinalState(0, [n => n + 1, 10, n => n * 2]);   // 20
getFinalState(0, [5, n => n + 1]);                // 6
getFinalState(0, [5, n => n + 1, 42]);            // 42
```

Real React does more, but this loop is the heart of it. A loop that keeps one running value is the right shape here, rather than `map`, because we aren't building a new array.

---

## Quick recall

- A setter writes an item to a queue and schedules a render. It changes nothing in the current render.
- The queue lives on the shelf, in the same slot as the state, tied to the component instance.
- Plain value: the argument is resolved at call time, and the item means "replace".
- Updater function: stored uncalled, called later with the running result.
- Setters run in call order inside the handler. Updaters run in queue order inside `useState`, in the next render, after the handler returns.
- Batching: one run of code, one batch, one render. There's no limit on how many setters join it.
- `setX()` with no argument sets `undefined`. An updater with braces needs `return`.
- Same value (by `Object.is`) means no re-render, so never mutate an object and pass it back.
- Updaters must be pure: no other setters, no side effects.

---

## Self-check questions

1. With `number = 0`, what is the final value after `setNumber(number + 1)` is called three times, and why?
2. What does React store in the queue for `setNumber(n => n + 1)` at call time?
3. At which line, and in which render, does an updater function actually run?
4. With `number = 0`, trace the queue `[n => n + 1, replace with 10, n => n * 2]`.
5. Why must an updater function be pure?
6. A handler calls `setA(1)`, `setB(2)`, then starts a `setTimeout` that calls `setC(3)`. How many renders happen?
7. Why does `user.age = 26; setUser(user);` not update the screen?
