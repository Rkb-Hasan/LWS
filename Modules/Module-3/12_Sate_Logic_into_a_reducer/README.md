# useReducer: Moving State Logic into One Place

> A reducer is one function that answers a single question: **given the current state and something that happened, what is the next state?** Handlers only report what the user did with `dispatch`, and the reducer decides what that means. It is built on the same machinery as `useState`, with a queue of notes that React works through at the start of the next render.

---

## 1. The problem it solves

A task list with three handlers, each reaching into the same state:

```jsx
function handleAdd(text) {
  setTasks([...tasks, { id: nextId++, text, done: false }]);
}

function handleChange(task) {
  setTasks(tasks.map(t => (t.id === task.id ? task : t)));
}

function handleDelete(id) {
  setTasks(tasks.filter(t => t.id !== id));
}
```

Each handler knows *how* to rebuild the list. As the app grows, the rules get copied into more handlers, and one forgotten rule becomes a bug. A reducer collects all of that logic in one place.

---

## 2. The moving parts

```jsx
import { useReducer } from 'react';

function tasksReducer(tasks, action) {
  switch (action.type) {
    case 'added':
      return [...tasks, { id: action.id, text: action.text, done: false }];
    case 'changed':
      return tasks.map(t => (t.id === action.task.id ? action.task : t));
    case 'deleted':
      return tasks.filter(t => t.id !== action.id);
    default:
      throw Error('Unknown action: ' + action.type);
  }
}

export default function TaskApp() {
  const [tasks, dispatch] = useReducer(tasksReducer, initialTasks);
  //                                    reducer first, initial state second

  function handleDelete(id) {
    dispatch({ type: 'deleted', id });
  }
  ...
}
```

- **state:** the current value (`tasks`)
- **action:** a plain object describing what happened, with a `type` and any details
- **reducer:** a function `(state, action) => nextState`
- **dispatch:** the function that sends an action to the reducer

**Argument order:** `useReducer(reducer, initialState)`, reducer first. It returns `[state, dispatch]`.

---

## 3. Dispatch says what happened, not how

```jsx
// imperative: the handler does the work
setTasks(tasks.filter(t => t.id !== id));

// declarative: the handler reports what happened
dispatch({ type: 'deleted', id });
```

A setter says *how* to change the data. An action says *what the user did*, and the reducer decides the rest. This is the same declarative idea from the start of managing state.

Keep in the action only the **facts** the reducer needs: here, which task. Don't put a calculated result in it, such as the whole new list.

---

## 4. Under the hood

### A reducer is built from `useState`

A tiny version of the hook looks like this:

```jsx
function useReducer(reducer, initialState) {
  const [state, setState] = useState(initialState);

  function dispatch(action) {
    setState(current => reducer(current, action));
  }

  return [state, dispatch];
}
```

The state still lives in a normal `useState`. The only new thing is that `dispatch` doesn't set a value. It says "ask the reducer what the next state should be".

### The queue of notes

A setter and `dispatch` both work the same way at the start: nothing changes immediately. Each call puts a **note** in a queue that React keeps for the component, and React reads the queue on the next render. What differs is what is written on the note.

- **`setCount(count + 1)`:** a finished answer. `count` is `0` in this snapshot, so the note says "make it 1". Three calls give `[1, 1, 1]`, and the result is **1**.
- **`setCount(c => c + 1)`:** an instruction. The note says "take whatever the current value is and add one". The result is **3**.
- **`dispatch({ type: 'incremented' })`:** also an instruction, handled by your reducer. The result is **3**.

At the start of the next render, React does this:

```js
let next = savedState;                  // what React kept from the last render
for (const action of queue) {
  next = reducer(next, action);         // each step builds on the one before
}
return next;                            // this becomes your new state
```

```
0 → reducer(0, inc) = 1 → reducer(1, inc) = 2 → reducer(2, inc) = 3
```

The calculation is **delayed** until render time, so every action sees the latest state and never an old snapshot.

