# useState — From First Principles to the Engine Room

> Part 1 gives you the working mental model. Part 2 opens the hood and shows you *why* hooks behave the way they do. Read Part 1 for revision, Part 2 when you want the "aha".

---

# Part 1 — The General Picture

## A component is just a function that gets called again and again

A **render** means React calls your component function. Every render is a *fresh call*, exactly like calling any JavaScript function twice.

```jsx
function Counter() {
  let count = 0;                      // born again on every call

  function handleClick() {
    count = count + 1;
    console.log(count);               // 1, 2, 3 ...
  }

  return <button onClick={handleClick}>Clicked {count}</button>;
}
```

Click it. The console count goes up, but the screen stays at `Clicked 0`. Two separate problems are hiding in this tiny example.

### Problem 1: a local variable doesn't persist between renders

When a function finishes, its local variables are thrown away. The next render is a new call with a new scope, so `let count = 0` runs again. Even if the variable had changed, the next render would start from `0`.

> Local variables belong to *one call*. A component needs memory that outlives the call.

### Problem 2: changing a local variable doesn't trigger a render

React isn't watching your variables. JavaScript has no built-in "notify me when this changes" mechanism, and React doesn't add one. `count = count + 1` sends no signal to React, so from React's side nothing happened.

> React re-runs your function only when something tells it to.

## State fixes both problems

State does two jobs:

1. **Storage outside your function.** React keeps the value somewhere that survives between calls.
2. **A trigger.** The setter stores the new value *and* tells React to render again.

```jsx
import { useState } from "react";

function Counter() {
  const [count, setCount] = useState(0);

  return <button onClick={() => setCount(count + 1)}>Clicked {count}</button>;
}
```

- `count` is the value React hands you for **this** render.
- `setCount` means "update the stored value and schedule a re-render".
- `0` is only the **initial** value, used on the first render. After that React ignores it.

### State is a snapshot

Inside one render, `count` never changes, even after you call the setter. The new value appears on the *next* render.

```jsx
function handleClick() {
  setCount(count + 1);
  console.log(count);     // still the OLD value in this render
}
```

### Variable vs state, side by side

```jsx
function Demo() {
  let plain = 0;                         // dies after every render, change = no render
  const [kept, setKept] = useState(0);   // survives renders, change = render

  return (
    <>
      <button onClick={() => { plain++; console.log(plain); }}>
        plain: {plain}
      </button>
      <button onClick={() => setKept(kept + 1)}>
        state: {kept}
      </button>
    </>
  );
}
```

The first button logs numbers but never updates the screen. The second one updates both. If you click the second button, the first button's text re-renders as `plain: 0` again, because `plain` was recreated.

## The Rules of Hooks (the short version)

1. Call hooks **only at the top level** of a component (or a custom hook).
2. Never call them inside **conditions, loops, or nested functions**.
3. Call them only **during rendering**, never inside event handlers, timers, or effects' callbacks.

Part 2 explains *why* each rule exists. Once you see the engine, the rules stop feeling arbitrary.

## Common mistakes

**Mutating state directly**

```jsx
const [user, setUser] = useState({ name: "Rokibul", age: 25 });

user.age = 26;                          // wrong: React never hears about it
setUser({ ...user, age: 26 });          // right: new object, setter called
```

**Expecting the new value right after the setter**

```jsx
setCount(count + 1);
setCount(count + 1);
setCount(count + 1);       // ends up +1, not +3 (all three use the same snapshot)

setCount(c => c + 1);
setCount(c => c + 1);
setCount(c => c + 1);      // +3, each call builds on the previous result
```

**Using a plain variable where state belongs**

```jsx
let total = 0;                       // resets every render
const [total, setTotal] = useState(0);   // remembered
```

---

# Part 2 — Deep Dive: What's Really Happening Under the Hood

## The mystery

Here is something strange. `useState(0)` takes no component name, no ID, no key. Yet when Gallery calls it twice, each call gets back **its own** value, and the values survive between renders.

How does a bare function call know *which* state is *its* state?

The answer: **by counting.**

## The slot machine

Think of every component instance as owning a row of numbered boxes (slots). Each `useState` call takes the next box in line.

```
Gallery's hooks:   [ slot 0 ] [ slot 1 ] [ slot 2 ] ...
                     index      showMore
```

React doesn't know your variable names. It only knows: *"first hook call, second hook call, third hook call."*

Here is a simplified version, in the spirit of the React docs' "deep dive" on state:

