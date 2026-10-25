# Lifting State Up

> Sibling components can't see each other's state. When two components must stay in sync, move the state to their **closest common parent** and pass it down as props, together with handler functions that let children ask for changes. Data flows down, requests flow up, and each piece of state has exactly one owner.

---

## 1. The problem: siblings can't share state

An accordion has several panels, and only one should be open at a time. If each `Panel` keeps its own state, nothing coordinates them:

```jsx
function Panel({ title, children }) {
  const [isActive, setIsActive] = useState(false);   // private to this Panel
  return (
    <section>
      <h3>{title}</h3>
      {isActive ? <p>{children}</p> : <button onClick={() => setIsActive(true)}>Show</button>}
    </section>
  );
}
```

Open one panel and then another, and both stay open. Each panel only knows about itself, and state is private to the component that declares it.

---

## 2. The three steps to lift state

1. **Remove** the state from the child components.
2. **Pass hardcoded data** from the common parent to check that the child works as a plain function of its props.
3. **Add state** to the common parent and pass it down together with the handlers.

### Step 1: remove state from the child

```jsx
function Panel({ title, children, isActive, onShow }) {
  return (
    <section>
      <h3>{title}</h3>
      {isActive ? <p>{children}</p> : <button onClick={onShow}>Show</button>}
    </section>
  );
}
```

`Panel` now has no state. It receives `isActive` (data) and `onShow` (a function) and uses both.

### Step 2: hardcode the data in the parent

```jsx
<Panel title="About" isActive={true}  onShow={() => {}}>...</Panel>
<Panel title="Etymology" isActive={false} onShow={() => {}}>...</Panel>
```

If this looks right, the child is ready.

### Step 3: add the state to the parent

```jsx
export default function Accordion() {
  const [activeIndex, setActiveIndex] = useState(0);
  return (
    <>
      <Panel title="About" isActive={activeIndex === 0} onShow={() => setActiveIndex(0)}>
        About text
      </Panel>
      <Panel title="Etymology" isActive={activeIndex === 1} onShow={() => setActiveIndex(1)}>
        Etymology text
      </Panel>
    </>
  );
}
```

A single number, `activeIndex`, now decides which panel is open. Two panels can't be open at once, because there is only one number.

---

## 3. Under the hood: the accordion as `createElement` calls

JSX is a shortcut for function calls. The accordion above becomes:

```js
function Panel({ title, children, isActive, onShow }) {
  return React.createElement(
    "section", null,
    React.createElement("h3", null, title),
    isActive
      ? React.createElement("p", null, children)
      : React.createElement("button", { onClick: onShow }, "Show")
  );
}

function Accordion() {
  const [activeIndex, setActiveIndex] = React.useState(0);
  return React.createElement(
    React.Fragment, null,
    React.createElement(Panel, {
      title: "About",
      isActive: activeIndex === 0,
      onShow: () => setActiveIndex(0)
    }, "About text"),
    React.createElement(Panel, {
      title: "Etymology",
      isActive: activeIndex === 1,
      onShow: () => setActiveIndex(1)
    }, "Etymology text")
  );
}
```

### What each call returns

`createElement` does **not** call `Panel`. It returns a plain object that describes what you want:

```js
{
  type: Panel,
  props: { title: "About", isActive: true, onShow: f0, children: "About text" }
}
```

Props are a plain object of values. The boolean `isActive` and the function `onShow` are two values in it, and there is no special channel for handlers. React calls `Panel(props)` later, during rendering.

### Where each prop comes from

- `isActive` is calculated in `Accordion`'s render: `activeIndex === 0`. It is a snapshot of the state at this render.
- `onShow` is a function created in `Accordion`'s render. It closes over `Accordion`'s `setActiveIndex`, so when it runs it works with `Accordion`'s state, even though it was called from inside `Panel`.

---

## 4. One click, scene by scene

### Scene 1: first render

`useState(0)` returns `activeIndex = 0`. `Accordion` returns two description objects: the first with `isActive: true`, the second with `isActive: false`. React calls `Panel(props)` for each one:

- First Panel: renders a `section` with an `h3` and a `p`.
- Second Panel: renders a `section` with an `h3` and a `button` whose `onClick` is `onShow`.

React builds the DOM from this.

### Scene 2: the click

You click "Show" on the second panel.

1. The browser calls `onShow`. It is `Accordion`'s function, running from `Panel`'s button.
2. It calls `setActiveIndex(1)`. React queues a re-render of **`Accordion`**, the owner of the state.

`Panel` has no state and doesn't re-render by itself. It just receives new props.

### Scene 3: the re-render

`Accordion` runs again, and `useState` returns `1`. New `createElement` calls produce new objects: `isActive: false` for the first panel, `isActive: true` for the second. The `onShow` functions are brand-new function objects, which is normal because each render creates new ones. React compares the new descriptions with the old ones and finds two differences: the first section's `p` became a `button`, and the second section's `button` became a `p`. Only those two DOM nodes change.

---

## 5. One-way data flow

