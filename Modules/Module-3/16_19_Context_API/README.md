# Context: Passing Data Deeply Without Prop Drilling

> Context lets a parent make a value available to **everything below it** in the tree, without passing it through every level as props. It's a delivery route, not a storage place. The data still lives in normal state, and context carries it (and the setter) down to whoever asks.

---

## Level 1: The basics

### 1. The problem: prop drilling

A value is needed deep in the tree, and every component in between has to carry it as a prop, even though it never uses it:

```
App (has theme)
└─ Page            ← receives theme, only passes it on
   └─ ProductCard  ← receives theme, only passes it on
      └─ BuyButton ← the only one that uses it
```

Every middle component gets extra props, and renaming or adding one means touching all of them.

### 2. The three steps

Think of a radio tower and a radio.

**Step 1: create the channel.** The argument is the **default value**, used only when no broadcaster is above.

```jsx
// ThemeContext.js
import { createContext } from 'react';
export const ThemeContext = createContext('light');
```

**Step 2: broadcast a value.** Wrap part of the tree and give it a `value`. Everything below can hear it.

```jsx
<ThemeContext.Provider value="dark">
  <Page />
</ThemeContext.Provider>
```

**Step 3: tune in.** Any component below reads the value, however deep it is.

```jsx
import { useContext } from 'react';

function BuyButton() {
  const theme = useContext(ThemeContext);
  return <button className={theme}>Buy</button>;
}
```

`Page` and `ProductCard` never mention the theme.

### 3. Which broadcaster wins?

The **nearest one above** the component.

```jsx
<ThemeContext.Provider value="dark">
  <ThemeContext.Provider value="light">
    <BuyButton />        {/* sees "light" */}
  </ThemeContext.Provider>
</ThemeContext.Provider>
```

With no broadcaster above, the component gets the **default value** from `createContext`.

### 4. React 19: the shorter syntax

In React 19 you can render the context itself instead of `.Provider`:

```jsx
<ThemeContext value="dark">
  <Page />
</ThemeContext>
```

`.Provider` still works and is expected to be deprecated in a future version. They are the same thing, because in React 19 `Context.Provider` is the context object. Check `package.json`: on React 18 or earlier, you must use `.Provider`. You will see both styles in other people's code.

Reading has a second option in React 19, `use(ThemeContext)`. Unlike `useContext`, it can be called conditionally, such as after an early return.

---

## Level 2: Making it useful

### 5. Context isn't state

Context holds nothing. The data lives in a normal `useState`, and the context carries the current value:

- **State:** each component position has its own copy. Two `<Counter />` tags have separate counts.
- **Context:** one value, **shared** by every consumer under that broadcaster.

Consumers can't change the value either. It's read-only. They call a **function** that was passed down, such as `setTheme`, which asks the state owner to change. The owner re-renders with a new value, and it flows down again. It's one-way data flow once more: values come down, requests go up.

### 6. The provider component pattern

Put the state and the broadcaster in one component, so the rest of the app stays clean:

```jsx
export const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// App
<ThemeProvider>
  <Page />
</ThemeProvider>
```

### 7. A custom hook for reading it

```jsx
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (ctx === null) {
    throw Error('useTheme must be used inside ThemeProvider');
  }
  return ctx;
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
      {theme}
    </button>
  );
}
```

Creating the context with `null` as the default means a missing provider shows up as a clear error, not a silent wrong value.

### 8. Who re-renders when the value changes?

With the tree `App > ThemeProvider > Page > ProductCard > ThemeToggle and BuyButton`, you click the toggle:

- **`ThemeProvider`:** re-renders, because it owns the state.
- **`ThemeToggle` and `BuyButton`:** re-render, because they use the context.
- **`App`, `Page`, `ProductCard`:** do **not** re-render.

`Page` is passed through `children`, which is the `<Page />` element that `App` created earlier. It is the same object as last time, so React skips it, and `ProductCard` below it too. This works only because the provider takes `children`. If `App` held the state and wrote `<ThemeContext.Provider value=...><Page /></...>` inline, the whole tree below would re-render as a normal parent re-render. **Where the state lives matters.**

---

## Level 3: Under the hood

A simplified model that matches the ideas in React's source.

### 9. A context is an object with one slot

```js
function createContext(defaultValue) {
  return { _currentValue: defaultValue };
}
```

It renders nothing and has no state. It's a box with one slot, filled with the default value at the start.

### 10. Broadcasting is a push and pop while React walks down

React renders the tree depth first. A broadcaster writes into the slot on the way in and restores it on the way out:

```js
const stack = [];

function pushProvider(context, value) {
  stack.push(context._currentValue);   // save what was there
  context._currentValue = value;       // new value for everything below
}

function popProvider(context) {
  context._currentValue = stack.pop(); // restore on the way out
}
```

```
enter <ThemeContext value="dark">       push  → slot = "dark"
  enter <ThemeContext value="light">    push  → slot = "light"
    render BuyButton                    reads "light"
  leave                                 pop   → slot = "dark"
  render Footer                         reads "dark"
leave                                   pop   → slot = default
```

The nearest broadcaster wins because it was pushed last. If React forgot to pop, `Footer` would still see `"light"`, which would be a leak: a component outside the broadcaster would read a value that was never meant for it.

### 11. `useContext` reads the slot and subscribes

```js
function useContext(context) {
  currentComponent.dependencies.push(context);   // 1. record: "I depend on this"
  return context._currentValue;                  // 2. read the slot right now
}
```

Each component has an internal record (a fiber) with a list of dependencies, and that list is the subscription. By the time `BuyButton` renders, the walk has already pushed the right value into the slot, so the read is correct.

