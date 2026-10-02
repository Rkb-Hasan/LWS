# Responding to Events

React lets you attach behavior to user interactions — clicks, typing, submitting a form — by passing functions as special props like `onClick` and `onChange`. This doc walks through what actually happens to those functions, from the moment the component renders to the moment the user actually interacts with it.

---

## 1. A function, passed as a prop

```jsx
function Button() {
  function handleClick() {
    alert("Clicked!");
  }
  return <button onClick={handleClick}>Click me</button>;
}
```

`handleClick` is an ordinary function, defined right inside the component body like any local variable. `onClick={handleClick}` hands that function over as a prop — the exact same slot `className` or `value` would occupy. Its value just happens to be a function reference.

---

## 2. What happens, phase by phase

**Render phase — the function is created, but not called.**

When React calls `Button()`, `handleClick` is (re-)defined in memory, and the JSX transpiles to:
```js
React.createElement("button", { onClick: handleClick }, "Click me")
```
`onClick` is just a prop here. Nothing event-related has happened — React hasn't touched the real DOM, nothing is listening yet. This is purely building the element-object description, same as any other prop.

**Commit phase — React registers the function to be called later.**

When React creates the actual `<button>` DOM node, it notices `onClick` matches the `onXxx` naming convention it watches for, and registers that function as something to call when the matching event occurs. (React doesn't attach a listener to every element individually — it uses one shared listener and figures out which handler to run when something fires. The exact mechanics of that are worth a dedicated pass later; for now, just know registration happens here, during commit.)

**The actual click — a separate moment, later, outside render/commit entirely.**

The user clicks. The browser fires a native click event. React catches it, matches it to `Button`'s `onClick`, and **only now actually calls `handleClick()`** — for the first time, whenever the click happens, which could be seconds or minutes after the component rendered.

```
Render phase:  handleClick (the function itself) becomes the value of the onClick prop — not called
Commit phase:  React registers this function to be called later, on a matching event
(time passes)
Event occurs:  React calls handleClick() for real
```

---

## 3. Pass the function, don't call it

```jsx
<button onClick={handleClick}>   {/* ✅ passing the function reference */}
<button onClick={handleClick()}> {/* ❌ calling it immediately */}
```

Everything inside `{}` is a JavaScript expression, evaluated immediately during render (this is the same curly-brace rule from the JSX notes — `{}` just means "evaluate this as JS right now").

- `handleClick` → evaluating an identifier means "look up its current value" → the function itself. No call happens. This gets stored as the prop value, ready to be called later.
- `handleClick()` → this expression **runs the function right now**, during render. Whatever it *returns* (here, `undefined`, since `handleClick` only calls `alert`) becomes the actual prop value. You'd end up with `onClick={undefined}` — the alert fires once immediately while rendering (a side-effect-during-render problem, same category of mistake as in the Pure Components notes), and clicking the button afterward does nothing at all, because there's no function left sitting there to call.

**The rule:** pass the function itself when you want it to run later, in response to an event. Only add `()` if you specifically want it to run immediately during render — which is almost never what an event handler needs.

---

## 4. Inline event handlers — when you need extra information

Sometimes a handler needs something that isn't known until this specific render — like which item in a list was clicked.

```jsx
function TodoList({ items, onDelete }) {
  return (
    <ul>
      {items.map(item => (
        <li key={item.id}>
          {item.text}
          <button onClick={() => onDelete(item.id)}>Delete</button>
        </li>
      ))}
    </ul>
  );
}
```

`onDelete` expects an `id` argument. Two tempting-but-wrong options:
- `onClick={onDelete(item.id)}` — calls it immediately during render (violates "pass, don't call")
- `onClick={onDelete}` — passes it correctly, but clicking would call it with the raw browser event object, not `item.id`

The fix: wrap the real call in a new, inline arrow function — `() => onDelete(item.id)`. This arrow function is itself a valid function, **created** during render but not **executed** during render. It gets passed as the prop (satisfying "pass, don't call"), and only runs when actually clicked — at which point it calls `onDelete(item.id)`, with the correct `id` already captured via closure.

**Worth knowing:** writing the arrow function directly inside `.map()` means a **new function gets created every render** — one fresh closure per item, each time. This is completely fine for most apps and is the standard pattern. It only becomes a performance concern once you get into optimization tools like `useCallback`/`React.memo` — deliberately out of scope for now, just flagging why the trade-off exists.

---

## 5. Passing event handlers down as props

```jsx
function Button({ onClick, label }) {
  return <button onClick={onClick}>{label}</button>;
}

function Toolbar() {
  function handleSave() {
    console.log("Saving...");
  }
  return <Button onClick={handleSave} label="Save" />;
}
```

`Button` has no idea what happens when it's clicked — it just calls whatever function it was handed. `Toolbar` decides the actual behavior.

**Why this is useful:**
- **Reusability** — the same `Button` works anywhere, with completely different behavior each time, just by passing a different function in
- **Keeping logic where the data lives** — the exact same "lifting state up" pattern from before, applied to behavior instead of data. If a click needs to update state that lives in a parent, the parent is the only place with access to its own `setState` — so it defines the function and hands it down for the child to call
- **Separation of concerns** — `Button` only handles *how it looks and that it's clickable*; the parent handles *what clicking actually means*

---

## 6. Are event handlers really just props?

Yes — there's no separate "event handler" category inside React. `onClick`, `onChange`, `onSubmit` are **ordinary props**, following a naming convention (`onXxx`) React specifically watches for during commit, to decide "register this as something to call on a matching event" instead of treating it as a regular DOM attribute. Everything already known about props still applies in full: they flow parent → child only, a fresh function reference can be passed on each render, and a child can receive one and simply call it without knowing (or caring) where it came from.

---

## Q&A summary (for quick revision)

**Q: What happens to an event handler function during the render phase?**
A: It's just created/evaluated as the value of a prop like `onClick` — not called. Nothing is registered with the DOM yet.

**Q: When does React actually register the handler to be called later?**
A: During the commit phase, when the real DOM node is created — React notices the `onXxx`-named prop and sets it up to be called when a matching event occurs.

**Q: Why must a handler be passed, not called (`onClick={fn}` vs `onClick={fn()}`)?**
A: `{}` evaluates as a JS expression immediately, during render. `fn()` runs the function right then and uses its *return value* as the prop — not the function itself — so nothing is left to call later when the actual click happens.

**Q: How do `{}` curly braces relate to this?**
A: Same rule as everywhere else in JSX — `{}` evaluates whatever's inside as a JS expression right away. For `onClick={handleClick}`, that expression is just looking up the variable, which evaluates to the function reference itself (no call happens, since there's no `()`).