```
Accordion  (owns activeIndex)
   │   ▲
   │   │  onShow()   ← a request goes up as a function call
   ▼   │
 props: isActive, onShow   ← data goes down as props
   │
 Panel
```

- **Data goes down.** A parent passes values to children through props.
- **Requests go up.** A child can't change the props it received. It can only call a function the parent gave it.

Why can't `Panel` just set `isActive` itself? `isActive` was created in `Accordion`'s `createElement` call. `Panel` only holds a snapshot of it. If `Panel` could overwrite it, the truth would exist in two places, and `Accordion` wouldn't know about the change. That is the duplication and contradiction problem from choosing state structure. One-way flow prevents it by design.

A useful side effect: when something is wrong with a value, you only need to look **upward** to find who owns it.

---

## 6. Controlled vs uncontrolled components

The same words used for inputs apply here. The question is **who holds the value**.

### Uncontrolled: the component keeps its own state

The first `Panel` in section 1 owns `isActive`. Using it is easy (`<Panel title="About">text</Panel>`), but the parent has no say. It can't open a panel from outside, and panels can't coordinate.

### Controlled: the parent holds the state

The `Panel` from section 2 gets `isActive` and `onShow` through props. It needs more wiring, but the parent is fully in control.

### Choosing

- **FAQ page where questions open and close independently and several can be open together:** uncontrolled is enough. Nothing needs to coordinate the panels.
- **Add an "Expand all / Collapse all" button, or "only one open at a time":** the parent must know and set the state, so make the panels controlled.
- **Dropdown menu:** if it only opens and closes by its own button, uncontrolled works. If it must also close when you click outside or when another menu opens, the parent has to control it.

This isn't a strict either-or. A component can be controlled for some things and keep other things local. Component libraries often offer both: a default value for uncontrolled use, and a value plus a change handler for controlled use.

The same logic applies to inputs. `<input value={answer} onChange={...} />` is controlled, because React state holds the value. `<input defaultValue="" />` is uncontrolled, because the browser holds it.

---

## 7. A single source of truth

For each unique piece of state, choose **one component that owns it**. Everyone else reads it through props and never keeps a copy.

- In the accordion, `activeIndex` lives in `Accordion` only. The panels read `isActive` and never store it.
- Lift state to the **closest** common parent that needs it, no higher. Lifting everything to the root makes unrelated parts re-render for no reason.
- The rule doesn't mean "all state in one place". Different pieces of state can have different owners. What matters is that **each piece has exactly one**.

If you find the same information stored in two components, one of them is a copy that will eventually disagree with the other.

---

## 8. Common mistakes

**Calling the setter during render instead of passing a function**

```jsx
<Panel onShow={setActiveIndex(1)}>      // runs on every render: infinite loop
<Panel onShow={() => setActiveIndex(1)}>  // right: a function that runs on click
```

**Copying a prop into the child's state**

```jsx
function Panel({ isActive }) {
  const [active, setActive] = useState(isActive);   // a second copy
}
```

`useState` reads its argument on the first render only, so the copy stops following the parent. This is exactly the duplication problem the lift was meant to fix.

**Trying to change a prop inside the child**

```jsx
function Panel({ isActive }) {
  isActive = true;     // changes only a local variable; the parent never hears about it
}
```

**Lifting state too high**

Putting a panel's state in the app root means every panel change re-renders the whole app. Lift only to the closest common parent.

**Lifting state nobody else needs**

If no sibling or parent needs to know a value, leave it local. Not every piece of state has to be lifted.

**Forgetting the handler**

If `Panel` shows a button with no `onShow`, clicking does nothing. State alone isn't enough. Children need functions to ask for changes.

---

## Quick recall

- State is private to a component. To share it, lift it to the closest common parent.
- Steps: remove state from children, pass hardcoded data, add state to the parent.
- JSX is `createElement`. It returns plain description objects, and React calls the component later.
- Props are a plain object, and handlers are just function values in it.
- The handler passed down runs the **parent's** code, so it updates the parent's state.
- One-way flow: data goes down as props, requests go up as function calls.
- Controlled = the parent holds the state. Uncontrolled = the component holds its own.
- Each unique piece of state has exactly one owner. Don't copy it.
- Lift to the closest common parent, no higher.

---

## Self-check questions

1. Why can two sibling panels both stay open when each has its own `useState`?
2. What are the three steps to lift state up?
3. Does `createElement(Panel, ...)` call `Panel`? What does it return?
4. In the accordion, where does `isActive` come from, and where does `onShow` run when you click?
5. Why does the click cause `Accordion` to re-render and not `Panel`?
6. Why can't `Panel` set `isActive` itself? What would go wrong?
7. What is the difference between a controlled and an uncontrolled `Panel`? Which fits a FAQ page where questions open independently?
8. What is wrong with `onShow={setActiveIndex(1)}`?
9. What does "a single source of truth" mean here, and why does `useState(isActive)` inside `Panel` break it?
10. What goes wrong if you lift state all the way to the app root?
