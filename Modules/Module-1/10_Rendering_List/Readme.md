# React — Rendering Lists

## What this covers
- What a JSX node actually is vs. a real DOM node
- Where an array produced by `.map()` ends up, and why no commas appear on the actual page
- Why lists specifically need a `key`, when other JSX doesn't
- Why index-as-key is risky, and why a freshly-generated key (e.g. `Math.random()`) breaks things entirely
- Keyed Fragments — the list-specific use case for Fragment

---

## 1. JSX node vs. DOM node

```jsx
items.map(n => <li>{n}</li>)
```

This produces an **array of plain JS objects** — the result of `React.createElement("li", ...)` for each item — often called "React elements." These are lightweight descriptions, not real DOM nodes. A real DOM `<li>` only gets created later, during the commit phase (see the Phases README).

---

## 2. Where the array goes, stage by stage

**Setup:**
```jsx
const items = [
  { id: "a1", text: "Milk" },
  { id: "a2", text: "Eggs" },
];

return (
  <ul>
    {items.map(item => <li key={item.id}>{item.text}</li>)}
  </ul>
);
```

**After JSX transpilation:**
```js
React.createElement(
  "ul",
  null,
  items.map(item => React.createElement("li", { key: item.id }, item.text))
)
```

**After `.map()` runs** — a plain array of React elements, staying as one array value (not spread into separate arguments):
```js
[
  { type: "li", key: "a1", props: { children: "Milk" } },
  { type: "li", key: "a2", props: { children: "Eggs" } }
]
```

**Finished React element tree** (end of render phase, still pure JS objects — this is the "Virtual DOM" for this piece of UI):
```js
{
  type: "ul",
  key: null,
  props: {
    children: [
      { type: "li", key: "a1", props: { children: "Milk" } },
      { type: "li", key: "a2", props: { children: "Eggs" } }
    ]
  }
}
```

**Commit phase — React walks the array and processes each item individually:**
```
for each item in children array:
    if it's a React element → create/update the corresponding real DOM node
    append/position it inside the parent real DOM node
```

**Real DOM result:**
```html
<ul>
  <li>Milk</li>
  <li>Eggs</li>
</ul>
```

**Why no commas appear:** React never calls something like `children.join(", ")` on the array — it loops through and handles each item as its own DOM-creation instruction. The comma you'd see from `console.log(array)` is purely a JavaScript console display convention for arrays — it has nothing to do with how React actually consumes or renders that array.

---

## 3. Why lists specifically need a `key`

For **regular, hand-written JSX** (not from `.map()`), React already has a stable way to match old vs. new elements during diffing: **position in the JSX tree itself**. If a component always returns `<div><h1/><p/></div>`, the first child slot is always the `h1` and the second always the `p` — that structural position doesn't shift between renders, so it works as implicit identity.

With a **dynamically generated list**, that positional stability breaks. If you sort, insert, or delete an item, the array's order changes — "index 2" might now correspond to a completely different piece of data than it did last render. Without something else to anchor identity, React can't tell "this is the same item, just moved" apart from "this is a new item, the old one at this position was deleted."

**What `key` actually does in diffing:** when React compares an old children array to a new one, it uses `key` (together with element type) to match which old element corresponds to which new element — instead of assuming "position N old = position N new." A stable, data-tied key (like a database ID) lets React correctly recognize "item with key `42` is still `42`, even though it moved from index 2 to index 0," and just **move** the existing DOM node instead of destroying and recreating it.

**Concrete payoff on reorder:** if the array becomes `[{id:"a2"}, {id:"a1"}]` (swapped), React compares `["a1","a2"]` → `["a2","a1"]` by key, recognizes both items still exist, and moves the two existing real `<li>` nodes rather than tearing them down and rebuilding them.

