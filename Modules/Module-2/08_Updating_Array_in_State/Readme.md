# Updating Arrays in State

> Arrays in state are read-only, just like objects. To change one, build a **new array** with the change in it and hand that to the setter.

---

## 1. Why mutating methods are the problem

React decides whether state changed by asking `Object.is`: is this the **same array** (same reference)? A method that edits the array in place keeps the same reference, so React sees nothing new.

```jsx
const [list, setList] = useState(["Apple", "Mango"]);

list.push("Banana");        // edits the existing array
setList(list);              // same reference → no render
```

There is a second problem. Old snapshots still point at that array, so editing it in place changes a "photograph" after it was taken.

### Methods that mutate (avoid on state)

- `push`, `pop`, `shift`, `unshift`
- `splice`
- `sort`, `reverse`
- `arr[i] = x`

### Non-mutating alternatives (use these)

- **add:** `[...list, item]` or `list.concat(item)`
- **add at the start:** `[item, ...list]`
- **remove:** `list.filter(...)`
- **replace or transform:** `list.map(...)`
- **sort or reverse:** copy first, `[...list].sort()` (or the newer `toSorted()` and `toReversed()`)
- **insert in the middle:** `[...list.slice(0, i), item, ...list.slice(i)]`

One easy mix-up: `slice` copies and doesn't mutate, while `splice` removes things in place. They differ by one letter.

---

## 2. The common operations

```jsx
// add
setList([...list, { id: nextId++, name }]);

// remove
setList(list.filter(item => item.id !== id));

// transform every item
setList(list.map(item => ({ ...item, price: item.price * 2 })));

// replace one item
setList(list.map(item => (item.id === id ? { ...item, name: newName } : item)));

// reverse (copy first!)
setList([...list].reverse());

// insert at position i
setList([...list.slice(0, i), newItem, ...list.slice(i)]);
```

Every line builds a new array and passes it to the setter. None of them touches the original.

---

## 3. `id++` vs `++id`

There are two different situations, and the answer is different for each.

### On a state variable: don't

```jsx
const [count, setCount] = useState(0);

setCount(count++);     // TypeError: count is const (and post-increment passes the OLD value)
setCount(++count);     // TypeError for the same reason
setCount(count + 1);   // right
```

If it were declared with `let`, `count++` would hand the old value to the setter and change nothing, while `++count` would "work" but edit the snapshot variable itself, which breaks the promise that state never changes inside a render. The rule: calculate a new value with `count + 1`, and never increment the state variable.

### On an id counter outside the component: fine

```jsx
let nextId = 0;            // not state: an ordinary variable outside the component

function handleAdd() {
  setArtists([...artists, { id: nextId++, name }]);
}
```

The only difference between the two forms is the number you get back:

- `nextId++` gives the current value, then increments. The first id is `0`.
- `++nextId` increments first, then gives the result. The first id is `1`.

Both give unique ids, so choose the start you like. It's safe because the counter isn't state and the increment happens in a handler. Don't do it inside an updater function or the render body: React can run those twice (Strict Mode), and you'd skip ids. In real apps, ids usually come from a server or `crypto.randomUUID()`.

---

## 4. What `filter` and `map` do under the hood

Neither one touches the original array. Here are plain-JavaScript models:

```js
function filter(arr, test) {
  const result = [];                    // brand-new array
  for (const item of arr) {
    if (test(item)) result.push(item);  // same references, not copies
  }
  return result;
}

function map(arr, fn) {
  const result = [];
  for (const item of arr) {
    result.push(fn(item));              // whatever fn returns goes in
  }
  return result;
}
```

Both use `push`, but on the `result` array they just created. That's local mutation, which is fine.

The consequence: **the outer array is new, but the items inside are shared.**

```jsx
const next = list.filter(a => a.id !== 2);
next[0] === list[0];      // true: same object, not a copy
```

For `map`, items you return unchanged are shared, and items you replace with a new object are new:

```jsx
list.map(item => (item.id === 2 ? { ...item, done: true } : item));
//                                 ^ new object          ^ same reference
```

---

## 5. State in the `createElement` scene

JSX is a shortcut for function calls. This:

```jsx
function List() {
  const [list, setList] = useState([{ id: 1, name: "Apple" }, { id: 2, name: "Mango" }]);
  return <ul>{list.map(item => <li key={item.id}>{item.name}</li>)}</ul>;
}
```

becomes roughly this (the exact output depends on your build tool):

```js
React.createElement("ul", null,
  list.map(item => React.createElement("li", { key: item.id }, item.name))
);
```

Each `createElement` call returns a plain object, roughly `{ type: "li", key: "1", props: { children: "Apple" } }`. Three things follow:

1. **State is not inside the elements.** State stays on the shelf. Elements carry only the *values* read during this render, like the string `"Apple"`. That's why the returned JSX is a photograph of that moment.
2. **`createElement` runs in the render phase**, every render, once per item. Work inside it must be pure: no mutating state, no pushing into outside arrays.
3. **React diffs these plain objects.** On the next render a fresh set of elements is created, and React compares them with the previous set by `type` and `key`. This is why list items need a stable `key`.

