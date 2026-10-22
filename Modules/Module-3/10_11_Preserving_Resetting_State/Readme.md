# Preserving and Resetting State

> State doesn't belong to a component function. It belongs to a **position in the UI tree**. React keeps it while the same component (same `type`, same `key`) stays at that position, and throws it away when the component is removed or its identity changes.

---

## 1. State belongs to a position, not to the code

Two `<Counter />` tags in different spots of the tree have **separate** state. The position is in the **UI tree** that React builds while rendering, and not the place where you wrote the code.

React keeps a component's state for as long as it is rendered at its position. When React removes the component, its state is destroyed with it.

---

## 2. The three rules

| What happens at a position | Result |
|---|---|
| Same component, same position | State is **preserved** |
| A different component at that position | State is **reset**, and the old subtree is destroyed |
| The component is removed | State is **destroyed** |

### Same component, same position: preserved, even when props differ

```jsx
{isTaylor ? <Chat person="Taylor" /> : <Chat person="Sarah" />}
```

Both branches are `Chat` at the same position. Switching people keeps the state, so the draft you were typing to Taylor stays in the textbox, now addressed to Sarah. In a real chat app, that is a message sent to the wrong person. **Props don't reset state.**

### A different component: the whole subtree resets

If the type at a position changes from `Chat` to something else, React destroys the old component **and every child's state below it**, then builds the new one from scratch.

---

## 3. How React decides: comparing `type`

React walks down the tree and compares the old description with the new one **at each position**. For each element it checks the `type` (and later the `key`).

### Strings vs functions

- **Normal tags:** `type` is a string, like `"input"`. Strings are compared by value, so `"input" === "input"` is `true`.
- **Components:** `type` is the function itself. Functions are objects, and objects are compared by **reference**: is it the very same object in memory?

```js
const a = function Field() {};
const b = a;
a === b            // true: the very same function

function make() { return function Field() {}; }
make() === make()  // false: two separate copies with identical code
```

The rule isn't "two objects are always `false`". It is "two separate objects are `false`, and one object compared with itself is `true`".

### Created vs run

- `Form` is declared once, **when the file loads**. That creates one function object.
- Each render **runs** that same function again, from top to bottom. Calling a function does not create a new copy of it.
- Everything declared *inside* a run is fresh each time: the local variables, and any function written inside it.

### Description vs instance

- **What each run returns:** a description, the `createElement` objects like `{ type: Field, props }`. A new set is created every render, compared with the previous set, and discarded.
- **The instance:** what React keeps **between** renders for that component at that position, mainly the saved state. It isn't created again on every render.

An analogy: `Form` is a recipe, written once. Each render is cooking one dish from it, and the dish is compared with the last one. The instance is the notebook page kept for the table. Dishes come and go, but the page stays as long as the table stays. A different type at the same position means a new page.

---

## 4. Pitfall: don't define a component inside a component

### The bug

```jsx
function Form() {
  const [name, setName] = useState('');

  function Field() {                       // defined INSIDE Form
    return <input value={name} onChange={e => setName(e.target.value)} />;
  }

  return <Field />;
}
```

Type one letter and the input loses focus. You have to click it again for every character.

### Why, step by step

1. Each run of `Form` executes the line `function Field() {...}` again, so each render creates a **new** function object.
2. Render 1 returns `{ type: Field#1 }`. After you type, `setName` runs and render 2 returns `{ type: Field#2 }`.
3. `Field#1 === Field#2` is `false`, so React concludes this is a different component at the same position. It destroys the old `Field` and its DOM node, and builds a new one.
4. The text still looks right, because `name` is state of `Form`, and `Form` was kept. But the focus belonged to the old DOM node, which is gone.

Compare each level of the tree:

```
Form        (same function both renders)  → kept, state kept
└─ Field    (new function each render)    → destroyed and rebuilt
   └─ input
```

### An arrow function is the same

```jsx
const Field = () => <input value={name} onChange={...} />;   // same problem
```

A function is a function, arrow or not. Any component defined inside another is new on every render.

### A helper function call is different

```jsx
function Form() {
  function renderField() {
    return <input value={name} onChange={...} />;
  }
  return <div>{renderField()}</div>;
}
```

`renderField()` is called directly, so React receives a plain `<input>` element whose type is the string `"input"`, the same every render. No new component type is created, so focus survives. The trouble starts only when you write `<Field />`, because then the function itself becomes the `type`.

### The fix

Define the component once, outside, and pass data through props:

```jsx
function Field({ value, onChange }) {
  return <input value={value} onChange={onChange} />;
}

function Form() {
  const [name, setName] = useState('');
  return <Field value={name} onChange={e => setName(e.target.value)} />;
}
```

Now `Field` is created once when the file loads, so the `type` is the same every render, and React preserves the state, DOM node and focus.

---

## 5. Resetting state at the same position

If props don't reset state, what does? There are two ways.

### Way 1: render in different positions

```jsx
{isTaylor && <Chat person="Taylor" />}
{!isTaylor && <Chat person="Sarah" />}
```

When you switch, the first slot goes from `Chat` to `false` and its instance is destroyed. The second slot goes from `false` to `Chat` and a fresh instance is created. This works well for two options and gets clumsy as options grow.

### Way 2: give the component a `key`

```jsx
<Chat key={person} person={person} />
```

When the key changes, React treats it as a different component and resets its state.

---

## 6. How `key` works under the hood