### `useState` is a small reducer in disguise

If the note is a function, `useState` runs it on the current state. If it's a plain value, it replaces the state. `useReducer` is the same machine, except **you** write the rules for what each note means.

A quick way to remember it: a setter with a value takes an **answer**, and `dispatch` takes a **question** for the reducer to answer later with the freshest state.

---

## 5. One dispatch, step by step

The user clicks delete on task 5:

```jsx
dispatch({ type: 'deleted', id: 5 });
console.log(tasks);     // still includes task 5
```

1. `dispatch` puts the action in the queue. Nothing changes right now.
2. The handler finishes, and React schedules a render.
3. At the start of the render, React calls `tasksReducer(currentTasks, action)`. The `'deleted'` case returns a new list without task 5.
4. That return value is the next state.
5. The component runs again, and `useReducer` hands back the new list.

The `console.log` prints the old list, because `tasks` in that handler is a snapshot of the render that created it. The new value arrives in the **next** render.

### Two dispatches in a row

```jsx
dispatch({ type: 'added', id: 1, text: 'A' });
dispatch({ type: 'added', id: 2, text: 'B' });   // both A and B end up in the list
```

Each action receives the state left by the previous one. The setter version fails:

```jsx
setTasks([...tasks, { text: 'A' }]);
setTasks([...tasks, { text: 'B' }]);   // both read the same snapshot, so only B is added
```

---

## 6. The reducer must be pure

The reducer is called **during rendering**, so it follows the same rules as the component:

- Given the same state and action, it returns the same result.
- It never mutates the old state. Everything from updating arrays and objects applies.
- It does no side effects: no fetching, no timers, no random ids.

React may call the reducer **twice** in development (Strict Mode) to catch mistakes. A reducer that mutates will show up as duplicated items, because the second call sees the array the first call already changed.

---

## 7. State lives with the position

Reducer state is saved by React for the component at its position in the tree, exactly like `useState`.

- The component stays at the same position (same type, same key): its reducer state survives every re-render.
- The component is removed and later rendered again: it starts **fresh**, because its instance was destroyed.
- To keep state past that, lift it into a parent that stays mounted.

---

## 8. useState or useReducer?

You can mix them in one component. Use whichever fits each piece of state.

### Three scenes

**Dark mode toggle: `useState`.** One value, one handler, and the update is a flip. A reducer adds code and gives nothing back.

**Shopping cart: `useReducer`.** The cart is changed in several places (product page, mini-cart, checkout) and follows rules: adding an existing item raises its quantity, and quantity never drops below 1.

```jsx
case 'added': {
  const existing = cart.find(i => i.id === action.id);
  if (existing) return cart.map(i => i.id === action.id ? { ...i, qty: i.qty + 1 } : i);
  return [...cart, { id: action.id, qty: 1 }];
}
case 'decreased':
  return cart.map(i => i.id === action.id ? { ...i, qty: Math.max(1, i.qty - 1) } : i);
```

The product page, mini-cart and checkout only dispatch. None of them can forget the "never below 1" rule, because they don't write it.

**Signup form: `useState`.** Three fields, a status and an error. The reason isn't "it's a form". Forms can be complicated. It is fine here because there are only two handlers, each does a simple and separate update, and they share no rules. The state is already tidy, with the fields grouped and one `status` variable.

### The real test is not "complex"

A big state object doesn't need a reducer, and a single list can. Ask:

- Do **many handlers** change the **same** state?
- Do the updates follow **rules** that should live in one place?
- Would you like to **debug or test** those updates as one function?

Mostly "no": use `useState`. Mostly "yes": use a reducer.

### What would turn the signup form into a reducer?

A multi-step version. With Back and Next buttons, validation per step, and rules like "changing the country resets the province", many handlers now change the same state under shared rules. That turns questions 1 and 2 into "yes".

### The trade-off