**Q: Why use an inline arrow function like `onClick={() => onDelete(item.id)}`?**
A: To pass extra, render-specific information (like a list item's id) to the handler, while still satisfying "pass a function, don't call it" — the arrow function is created now but only executed later, on click.

**Q: Why pass event handlers down from a parent as props?**
A: So the logic for *what happens* stays wherever the relevant state/data lives (often a parent), while the child stays reusable and only responsible for triggering the call.

**Q: Are event handlers a special React concept, separate from props?**
A: No — they're ordinary props. React just watches for the `onXxx` naming convention during commit to know which props to treat as event registrations instead of plain DOM attributes.

---

## Still fuzzy / to revisit later
- **Event delegation** — exactly how React uses one shared listener instead of attaching one per element, and how it figures out which handler to call (deliberately parked for its own dedicated pass)
- `useCallback` / `React.memo` — relevant to the "new function every render" trade-off mentioned with inline handlers, not introduced yet

---

## One-line takeaway
An event handler is just a prop whose value happens to be a function: during render it's merely evaluated and stored (never called), during commit React registers it against the matching `onXxx` convention, and only the actual user event triggers the real call later — which is exactly why handlers must be *passed*, not *invoked*, and why an inline arrow function is the standard way to sneak extra render-specific data into that eventual call.