---

## 6. One click through all three phases

You click a delete button on item 2.

**Trigger (your handler runs, in the old render)**

```jsx
function handleDelete(id) {
  setList(list.filter(a => a.id !== id));
}
```

- The `filter` test (`a.id !== id`) runs **now**, once per item, using this render's snapshot. The old array is untouched.
- It returns a new array. The setter receives that finished array: a plain value resolved at call time, so React queues "replace with newArray" and schedules a render.

**Render (the next render, at the `useState` line)**

- `useState` processes the queue and returns the **new array**.
- Your component runs `list.map(item => <li ...>)`. This is a *different* `map` from the one in the handler: the handler's builds the next state, and this one builds the UI description.
- It calls `createElement` once per remaining item, producing a new element tree.

**Commit**

- React compares the new elements with the old ones by key. Item 2's `<li>` is missing, so React removes that one DOM node. Every other `<li>` is untouched.

Toggling works the same way. Only the handler step differs (it uses `map` and returns a new object for one item), and the commit then touches just that `<li>`.

---

## 7. Updating an object inside an array

Two levels must be new here: the array and the changed item.

```jsx
function handleToggle(id) {
  setList(
    list.map(item =>
      item.id === id
        ? { ...item, done: !item.done }   // new object for the changed item
        : item                             // same reference for the rest
    )
  );
}
```

### The trap

```jsx
const copy = [...list];        // a new array...
copy[0].done = true;           // ...but copy[0] is the SAME object as list[0]
setList(copy);                 // the old snapshot's item got edited too
```

Copying an array is shallow, just like spreading an object. The items are shared, so the old array's item was mutated even though the array is new. The `map` plus spread version avoids this.

### How many things are new? (a list of 100, toggle one)

Three layers, three different answers:

- **State layer:** 2 new objects (the array and the toggled item). The other 99 items are the very same objects, reused.
- **Element layer (render):** all 100 `<li>` elements are rebuilt. This is cheap, plain-object work.
- **DOM layer (commit):** 1 `<li>` is touched, because React diffs the elements and finds one difference.

The cheap work is done widely, and the expensive work is kept as small as possible.

If the data is deeply nested, Immer lets you write `draft.push(item)` or `draft[0].done = true` and handles the copying for you.

---

## 8. Common mistakes

**Mutating, then setting the same array**

```jsx
list.push(item);
setList(list);                       // same reference, no render
```

**Mutating an item inside a copied array**

```jsx
const copy = [...list];
copy[0].done = true;                 // shared object, so the old snapshot changes too
setList(copy);
```

**Sorting or reversing state directly**

```jsx
setList(list.reverse());             // reverse edits in place and returns the same array
setList([...list].reverse());        // right: copy first
```

**Mutating, then spreading to fake a new array**

```jsx
list[i].done = !list[i].done;        // edits the shared item object
setList([...list]);                  // new array, but the damage is done
```

The screen may look right, but the old render's snapshot now sees the change too, and any memoized child comparing item references will think nothing changed.

**Incrementing a state variable**

```jsx
setCount(count++);                   // wrong; use count + 1
```

**Using `splice` when you meant `slice`**

```jsx
list.splice(1, 1);                   // mutates state
list.slice(1);                       // a copy, from index 1
```

---

## Quick recall

- Mutating methods keep the same array reference, so React sees no change, and they corrupt old snapshots.
- Use `[...list, item]`, `filter`, `map`, `slice` and `concat`. Copy before `sort` or `reverse`.
- Never increment a state variable (`count++`). An outside counter like `nextId++` is fine in a handler.
- `filter` and `map` build a new outer array. Unchanged items are shared references.
- The handler's `filter` or `map` runs at call time and builds the next state. The `map` in your JSX runs in the render phase and builds the UI.
- Elements are plain objects holding the values read in this render. State stays on the shelf.
- To update an item inside an array, use `map` and return a new object (via spread) for that one item.
- Toggling one of 100 items: 2 new objects in state, 100 rebuilt elements, 1 DOM node touched.

---

## Self-check questions

1. Why does `list.push(item); setList(list);` not update the screen?
2. Name three array methods that mutate and a non-mutating replacement for each.
3. Why is `setCount(count++)` wrong, and why is `{ id: nextId++ }` with an outside counter fine?
4. After `list.filter(...)`, are the remaining items copies or the same objects as before?
5. What are the two different `map` calls in a delete or toggle flow, and in which phase does each run?
6. Where is state stored: in the elements `createElement` returns, or somewhere else?
7. Why does `const copy = [...list]; copy[0].done = true;` still mutate the original data?
8. Toggling one item in a list of 100 with `map` plus spread: how many objects are new in state, how many elements are rebuilt, and how many DOM nodes are touched?
9. Someone writes `list[i].done = !list[i].done; setList([...list]);`. It looks correct on screen. What is still wrong with it?
