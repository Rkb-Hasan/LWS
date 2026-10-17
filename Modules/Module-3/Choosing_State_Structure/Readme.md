# Choosing the State Structure

> Good state is **minimal and consistent**. Store the least information that can describe the screen, group what changes together, and calculate everything else during render. Five principles get you there.

---

## The five principles at a glance

1. **Group related state** that changes together
2. **Avoid contradictions** in state
3. **Avoid redundant state**: calculate it instead
4. **Avoid duplication** in state
5. **Avoid deeply nested state**: keep it flat

The first three share one goal: no variable should be able to disagree with another. The last two are about how the data is shaped so updates stay simple.

---

## 1. Group related state

If two variables always change together, they are really one piece of state.

### Real-life fix: a signup form

```jsx
// scattered: one setter per field, and a new line for every new field
const [name, setName] = useState('');
const [email, setEmail] = useState('');
const [phone, setPhone] = useState('');
```

```jsx
// grouped: one object, one handler for every field
const [form, setForm] = useState({ name: '', email: '', phone: '' });

function handleChange(e) {
  setForm({ ...form, [e.target.name]: e.target.value });
}

<input name="name"  value={form.name}  onChange={handleChange} />
<input name="email" value={form.email} onChange={handleChange} />
<input name="phone" value={form.phone} onChange={handleChange} />
```

Grouping also helps when you don't know in advance how many pieces you'll need. Adding a field is one more property, not one more `useState`.

### Common mistakes

**Forgetting that the setter replaces the whole object**

```jsx
const [position, setPosition] = useState({ x: 0, y: 0 });

setPosition({ x: e.clientX });                // y is gone
setPosition({ ...position, x: e.clientX });   // y is kept
```

**Grouping things that don't change together**

If `isMenuOpen` and `cartItems` live in one object, every menu click copies the cart. Group only what changes **together**.

---

## 2. Avoid contradictions in state

When two variables describe the same situation, they can disagree, and nothing in your code complains. The screen just shows something that makes no sense.

### Real-life fix: a Send button

```jsx
const [isSending, setIsSending] = useState(false);
const [isSent, setIsSent] = useState(false);

async function handleSubmit(e) {
  e.preventDefault();
  setIsSending(true);
  await sendMessage(text);
  setIsSent(true);          // forgot: setIsSending(false)
}
```

The message went out, but `isSending` is still `true`. The user sees "Sending…" and "Sent!" together.

Two booleans have four combinations:

| `isSending` | `isSent` | Meaning |
|---|---|---|
| false | false | idle |
| true | false | sending |
| false | true | sent |
| true | true | **contradiction** |

Three rows make sense, and one is impossible. The fix is a single variable that can only hold one value at a time:

```jsx
const [status, setStatus] = useState('typing'); // 'typing' | 'sending' | 'sent'

const isSending = status === 'sending';   // calculated, not stored
const isSent = status === 'sent';

async function handleSubmit(e) {
  e.preventDefault();
  setStatus('sending');
  await sendMessage(text);
  setStatus('sent');                      // one line moves from "sending" to "sent"
}
```

The contradiction is now impossible to create, because a single value can't be two things.

### Common mistakes

**Adding "just one more boolean"**

Every new boolean doubles the number of combinations. Five booleans give 32, and a typical component has about five real looks.

**Forgetting to reset the other flag**

That is the bug in the Send button above. A single `status` removes the need to remember.

---

## 3. Avoid redundant state

If a value can be calculated from other state or props, don't store it.

### Real-life fix: a full name

```jsx
// redundant: fullName has to be kept in sync by hand
const [firstName, setFirstName] = useState('');
const [lastName, setLastName] = useState('');
const [fullName, setFullName] = useState('');
```

```jsx
// calculated during render
const [firstName, setFirstName] = useState('');
const [lastName, setLastName] = useState('');
const fullName = firstName + ' ' + lastName;
```

The same applies to totals, counts and filtered lists: `items.length`, `items.reduce(...)`, `items.filter(...)`. They are derived, so they are recalculated from the real state every render and can never go stale.

### Don't mirror props in state

```jsx
function PriceTag({ price }) {
  const [shown, setShown] = useState(price);   // copied once
  return <p>{shown}</p>;
}
```

`useState` uses its initial value on the **first render only**. Later renders ignore that argument. When the parent changes `price` from 100 to 120, the child still shows 100.

The fix is to use the prop directly:

```jsx
function PriceTag({ price }) {
  return <p>{price}</p>;
}
```

Copying a prop is fine only when you really want just a **starting value** that the child will change on its own. Then name the prop to say so:

```jsx
function QuantityInput({ initialQuantity }) {
  const [quantity, setQuantity] = useState(initialQuantity);
  ...
}
```

### Common mistakes

