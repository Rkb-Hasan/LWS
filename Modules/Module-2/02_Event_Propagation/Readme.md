# Event Delegation & Propagation

This doc has two parts, kept deliberately separate. **Part 1** covers the general, practical ideas: bubbling, capturing, delegation, propagation control, and how event handlers differ from the pure render body. **Part 2** is a focused, step-by-step deep dive into exactly *how* React implements its event system under the hood — read Part 1 first, since the deep dive leans on it.

---

# Part 1 — Propagation, Delegation & Everyday Use

## 1.1 Propagation — the event doesn't just fire where you clicked

When something happens on an element, the event doesn't stay put — it travels through the DOM tree in two possible directions:

- **Capturing phase** — starts at the very top (the document root) and travels **down** toward the clicked element, passing through every ancestor on the way in
- **Bubbling phase** — after reaching the actual clicked element, the event travels back **up**, from that element through every ancestor, all the way to the root

By default, `onClick` (and most `onXxx` props) listen during the **bubbling phase**. If capturing is specifically needed, React provides the `Capture`-suffixed version of any event: `onClickCapture`, `onChangeCapture`, etc.

## 1.2 A concrete example

```jsx
function Button({ onClick, children }) {
  return <button onClick={onClick}>{children}</button>;
}

export default function Toolbar() {
  return (
    <div className="Toolbar" onClick={() => alert("You clicked on the toolbar!")}>
      <Button onClick={(e) => { e.stopPropagation(); alert("Playing!"); }}>
        Play Movie
      </Button>
      <Button onClick={() => alert("Uploading!")}>Upload Image</Button>
    </div>
  );
}
```

Clicking **"Play Movie"** fires the click on the `<button>` first. Because of bubbling, that same click event would *also* reach the `<div className="Toolbar">`'s `onClick` next — **unless something stops it**. That's exactly what `e.stopPropagation()` is doing: it tells the event "don't continue bubbling past this point," so the toolbar's own alert never fires for this particular click.

**Upload Image** has no `stopPropagation()`, so clicking it *would* also trigger the toolbar's alert, right after its own.

## 1.3 Delegation — the practical reason this is efficient

Instead of attaching a separate native listener to every single element that has an `onClick` prop, React attaches **one listener near the app's root**, and relies on the browser's native bubbling to carry every event up to that single point. From there, React works out which of your handler functions should actually run. This is dramatically cheaper than wiring up a native listener per element, especially as an app grows large. (The exact mechanics of *how* React figures out which handlers to call are the subject of Part 2.)

## 1.4 The one exception: `onScroll`

Per React's own docs, `onScroll` specifically **does not bubble** in React, unlike nearly every other event. A scroll happening on a nested element won't propagate up to an ancestor's `onScroll` handler. This is worth remembering precisely because it breaks the general rule everything else follows.

## 1.5 Which function actually receives the event object?

Whichever function is **directly attached to the real, rendered DOM element** is the one that receives the actual event object — because that's the function React itself calls when the native event occurs. Any function further up the chain (like a prop passed down from a parent) only receives whatever that directly-attached function chooses to pass to it.

**Worked example — a real bug this causes:**
```jsx
function Button({ onClick, children }) {
  return (
    <button onClick={() => { console.dir(onClick); onClick(); }}>
      {children}
    </button>
  );
}
```
```jsx
<Button onClick={(e) => { e.stopPropagation(); alert("Playing!"); }}>
  Play Movie
</Button>
```
The inner arrow function — the one actually attached to `<button>` — is the one that receives the real event. But it calls `onClick()` with **no arguments**. So inside `(e) => { e.stopPropagation(); ... }`, `e` is `undefined`, and calling `.stopPropagation()` on it throws a runtime error — that function was simply never handed the event at all.

**Fix:** forward the event explicitly, or just pass the handler straight through without wrapping it:
```jsx
<button onClick={(e) => onClick(e)}>   {/* forwards the real event */}
<button onClick={onClick}>              {/* simplest: no wrapping needed at all */}
```

*(Why exactly the inner function is the one that gets called by React, and how the event got to it in the first place, is covered fully in the deep dive below.)*

## 1.6 SyntheticEvent vs. native event — the short version

React doesn't hand your handler the raw native browser event directly — it wraps it in a **SyntheticEvent**: an object with the same familiar interface (`stopPropagation()`, `preventDefault()`, `target`, etc.), normalized so it behaves consistently across different browsers. For nearly everything you'll write, it behaves exactly like a native event. If the actual underlying native event is ever needed, it's available via `e.nativeEvent`. *(Full mechanism in Part 2.)*

## 1.7 `stopPropagation()` vs. `preventDefault()` — different jobs

- **`stopPropagation()`** — stops the event from continuing to bubble (or capture) to ancestor handlers. *Real use case:* the Toolbar example above — a specific button's action shouldn't also trigger its container's generic click behavior.
- **`preventDefault()`** — stops the browser's own built-in default behavior for that event, completely unrelated to bubbling. *Real use cases:*
  - Stopping a `<form>`'s default full-page-reload submission, to handle it with JS/`fetch` instead
  - Stopping an `<a>` tag from navigating, to handle routing manually (common in single-page apps)
  - Stopping a checkbox from toggling until some condition is confirmed