A reducer is **more code**: an action for each change, plus the switch. In return you get readable handlers, one place for the rules, easy debugging (log every action in the reducer) and easy testing (it's a plain function). Small, simple state doesn't earn that trade.

---

## 9. Best practices

- **Name actions after what happened,** in the past tense and from the user's side: `'added'`, `'deleted'`, `'checkout_started'`. Avoid setter-style names like `'set_tasks'`.
- **One action per user event.** If a click resets a form, dispatch one `'reset_form'`, not five separate setters. Each action should describe one thing that happened.
- **Keep the reducer outside the component** so it's created once, easy to test and easy to move to its own file.
- **Always add a `default` that throws,** so a misspelled action fails loudly.
- **Wrap `case` bodies that declare variables in braces,** as in the cart's `'added'` case.
- **Generate ids in the handler,** not in the reducer, and pass them in the action. A reducer that creates ids is impure, and Strict Mode's double call would make two different ones.

```jsx
function handleAdd(text) {
  dispatch({ type: 'added', id: crypto.randomUUID(), text });
}
```

---

## 10. Common mistakes

**Wrong argument order**

```jsx
useReducer(initialTasks, tasksReducer)   // wrong
useReducer(tasksReducer, initialTasks)   // right
```

**Mutating state in the reducer**

```jsx
case 'added':
  tasks.push({ id: action.id, text: action.text });   // mutates
  return tasks;                                       // same reference, no render
```

Return a new array: `[...tasks, {...}]`.

**Forgetting to return in a case**

A `case` with no `return` falls through into the next one, and an unlucky action can run two branches. Every case returns the next state.

**No `default`**

A typo in the action type silently returns `undefined` or does nothing. Throw an error instead.

**Reading state right after dispatch**

```jsx
dispatch({ type: 'deleted', id: 5 });
console.log(tasks);        // still the old list
```

The new state arrives on the next render.

**Putting calculated results in the action**

```jsx
dispatch({ type: 'set_count', count: count + 1 });   // computed from the snapshot
dispatch({ type: 'incremented' });                   // right: the reducer uses the latest state
```

**Side effects in the reducer**

Random ids, `fetch`, timers and `localStorage` writes don't belong there. Do them in the handler, then dispatch the result.

**Using a reducer for simple state**

A boolean flipped from one handler needs `useState`. Reach for a reducer when the questions in section 8 say yes.

---

## Quick recall

- `useReducer(reducer, initialState)` returns `[state, dispatch]`, with the reducer first.
- A reducer is `(state, action) => nextState`, and it must be **pure**.
- `dispatch` reports **what happened**. It doesn't set a value.
- Under the hood it is `useState` plus a queue. React runs the reducer on each queued action, in order, at the start of the next render.
- A setter with a value is a finished answer, and `dispatch` or an updater function is an instruction. Instructions chain, and answers overwrite.
- State after `dispatch` is a snapshot, so the new value arrives on the next render.
- Reducer state lives with the component's position, so removing the component resets it.
- Use a reducer when many handlers change the same state under shared rules. Use `useState` for simple state.
- Name actions after events, add a throwing `default`, and generate ids in handlers.

---

## Self-check questions

1. Which comes first in `useReducer`, the reducer or the initial state?
2. What is the difference between `setTasks(...)` and `dispatch({ type: 'deleted', id })` in what each one says?
3. Why does `console.log(tasks)` right after `dispatch` still show the old list?
4. Three `setCount(count + 1)` calls give 1, and three `dispatch({ type: 'incremented' })` calls give 3. What goes into the queue in each case?
5. In your own words, what does React do with the queue at the start of the next render?
6. Why must a reducer be pure, and how does Strict Mode expose a mutating one?
7. A component with a reducer is removed and later rendered again at the same position. What happens to its state, and why?
8. For a dark mode toggle, a shopping cart and a simple signup form, which one gets a reducer and why?
9. The note "use a reducer only when the logic is complex" is too vague. What are the three better questions?
10. Why should the id for a new task be generated in the handler and not inside the reducer?
11. What feature would make you switch the signup form to a reducer?