### Why not index as key?
Index is tied to **position**, not to the item's actual identity. Reordering, inserting, or deleting fools React into thinking items changed when they just moved (or vice versa) — causing wrong DOM patches and, notably, **lost internal state** on stateful list items (e.g. a text input's typed value ending up attached to the wrong row after a reorder).

### Why not generate a key on the fly (e.g. `key={Math.random()}`)?
If the key is different **every single render**, React has no way to recognize "this is the same logical item as last time" — every re-render looks like every item was deleted and a brand-new one created in its place. Consequences:
- The component is fully torn down and remounted every render (any internal state is lost)
- All diffing benefit is defeated — you're back to full reconstruction every time
- Any identity-based transition/animation breaks, since React thinks nothing persisted

A key's entire value comes from being **stable across renders for the same logical item** — generating it fresh each render defeats the one property that makes it useful.

**Good key sources:** a stable field already in the data (database ID, unique slug) — not something derived from position or regenerated per render.

---

## 4. Keyed Fragments — the list-specific Fragment use case

When each item in a list needs to render **multiple sibling elements** (not just one), you can't use the short `<>` Fragment syntax, because a key can only be attached to a real JSX element with an actual opening tag — the shorthand `<>` has no place to attach an attribute. Use the full `<React.Fragment key={...}>` form instead:

```jsx
items.map(item => (
  <React.Fragment key={item.id}>
    <dt>{item.term}</dt>
    <dd>{item.definition}</dd>
  </React.Fragment>
))
```

This groups the `<dt>`/`<dd>` pair for React's/key's purposes without introducing any extra real DOM wrapper element around them. (Full Fragment coverage — including non-list use cases — is in the dedicated Fragment README.)

---

## Q&A Summary (for quick revision)

**Q: What does `.map()` produce when used inside JSX?**
A: An array of React element objects (plain JS objects from `React.createElement`) — not real DOM nodes.

**Q: Why don't commas show up on the page even though the array shows them in `console.log`?**
A: React iterates the array and processes each element individually into its own DOM node — it never stringifies/joins the array. The comma is purely a JS console display artifact for arrays.

**Q: Why do lists need an explicit `key`, but ordinary hand-written JSX doesn't?**
A: Ordinary JSX has stable structural position as implicit identity (same slot every render). A dynamic list's order can change (sort/insert/delete), so position alone can't reliably identify "the same item" across renders — `key` provides that stable identity instead.

**Q: Why is index a risky key?**
A: Index reflects position, not identity. Reordering/inserting/deleting shifts indices, causing React to misattribute state or wrongly patch the DOM.

**Q: Why does generating a key fresh every render (e.g. `Math.random()`) break things?**
A: A key must stay the same across renders for the same logical item for React to recognize it as unchanged. A fresh value every render makes every item look brand-new every time, defeating diffing entirely and remounting everything.

**Q: When do you need `<React.Fragment key={...}>` instead of `<>`?**
A: When each item inside a `.map()` needs to render multiple sibling elements without an extra DOM wrapper — the shorthand `<>` can't take a `key`, so the full `React.Fragment` form is required.

---

## Additional notes worth knowing at this point
- **Keys only need to be unique among siblings** — not globally unique across the whole app. The same key value can reused in a completely different list elsewhere without conflict.
- **Keys are not passed down as a regular prop.** `key` is read by React itself for diffing purposes and won't show up as `props.key` inside the component — if a component needs that value for its own logic, pass it again under a different prop name.
- **Don't derive keys from `Math.random()` or array index inside the render itself** — either pick a stable field from the data, or (if the data genuinely has no stable ID) generate a stable ID once when the data is created, not on every render.

---

## One-line takeaway
`.map()` inside JSX produces an array of lightweight React element objects that React renders by iterating and processing each one individually (never stringifying the array, hence no commas); `key` exists purely to give React stable identity for list items across renders — without it, reordering/inserting/deleting gets misread as items being destroyed and recreated, which is exactly what a fresh-every-render key also causes even for a completely static list.