They solve different problems and are often used together, but aren't interchangeable: `stopPropagation()` controls *who else finds out about this event*; `preventDefault()` controls *what the browser itself was about to do*.

## 1.8 Event handlers are explicitly allowed to have side effects

This connects directly back to the Pure Components notes. A component's render body must stay pure — no side effects — because it might run more than once per visible update (Strict Mode, discarded renders), and must always produce the same output for the same input.

**Event handlers are exempt from this rule on purpose.** A handler only runs in direct response to one real user action, exactly once per interaction — it's never part of React's internal rendering bookkeeping. That's exactly why `fetch()`, `alert()`, mutating things, `console.log()`, etc. are all completely fine inside a handler, while the same code written directly in a component's render body would be a bug.

---

# Part 2 — Synthetic Event Deep Dive

This section is self-contained: a step-by-step account of what actually happens, mechanically, from a real click to your handler running — including what problem each piece solves and how it connects to the next.

## Step 0 — What the browser actually knows about

Start from zero: the browser has **no concept of React** at all. It doesn't know what a component is, what an `onClick` JSX prop means, nothing. The browser only understands real DOM nodes and whatever `addEventListener` calls have actually been made on them. That is the entire vocabulary available.

This raises an immediate question: if 20 different JSX elements across an app each have an `onClick`, does the browser end up with 20 separate native listeners?

**No** — and understanding why is the whole point of this deep dive.

## Step 1 — React attaches exactly one native listener, at the root

When the app mounts, React doesn't walk the tree attaching a listener per element. Instead — lazily, the first time it encounters a given event type anywhere in the tree (say, `click`) — it calls:

```js
rootContainerNode.addEventListener("click", reactInternalDispatcher)
```

Once. On the **root container DOM node** (the element passed to `createRoot`). That's the only native listener React ever registers for that event type, for that whole app.