```js
let componentHooks = [];       // the row of boxes
let currentHookIndex = 0;      // which box are we on?

function useState(initialState) {
  let pair = componentHooks[currentHookIndex];

  if (pair) {                          // box already filled? reuse it
    currentHookIndex++;
    return pair;
  }

  pair = [initialState, setState];     // box empty? create state here

  function setState(nextState) {
    pair[0] = nextState;               // update the stored value
    updateDOM();                       // trigger a re-render
  }

  componentHooks[currentHookIndex] = pair;
  currentHookIndex++;
  return pair;
}

function updateDOM() {
  currentHookIndex = 0;                // <-- rewind the counter!
  let output = Gallery();              // run the component again
  // ... update the screen with output ...
}
```

Follow one full life of it:

**Render 1** (everything is empty)
- `useState(0)` → box 0 is empty → creates pair **A**, stores it in `[0]` → counter is now 1
- `useState(false)` → box 1 is empty → creates pair **B**, stores it in `[1]` → counter is now 2

**Click "Next".** The setter mutates pair A (`A[0] = 1`) and calls `updateDOM()`, which **rewinds the counter to 0** and runs Gallery again.

**Render 2**
- `useState(0)` → box 0 holds A → returns A (value `1`)
- `useState(false)` → box 1 holds B → returns B

State survived, because the counter walked the same path as before.

## Experiment: what if we delete `currentHookIndex = 0`?

This is the best way to feel how fragile (and clever) the design is.

Without the rewind, the counter stays at 2 after render 1.

**Render 2**
- `useState(0)` → looks at box **2** → empty → creates a brand-new pair **C** with the *initial* value `0`
- `useState(false)` → looks at box **3** → empty → creates pair **D** with `false`

```
componentHooks = [ A(updated!), B, C, D ]
                   ^ orphaned      ^ in use
```

The updated pair **does exist**, but nobody ever looks at boxes 0 and 1 again. The counter has moved past them.

What you'd see:
1. The UI always shows the **initial values**. You click Next, the old pair updates, but the re-render builds fresh pairs holding `0`.
2. The array grows by 2 boxes every render, which is a memory leak.
3. Every render hands you new setter functions bound to different pairs.

A precise detail: `updateDOM()` doesn't *create* the pairs. It re-runs Gallery, and Gallery's `useState` calls create them because the counter lands on empty boxes.

> Lesson: state persistence isn't magic. It is **"same calls, same order, counter starts at zero."**

## Why hooks can't live inside conditions, loops, or nested functions

All of this rests on one law:

> **The order of hook calls must be identical on every render.**

Break the order and every hook after the break reads the wrong box. Here are the three ways people break it.

### 1. Inside a condition

```jsx
function Form({ isLoggedIn }) {
  if (isLoggedIn) {
    const [name, setName] = useState("Rokibul");   // slot 0 ... sometimes
  }
  const [age, setAge] = useState(25);              // slot 0 or slot 1?

  return <p>{age}</p>;
}
```

- **Render 1** (`isLoggedIn = true`): `name` takes box 0, `age` takes box 1.
- **Render 2** (`isLoggedIn = false`): the `if` is skipped, so `age`'s `useState` is now the *first* call. It reads box 0 and receives **`name`'s data**.

```
Render 1:  [ name ][ age  ]
             ^0      ^1
Render 2:  age asks for box 0 → gets "Rokibul" 😱
```

Your `age` suddenly holds a string, and everything after it is shifted by one. This is the same "counter pointing at the wrong box" bug as the experiment above, just triggered differently.

**Fix: always call the hook, put the condition on the *use* of the value.**

```jsx
function Form({ isLoggedIn }) {
  const [name, setName] = useState("Rokibul");
  const [age, setAge] = useState(25);

  return isLoggedIn ? <p>{name}, {age}</p> : <p>{age}</p>;
}
```

### 2. Inside a loop

```jsx
function List({ items }) {
  for (let i = 0; i < items.length; i++) {
    const [checked, setChecked] = useState(false);   // how many calls? depends on items!
  }
}
```

If `items` has 3 entries on render 1 and 2 entries on render 2, the number of hook calls changes. The boxes no longer line up, and any hook *after* the loop shifts too.

**Fix: make each item its own component.** Every instance gets its own row of boxes.

```jsx
function List({ items }) {
  return items.map(item => <Item key={item.id} item={item} />);
}

function Item({ item }) {
  const [checked, setChecked] = useState(false);   // always exactly one call
  return <label><input type="checkbox" checked={checked}
    onChange={() => setChecked(!checked)} /> {item.text}</label>;
}
```

### 3. Inside a nested function

```jsx
function Counter() {
  function handleClick() {
    const [count, setCount] = useState(0);   // wrong: runs on click, not during render
  }
  return <button onClick={handleClick}>Go</button>;
}
```

