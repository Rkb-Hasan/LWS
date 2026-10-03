# Updating Objects in State

> State can hold objects, but you must treat them as read-only. To change one, don't edit it. Build a new object with the change in it, and hand that to the setter.

---

## 1. What mutation is, and why React misses it

**Mutation** means changing an object in place:

```jsx
const [person, setPerson] = useState({ name: "Rokibul", city: "Dhaka" });

person.city = "Chittagong";     // mutation: the same object, edited
setPerson(person);              // same object handed back
```

You might expect the screen to update. It doesn't. Here's why.

The data in memory **did** change. What React can't tell is that it changed. To decide whether state is new, React compares the new value with the old one using `Object.is`, and for objects that only asks one question: **is it the same object (same reference)?**

```
old state ──┐
            ├── same object → "nothing new" → no render
new state ──┘
```

The state variable already holds the edited data, but React concludes there's nothing to do, so the component isn't re-rendered. It gets stranger: if some other update triggers a render later, the mutated data suddenly shows up, which is why this bug is so confusing.

**The fix: give React a different object.**

```jsx
setPerson({ ...person, city: "Chittagong" });   // a new object, so React sees the change
```

---

## 2. Copying with spread

The spread syntax `...` copies all the properties of an object into a new one. Later properties override earlier ones.

```jsx
const person = { firstName: "Rokibul", lastName: "Islam", city: "Dhaka" };

setPerson({
  ...person,             // copy everything
  city: "Chittagong",    // then override city
});
```

Order matters. If you put the override first, the spread would overwrite it:

```jsx
setPerson({ city: "Chittagong", ...person });   // wrong: the old city wins
```

---

## 3. Shallow copy vs deep copy

Spread is a **shallow copy**. It copies one level only. For nested objects, what gets copied is the **reference**, not the nested data.

```jsx
const person = { name: "Rokibul", address: { city: "Dhaka", zip: "1207" } };
const copy = { ...person };

copy.address === person.address;     // true: the nested object is shared
```

That sharing creates a trap:

```jsx
const copy = { ...person };
copy.address.city = "Chittagong";    // also changes person.address.city!
```

You edited the shared nested object, so you've mutated the original through the copy.

A **deep copy** duplicates every level, for example `structuredClone(person)`. It's safe, but it copies everything even when you only changed one field, so it's heavier than usually needed.

The usual approach is neither of those. Copy only the levels along the path to the value you're changing.

---

## 4. Updating a nested object

```jsx
setPerson({
  ...person,
  address: {
    ...person.address,       // copy the address level
    city: "Chittagong",      // change one value in it
  },
});
```

Each level that contains the changed value gets a new object: `person` and `address`.

```
           old                           new
     ┌──────────────┐             ┌──────────────┐
     │ person       │             │ person       │   ← new object
     │  name ───────┼──┐       ┌──┼─ name        │
     │  address ────┼─┐│       │  │  address ────┼─┐
     └──────────────┘ ││       │  └──────────────┘ │
                      ││       │                   │
     ┌──────────────┐ ││       │  ┌──────────────┐ │
     │ address      │◄┘│       │  │ address      │◄┘   ← new object
     │  city: Dhaka │  │       │  │  city: Chittagong
     │  zip ────────┼──┼───┐   │  │  zip ────────┼──┐
     └──────────────┘  │   │   │  └──────────────┘  │
                       └─► "Rokibul" ◄──────────────┘ (shared)
                           "1207" is shared the same way
```

In words:

- **New:** the `person` object, the `address` object, and the string `"Chittagong"`.
- **Shared:** every value that is not on the path to the change (`"Rokibul"`, `"1207"`, and any other nested objects).
- **Old objects:** left completely untouched. The old address still says `"Dhaka"`.

```jsx
old === next                              // false
old.address === next.address              // false
old.name === next.name                    // true (same string)
old.address.zip === next.address.zip      // true
old.address.city                          // still "Dhaka"
```

### Why the containers must be new, not just the city

1. A property lives inside an object. You can't give an object a new property value without changing that object, and that is mutation again. React needs a different object at the top to notice, and components that receive `person.address` as a prop use the same reference check.
2. Old snapshots must stay valid. The previous render's handlers still point at the old objects. If you edited them in place, an old render would suddenly show the new value. The snapshot idea (a render is a photograph) depends on old objects never changing.

Strings and numbers are never mutated in JavaScript. `"Chittagong"` is simply a different value from `"Dhaka"`.

---

## 5. Is making a new object every time expensive?

Much cheaper than it sounds.

- **Creating a small object is among the fastest things JavaScript does.** It is in-memory work, tiny next to the layout and paint work React avoids in the commit phase.
- **Spread copies only the top level.** Nested objects are reused by reference, not duplicated. Only the path to the change is copied. This reuse of unchanged parts is called **structural sharing**.
- **The new reference is what makes React fast.** Because every change produces a new object, React can detect it with one cheap check (same reference or not). If mutation were allowed, React would have to compare every field of every object on every render.