*(Historical note: in React 16 and earlier, this single listener lived on `document` instead of the root container. React 17 moved it to the root specifically so multiple independent React apps on the same page wouldn't have their event systems interfere with each other.)*

**What problem this solves:** attaching a native listener per element doesn't scale — large apps with thousands of interactive elements would mean thousands of native listeners. One listener, relying on native bubbling to bring every event to it, is dramatically cheaper.

## Step 2 — "Registering" a handler doesn't mean what it sounds like

Here's the part that's easy to assume works one way and actually works another: when React commits a DOM node — say, a `<button onClick={handleClick}>` — it does **not** call `addEventListener` on that specific button. There would be no point; the root listener already covers it via bubbling.

Instead, React does something much simpler: it writes the handler function **directly onto the real DOM node itself**, as a hidden property:

```js
buttonDomNode.__reactProps$abc123 = { onClick: handleClick, children: "..." }
```

This is not a browser feature, not `addEventListener`, not anything exotic — it's **ordinary JavaScript**. A DOM node is just an object, and in JS you can attach any custom property to any object:
```js
const obj = {};
obj.myCustomField = "hello";   // perfectly normal, works on any object, DOM nodes included
```
React just picks a deliberately strange-looking property name (with a near-random suffix) so it won't collide with anything a developer might name themselves.

**What problem this solves:** it gives React a way to associate "what should happen on this specific element" with the element itself, without needing a native listener attached there — turning "registration" into "leaving a note on the object for later," rather than "telling the browser to watch this spot."

**You can see this stash yourself:** right-click an element on the page → *Inspect* → in the Console, type `$0` (devtools' own shorthand for "the currently selected element" — this is a browser devtools feature, unrelated to React or JS itself). Expand it and look for a property starting with `__reactProps$`. Or, more directly:
```js
Object.keys($0).filter(key => key.startsWith('__react'))
```
This is purely an internal implementation detail — genuinely useful for exploring how things work, but never something to read or rely on in real application code, since the exact property name/approach can change between React versions without warning.

## Step 3 — Tracing one real click, start to finish

Say the user clicks a deeply nested `<button>` inside several wrapper `<div>`s.

1. **The browser fires a real, native click event**, with zero awareness of React — starting at the actual `<button>` and, as completely ordinary browser behavior (nothing React has done yet), **natively bubbling up through the real DOM tree**: button → its parent div → ... → eventually reaching the root container.

2. **React's one root listener catches it.** This is the only moment React gets involved — everything before this step was 100% native browser behavior, unrelated to React.

3. **React reads `event.target`** — the actual DOM node that was clicked — and looks up that node's stashed `__reactProps$...` property to find whatever handler was written there.

4. **React reconstructs the ancestor chain itself**, internally — not by relying on native bubbling a second time, but by walking its own internal tree representation (the Fiber tree — React's internal model of the component tree) upward from that node, collecting every ancestor's stashed handler for this same event type along the way. This is how a click on the inner `Button` also finds `Toolbar`'s `onClick`, even though only the root container ever had a real native listener.

5. **React builds one SyntheticEvent object**, wrapping the real native event in a normalized, cross-browser-consistent interface, and starts calling the collected handlers itself, in its own JavaScript loop — simulating capture phase (top-down) then bubble phase (bottom-up) using the ancestor list it just built, not the browser's native mechanism again.

6. **At each call, React checks: did this handler call `.stopPropagation()` on the SyntheticEvent?** If so, React's own loop simply **stops iterating further** through its collected list of ancestor handlers — this is React choosing not to continue, not the browser halting something natively (though React's implementation also takes care to prevent the underlying native propagation from continuing too, so the observed *behavior* matches what native `stopPropagation()` would do).

**Why build the whole system this way:**
- One listener instead of potentially thousands — far cheaper at any real app scale
- Elements added to the DOM later (via a re-render) are automatically covered — nothing new needs to be attached to them individually, since the listener was never on the element to begin with
- SyntheticEvent gives a consistent, normalized interface regardless of underlying browser differences

## Step 4 — Revisiting the earlier bug, now with the full mechanism

```jsx
<button onClick={() => { console.dir(onClick); onClick(); }}>
```

Now the bug from Part 1 is fully explainable: **this inner arrow function is the one stashed on the real `<button>` DOM node** — it's the exact function React's dispatcher looks up and calls in step 3 above, and it's the one that receives the SyntheticEvent as its argument, because React always passes the event to whatever function it's actually invoking.

But this function calls `onClick()` — the prop from the parent — with **no arguments**. `onClick` was never attached to any real DOM node itself, so it was never given an event by React directly; it only ever receives what the inner function explicitly hands it. Since nothing was handed over, `e` inside that outer function is `undefined`.

## A real-world side note from exploring this: function names in devtools

While inspecting a stashed handler in the console, a function might log as something generic like `t1` instead of its real name (e.g. `handleClick`). This isn't part of React's event system — it's a side effect of build tooling. Specifically, a compiler step like the **React Compiler** (used via a Babel plugin, e.g. `reactCompilerPreset()`) can rewrite parts of a component to auto-memoize values, generating its own internal temporary variables (`t0`, `t1`, `t2`, ...) along the way. Since a function's `.name` is inferred from the variable it's assigned to at creation time, a handler reassigned into one of these compiler-generated temporaries picks up that generic name when logged — purely cosmetic, the function still behaves identically.

---

## Q&A summary (for quick revision)

**Q: What's the difference between capturing and bubbling?**
A: Capturing travels top-down from the root to the target, before the target is reached. Bubbling travels bottom-up from the target back to the root, afterward. `onClick` listens during bubbling by default; `onClickCapture` listens during capturing.

**Q: Which event does NOT bubble in React, unlike almost everything else?**
A: `onScroll`.

**Q: Which function receives the actual event object — the one on the DOM element, or a prop passed down from a parent?**
A: Whichever function is directly attached to the real DOM element. A function merely passed down as a prop only gets what that directly-attached function explicitly forwards to it.

**Q: How many native event listeners does React actually attach for, say, a hundred buttons with `onClick`?**
A: One — attached once, lazily, on the root container, regardless of how many elements have that event type.

**Q: If React only attaches one native listener, how does it know which specific function to call for a given click?**
A: It reads `event.target` (the actual clicked DOM node), looks up a hidden stashed property (`__reactProps$...`) React wrote onto that node during commit, and finds the handler there. It then walks its own internal tree upward to find ancestor handlers too.

**Q: What is a SyntheticEvent?**
A: A cross-browser-normalized wrapper React creates around the real native event, given to handlers instead of the raw native event. The real one is still reachable via `e.nativeEvent`.

**Q: Does `e.stopPropagation()` on a SyntheticEvent directly command the browser to stop propagating?**
A: Not directly — React intercepts the call as a signal to stop iterating through its own internally collected list of ancestor handlers, while also ensuring native propagation doesn't continue either, so the observed effect matches native behavior.

**Q: Why are side effects allowed in event handlers but not in a component's render body?**
A: Render can run more than once per visible update (Strict Mode, discarded renders) and must be pure. A handler runs exactly once per real user action and isn't part of React's internal rendering bookkeeping, so side effects there are safe and expected.

---

## Still fuzzy / to revisit later
- The exact internal structure of the Fiber tree React walks to reconstruct the ancestor chain (mentioned, not yet covered in depth)
- `preventDefault()` combined with custom form-handling logic in a real controlled-form scenario — conceptually covered, not yet built hands-on

---

## One-line takeaway
The browser only ever natively bubbles a real event up to the one listener React attaches at the root; everything that looks like "React handling events on individual elements" is actually React reading a handler it stashed directly on the clicked DOM node, then re-simulating the capture/bubble path itself using its own internal tree — which is exactly why passing the event along manually (as in the `onClick()` bug) matters, and exactly why `stopPropagation()` on a SyntheticEvent is React choosing to stop its own internal loop, not the browser halting something on its own.