This breaks *two* things:
- The function may run **zero times** (nobody clicks) or **many times**, so the call order is unpredictable.
- It runs **outside rendering**. At that moment React isn't in the middle of rendering any component, so there is no "current component" and no live counter. React throws the "Invalid hook call" error.

**Fix: call the hook at the top, use the setter inside the handler.**

```jsx
function Counter() {
  const [count, setCount] = useState(0);
  function handleClick() { setCount(count + 1); }
  return <button onClick={handleClick}>{count}</button>;
}
```

### Also dangerous: after an early `return`

```jsx
function Profile({ user }) {
  if (!user) return null;               // on some renders we leave here...
  const [tab, setTab] = useState("info");   // ...so this hook sometimes never runs
}
```

Put hooks **above** any early return.

## Why only "during rendering"?

For `useState` to find your box it needs two facts:

1. **Which component instance is rendering right now?** (to pick the right row of boxes)
2. **Which call number is this?** (to pick the right box)

React sets both up *just before* it calls your component, and clears them *right after*:

```js
let currentComponent = null;
let currentHookIndex = 0;

function renderComponent(component) {
  currentComponent = component;   // "this one is rendering"
  currentHookIndex = 0;           // "start counting from zero"
  const output = component.fn();  // call YOUR function
  currentComponent = null;        // "nobody is rendering now"
  return output;
}
```

Outside this window, in a click handler or a `setTimeout`, both facts are missing. That is exactly how React detects misuse: **by context at runtime**, not by the function's name. (In real React, this "who is rendering" pointer is called the **dispatcher**.)

Slots also belong to each **instance**, not to the component function. Render `<Counter />` twice, and the same function runs twice, but each instance has its own row of boxes. They never share state.

## So how does React "know" it's a hook?

It doesn't. **React never identifies hooks.**

Inside `useState` there is simply code that reads "current component" and "call counter". That's it. A hook is just an ordinary function that happens to reach into that prepared environment.

### Try it: rename `useState` to `loveState`

```jsx
import { useState as loveState } from "react";

function Counter() {
  const [count, setCount] = loveState(0);   // works exactly the same
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

This is the same as any renamed function:

```js
function add(a, b) { return a + b; }
const banana = add;
banana(2, 3);   // 5, the function doesn't care what you call it
```

How React really executes your component:

1. React decides `Counter` needs to render.
2. React sets "current component = Counter, counter = 0".
3. React calls `Counter()`.
4. Your code runs line by line. It hits `loveState(0)`, and JavaScript jumps into React's real `useState` code.
5. That code reads the environment, finds the box, returns the pair.
6. Your function finishes and React clears the environment.

At no point does React read your source or check names. A proof you already rely on daily: production bundles **minify** names, and `useState` often becomes a single letter. If React needed the name, every deployed app would break.

## Then why do hooks start with `use`?

The prefix is for **tools and humans**, never for the runtime.

- **ESLint** (`eslint-plugin-react-hooks`) hunts for functions starting with `use` and enforces the rules above. It can't know `getUserData()` secretly calls `useState`, but it trusts `useUserData()`.
- **React Compiler** also relies on the convention.
- **Humans** read `use...` as a warning label: *hidden state and a call-order contract live here.*

If you named a hook `loveState` and called it inside an `if`, **no tool would warn you**, and you'd hit the shifted-boxes bug from the condition example with zero help.

### Custom hooks are invisible to React

```jsx
function useCounter() {
  const [n, setN] = useState(0);
  return [n, () => setN(n + 1)];
}

function App() {
  const [a, inc] = useCounter();   // from React's view: App made ONE useState call
}
```

React has no idea `useCounter` exists. It runs as a plain call, and the `useState` inside takes the next box in line. Rename it `getCounter` and it still works identically. Only the linter goes quiet.

---

# Quick Recall

- A render is a function call. Local variables die with each call.
- State is storage **outside** your function, plus a setter that **triggers** a render.
- State inside a render is a **snapshot**.
- Hooks find their state by **call order** (the slot machine), during a specific component instance's render.
- The counter is rewound to 0 before every render. Remove that and every render creates fresh state.
- Conditions, loops, nested functions, and early returns can change the call order, so hooks must stay at the top level.
- Hooks work only during rendering, because that is the only time React has set up "current component" and "counter".
- React never identifies hooks by name. `use` is a convention for linters, compilers, and humans.

---

# Questions to Keep Chasing

- When a parent renders a **child** component, what happens to `currentComponent` and the counter? How would you stop the child's render from corrupting the parent's counter?
- If two hooks are swapped in order between renders, which bug do you get, and could the types still "accidentally match" and hide it?
- Real React doesn't use a plain array. It uses a **linked list** of hook objects. What would that change (and what would it keep the same)?