`key` isn't a normal prop. A keyed call looks like this:

```js
React.createElement(Chat, { key: "Taylor", person: "Taylor" })
```

and the description it returns looks like this:

```js
{
  type: Chat,
  key: "Taylor",               // stored beside type
  props: { person: "Taylor" }  // key is NOT in here
}
```

That is why `props.key` is `undefined` inside `Chat`.

At each position React compares old and new on two things:

- **Same `type` and same `key`:** the same instance. State is kept, and the new props are passed in.
- **Different `type` or different `key`:** a different instance. The old one is destroyed with its subtree, and a fresh one is built.

The chat example, step by step:

1. Render 1: `{ type: Chat, key: "Taylor" }`. React creates an instance, and you type a draft.
2. You switch: `{ type: Chat, key: "Sarah" }`. The type matches, but `"Taylor" !== "Sarah"`.
3. React treats it as a different instance, destroys Taylor's, and builds a new one. The draft is gone.

The key is a second part of a component's identity, next to `type`. It works on any component, not only inside lists.

---

## 7. Keys in lists: stable and unique

In a list, React uses keys to match old elements with new ones, so each item's state follows the item even when the list is reordered. With no key, React quietly uses the index and warns you. Keys only need to be unique among **siblings**.

A good key is:

- **Unique** among its siblings
- **Stable**: the same item gets the same key on every render

### Bug: a key created during render

```jsx
<Chat key={Math.random()} person={person} />
{todos.map(todo => <TodoItem key={crypto.randomUUID()} todo={todo} />)}
```

A new key is generated on every render. The `type` matches, but the key never does, so React destroys and rebuilds the component on every render. Drafts disappear and focus is lost after each keystroke.

Compare the two identity bugs:

| Bug | What changed between renders | Result |
|---|---|---|
| Component defined inside another | the **type** | new instance every render |
| `key={Math.random()}` | the **key** | new instance every render |

Both tell React "this is a different component", one through the type and one through the key.

### The right place to generate an id

```jsx
setProjects([...projects, { ...newProject, id: crypto.randomUUID() }]);

{projects.map(p => <ProjectCard key={p.id} project={p} />)}
```

The UUID is created **once, in the handler**, when the project is added. After that it is plain data in state, so it stays the same on every render. The same function in JSX runs **once per item per render**. Where the call lives decides everything.

Putting `id` after the spread means it wins even if `newProject` carried an old one.

### Small improvements

- **Generate the id outside an updater function.** React may call updater functions twice in development (Strict Mode), and an updater that creates ids would make a different one each call.

```jsx
const id = crypto.randomUUID();
setProjects(prev => [...prev, { ...newProject, id }]);
```

- **Use the updater form when adds can happen back to back.** `[...projects, x]` reads this render's snapshot, and `prev => [...prev, x]` starts from the latest queue.
- **Let the server own the id** in real apps. Add the item with the real id from the response, or with a temporary id that you replace.
- **A counter is enough for local-only lists:** `{ id: nextId++ }` with `let nextId = 0` outside the component.
- **`crypto.randomUUID()` needs a secure context** (HTTPS or localhost). On a plain `http://` page it is `undefined`, and the add button breaks only in production.

---

## 8. Common mistakes

**Expecting props to reset state**

```jsx
{isTaylor ? <Chat person="Taylor" /> : <Chat person="Sarah" />}   // state is shared
```

Add a key, or render in separate positions.

**Defining a component inside another component**

Every render creates a new type, so state is wiped and inputs lose focus.

**Random keys**

`key={Math.random()}` and `key={crypto.randomUUID()}` in JSX rebuild the component on every render.

**Using the index as a key in a list that can change order**

State stays with the slot and not with the item, so a deleted item can hand its state to the next one.

**Thinking `props.key` exists**

The key is stored next to the props, not in them.

**Thinking state lives inside the function**

Each run of the function is fresh. The state lives on React's side, attached to the position.

---

## Quick recall

- State belongs to a position in the UI tree. Same type and key at the same position keeps it.
- Props don't reset state. A different type, a different key, or removal does.
- Resetting a type resets its whole subtree.
- Strings compare by value, and function components compare by reference.
- A component function is created once when the file loads. Each render runs it again.
- Each run returns a fresh description. The instance is what React keeps between renders.
- Never define a component inside another one, arrow functions included. Calling a helper like `renderField()` is fine.
- Reset state by rendering in different positions, or by changing the `key`.
- `key` is stored beside `type`, not in props.
- Keys must be stable and unique among siblings. Generate ids once, in handlers.

---

## Self-check questions

1. Why does the draft message stay when you switch from Taylor's chat to Sarah's?
2. What happens to state when a component is removed? When a different component takes its position?
3. Why is `Form === Form` true but `Field#1 === Field#2` false?
4. When is the function `Form` created, and what happens on each render?
5. What is the difference between the description a run returns and the instance React keeps?
6. Why does an input lose focus when its component is defined inside another component? Does it help to use an arrow function?
7. Why doesn't calling `renderField()` cause the same problem as `<Field />`?
8. What are the two ways to reset state at the same position?
9. Where is `key` stored in the description object, and why is `props.key` undefined?
10. Which one keeps its state when you type a letter, `Form` or the nested `Field`? Why?
11. What changes between renders in the nested `Field` bug, and what changes in the `Math.random()` key bug?
12. Why is `crypto.randomUUID()` fine inside the add handler but a bug as a key inside JSX?