When can copying actually hurt? When one state object holds something huge, like an array of tens of thousands of items copied on every keystroke. Then you'd split the state into smaller pieces, or use Immer. For ordinary form and UI state, you won't feel it.

### What happens to the old object? Is it a memory leak?

JavaScript has a **garbage collector**. An object stays in memory only while something can still reach it. After a new render, the old render's snapshot is dropped, so nothing points to the old object and it is freed automatically.

Copying itself never causes a leak. A leak needs someone to keep holding references, for example:

- pushing every version into an array that grows forever
- a global variable or cache holding old objects
- a timer or listener you never clean up, whose closure captured an old object

In those cases the cause is the holding, not the copying.

---

## 6. Local mutation is fine

Mutation is only dangerous for objects that **already existed** and that other code (earlier snapshots, props, other components) can see. An object you create during this very call is private to you:

```jsx
function handleClick() {
  const next = { ...person };    // brand new, created in this call
  next.city = "Chittagong";      // fine: nobody else holds it yet
  setPerson(next);               // now it becomes the new state
}
```

The rule: never mutate state or props. Mutating something you just created is fine.

---

## 7. One handler for many fields

Instead of one handler per input, give each input a `name` and use a computed property name (the square brackets) to pick the key:

```jsx
function handleChange(e) {
  setPerson({
    ...person,
    [e.target.name]: e.target.value,
  });
}

<input name="firstName" value={person.firstName} onChange={handleChange} />
<input name="lastName"  value={person.lastName}  onChange={handleChange} />
<input name="city"      value={person.city}      onChange={handleChange} />
```

`[e.target.name]` is evaluated to the string, so typing in the `city` input updates the `city` key.

For nested fields, the single handler needs more work (you'd copy the right level), and this is where Immer helps.

---

## 8. Immer: write mutations, get copies

Immer lets you write code that looks like mutation while it produces a correct new object. It hands you a **draft**, records what you change on it, and then builds a new object that copies only the changed path. The structural sharing is the same as above.

```bash
npm install use-immer
```

```jsx
import { useImmer } from "use-immer";

const [person, updatePerson] = useImmer({
  name: "Rokibul",
  address: { city: "Dhaka", zip: "1207" },
});

function handleCity(newCity) {
  updatePerson(draft => {
    draft.address.city = newCity;    // looks like mutation, but the original is untouched
  });
}
```

Compare it with the plain version, which needs spread at every level. Immer pays off with deeply nested state. For shallow state, plain spread is simpler and needs no extra package.

---

## 9. Common mistakes

**Mutating, then setting the same object**

```jsx
person.age = 26;
setPerson(person);                   // same reference, so no render
```

**Forgetting that spread is shallow**

```jsx
const copy = { ...person };
copy.address.city = "X";             // mutates the shared nested object
```

**Putting the override before the spread**

```jsx
setPerson({ city: "X", ...person }); // the old city overwrites your change
```

**Replacing the whole object by accident**

```jsx
setPerson({ city: "Chittagong" });   // name and the rest are gone; there is no merging
```

Unlike class components, `setPerson` replaces the state. It does not merge, so always spread the old object first.

**Building a "copy" with the same reference**

```jsx
const next = person;                 // not a copy, just another name for the same object
next.city = "X";
setPerson(next);
```

---

## Quick recall

- Mutation changes the data but keeps the same reference, and React only checks the reference, so no re-render.
- Treat state objects as read-only. Pass a new object to the setter.
- Spread (`...`) makes a shallow copy: one level, with nested objects shared by reference.
- Update nested values by copying every level along the path to the change.
- A new object each time is cheap (small allocation, shared unchanged parts), and it makes React's change check a single comparison.
- Old objects are garbage-collected once nothing references them. Leaks come from holding references.
- Mutating an object you just created yourself (local mutation) is fine.
- One handler for many fields: `[e.target.name]: e.target.value`.
- Immer lets you write mutating-style code on a draft and produces a proper new object.
- Setters replace state and never merge, so spread the old object first.

---

## Self-check questions

1. Why doesn't `person.city = "X"; setPerson(person);` update the screen, even though the data changed?
2. What exactly does `Object.is` compare when React checks object state?
3. After `setPerson({ ...person, address: { ...person.address, city: "X" } })`, which objects are new and which are shared with the old state?
4. If `address` also had a nested `coords` object and you updated only `city`, is `next.address.coords` new or the same as before? Why?
5. Why is spreading `person` shallow, and what bug does that cause for nested objects?
6. Does creating a new object on every update cause a memory leak? What would?
7. When is mutating an object perfectly fine?
8. How does `[e.target.name]: e.target.value` let one handler serve many inputs?
9. What does Immer do for you, and when would you not bother with it?