### 12. What happens when the value changes

1. React compares the new `value` with the old one using `Object.is`.
2. Same value, and the children are the same objects: React skips the subtree.
3. Different value: React scans the subtree for components whose dependency list includes this context, and marks them (and the path above them) as needing a render.
4. During the render pass, unmarked components with unchanged props are skipped, and marked consumers re-render and read the new slot value.

### 13. How it fits what we already know

- The broadcaster is the context itself, so its `type` in the description object is the context. That is why `<ThemeContext value>` works in React 19.
- Pushing, reading and popping happen during the render phase, so the pure-render rules apply.
- There is no copy of your data inside context. The slot holds whatever `value` the broadcaster was given in this render.

---

## Level 4: Advanced

### 14. The `value` object catch

```jsx
<ThemeContext.Provider value={{ theme, setTheme }}>
```

The object `{ theme, setTheme }` is created **new on every render** of the provider. By `Object.is`, a new object always differs from the old one, so **every consumer** is marked each time the provider re-renders for any reason, even when the theme didn't change. And `memo` on a consumer doesn't help, because context updates bypass it.

The fix is to keep the value's identity stable with `useMemo`:

```jsx
const value = useMemo(() => ({ theme, setTheme }), [theme]);
// setTheme from useState never changes, so [theme] is enough
```

For a small app this rarely matters. It starts to matter when the provider re-renders often and has many consumers.

### 15. Split state and dispatch

Components that only **change** the value don't need to re-render when it changes. Splitting the contexts gives them that:

```jsx
const TasksContext = createContext(null);          // the state
const TasksDispatchContext = createContext(null);  // the dispatch function

export function TasksProvider({ children }) {
  const [tasks, dispatch] = useReducer(tasksReducer, initialTasks);
  return (
    <TasksContext.Provider value={tasks}>
      <TasksDispatchContext.Provider value={dispatch}>
        {children}
      </TasksDispatchContext.Provider>
    </TasksContext.Provider>
  );
}
```

`dispatch` never changes identity, so a component that only dispatches (like an "Add task" button) reads `TasksDispatchContext`, and it doesn't re-render when the list changes. This reducer-plus-context pair is a common pattern for app-wide state that has many actions.

### 16. Context vs the alternatives: when not to use it

Context is tempting, but often not the first tool:

- **Try props first.** Passing props through two levels is clear and traceable.
- **Try composition.** Extract components and pass JSX as `children`, so the middle layers don't need to know about the data.
- **Use context when many components at different depths need the same value,** such as theme, current user, language, or an app-wide cart.

A cost to remember: anyone reading `useContext(X)` has to hunt for where `X` is provided, so the data flow is less visible than with props.

### 17. Fast-changing state

Context compares by identity, and every consumer re-renders when the value changes. Putting something that changes on every keystroke or every mouse move into a broad context makes a lot of components re-render. Keep fast-changing state local, or split it into its own small context.

---

## Common mistakes

**Forgetting the provider**

Components silently get the default value. Create the context with `null` and throw in a custom hook so the mistake is loud.

**Expecting context to store data**

It doesn't. Without a `useState` or `useReducer` somewhere, nothing can ever change.

**Putting the provider too low**

Only components below it can read the value. A consumer outside the provider sees the default.

**A new object in `value` every render**

All consumers re-render each time. Use `useMemo`, or split contexts, when it matters.

**Holding the state in `App` and writing the provider inline**

The whole tree below re-renders on each change. Move the state into a provider component that takes `children`.

**Trying to change the value from a consumer**

It's read-only. Pass a setter or `dispatch` down through the context.

**Using context for everything**

Most data should still travel as props. Context is for values many distant components share.

**Using the wrong syntax for the version**

`<Context value>` works only in React 19. On React 18, use `<Context.Provider value>`.

---

## Quick recall

- Context solves prop drilling: values reach deep components without passing through the middle.
- Three steps: `createContext`, broadcast with a `value`, read with `useContext`.
- The nearest provider above wins. With none, the default value is used.
- React 19 lets you render `<Context value>` directly. `.Provider` still works and will be deprecated later.
- Context isn't state. It carries a value from some state, and consumers change it only by calling a function passed down.
- Under the hood, the context is an object with a slot. Providers push and pop the slot while React walks the tree, and `useContext` reads the slot and subscribes.
- When the value changes (by `Object.is`), only the components that use the context re-render, plus the owner. Others are skipped.
- A provider component that takes `children` keeps the rest of the tree from re-rendering.
- A new object in `value` each render makes every consumer re-render. Stabilize it with `useMemo`.
- Split state and dispatch contexts so dispatch-only components stay quiet.
- Prefer props and composition first. Use context for widely shared values.

---

## Self-check questions

1. What is prop drilling, and which components suffer from it?
2. Name the three steps of using context.
3. In two nested providers with `"dark"` and `"light"`, what does a consumer inside both see, and why?
4. What does a component get when no provider is above it?
5. What is the difference between `<Context.Provider value>` and `<Context value>`? Which React version do you need for the second?
6. Why isn't context "storage"? Where does the changing data actually live?
7. How does a consumer change a context value?
8. In the tree `App > ThemeProvider > Page > ProductCard > ThemeToggle and BuyButton`, which components re-render when you click the toggle? Why not `Page`?
9. What does the "stack" push and pop do while React renders, and what bug would a missing pop cause?
10. What two things does `useContext` do?
11. How does React decide whether to re-render consumers when the provider re-renders?
12. Why does `value={{ theme, setTheme }}` cause extra re-renders, and what is the fix?
13. Why split state and dispatch into two contexts?
14. Give one situation where props or composition are better than context.