- Storing `isEmpty`, `total` or `fullName` in state
- Copying a prop into state and wondering why it stops updating
- Using `useEffect` to keep a calculated value in sync (a calculation during render is simpler and can't lag behind)

---

## 4. Avoid duplication in state

The same piece of information must not live in two places. When one copy changes, the other doesn't know.

### Real-life fix: a product list with a detail panel

```jsx
const [products, setProducts] = useState([
  { id: 1, name: 'Pen' },
  { id: 2, name: 'Book' },
]);
const [selected, setSelected] = useState(products[0]);   // the whole object
```

The name `'Pen'` now lives in **two places**: inside `products` and inside `selected`. The admin renames the product:

```jsx
setProducts(products.map(p => p.id === 1 ? { ...p, name: 'Pencil' } : p));
```

The list says `'Pencil'`, and the detail panel still says `'Pen'`. The fix is to store only the **id** and look the object up when rendering:

```jsx
const [selectedId, setSelectedId] = useState(1);

const selected = products.find(p => p.id === selectedId);
```

Now the name exists in one place. After the rename, the panel shows `'Pencil'` automatically.

### "But the lookup costs something"

It does, and it is tiny. `find` over 100 products takes a fraction of a millisecond, and React is already re-running your component on every render. The duplicated version isn't cheaper either, because it needs its own `find` to get the new object for `selected`.

The real cost of duplication is **every place that edits or deletes a product has to remember to update `selected` too**. Forget one, and the screen is wrong. Here is a real case: the admin deletes the product open in the panel. With the duplicated version, the panel keeps showing a product that no longer exists. With the id version, the lookup finds nothing, and you handle that one case in one place.

A fast wrong screen is worse than a slightly slower correct one. (If a list ever grows large enough for `find` to matter, store items in an object keyed by id.)

### Common mistakes

- Storing a whole selected object next to the list it came from
- Keeping the same item in two arrays (for example "all items" and "checked items") instead of one list plus an id array
- Updating the list and forgetting the copy

---

## 5. Avoid deeply nested state

Deeply nested state is awkward to update, because every level on the path to the change has to be copied.

### Real-life fix: a folder tree or comment thread

```jsx
// nested: renaming something deep means copying every level above it
const [tree, setTree] = useState({
  id: 0,
  title: 'Root',
  children: [
    { id: 1, title: 'Documents', children: [
      { id: 2, title: 'Invoices', children: [] },
    ]},
  ],
});
```

Renaming "Invoices" requires rebuilding `tree`, then `Documents`, then `Invoices`, and each rebuild is a spread. It is easy to get wrong and hard to read.

Flatten it into a table, where every item sits on the same level and points to its children by id:

```jsx
const [tree, setTree] = useState({
  0: { id: 0, title: 'Root',      childIds: [1] },
  1: { id: 1, title: 'Documents', childIds: [2] },
  2: { id: 2, title: 'Invoices',  childIds: [] },
});

function handleRename(id, title) {
  setTree({ ...tree, [id]: { ...tree[id], title } });   // one level, no matter how deep
}
```

A rename is the same one-line update whether the item is at depth 1 or depth 10. Deleting works the same way: remove the id from its parent's `childIds`, and the item becomes unreachable.

If the data arrives nested from a server and you can't change its shape, a library like Immer lets you write the update as if you were mutating, and it handles the copying.

### Common mistakes

- Spreading only the top level and mutating something deeper (the old snapshot gets corrupted too)
- Keeping a copy of a child object inside its parent while it also lives in a list (this is duplication again)
- Nesting "because the data looks like a tree" even though updates happen to single nodes

---

## A quick diagnosis

When state feels hard to update, ask which rule you broke:

- Two variables that always change together? **Group them.**
- Can two variables be in an impossible combination? **Merge into one.**
- Can this value be calculated from something else? **Delete it from state.**
- Is the same data stored in two places? **Store an id instead.**
- Does a small change need copies of five levels? **Flatten.**

---

## Quick recall

- Group state that changes together, and remember the setter replaces the whole object, so spread it.
- Two variables describing one situation can contradict each other. Use a single `status` instead.
- Calculate derived values during render (`fullName`, `total`, `isSent`). Don't store them.
- `useState(price)` reads the prop once, on the first render. Don't mirror props in state.
- Store ids, not copies of objects, and look the object up when rendering.
- The lookup is cheap, and a wrong screen is expensive.
- Keep state flat, with items pointing to each other by id.

---

## Self-check questions

1. Why does `setPosition({ x: e.clientX })` lose `y`, and how do you keep it?
2. How many combinations do two booleans have, and which one is a contradiction in the Send button?
3. What single variable replaces `isSending` and `isSent`, and where do `isSending` and `isSent` go?
4. Why does `useState(price)` not update when the parent changes `price`? When is copying a prop acceptable?
5. After renaming a product from `'Pen'` to `'Pencil'`, why does the detail panel still show `'Pen'` in the duplicated version?
6. What happens to the detail panel in each version when the selected product is deleted?
7. Why is the `find` lookup not a good reason to duplicate state?
8. Why is renaming a deeply nested item hard, and how does a flat structure fix it?
9. A component has `isLoading`, `isError`, `isSuccess` and `data` as four state variables. Which principles does it risk breaking?
