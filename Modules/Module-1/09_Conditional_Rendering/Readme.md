# React Conditional Rendering — Revision Notes

## What this covers
- Writing JSX declaratively (and what that actually means)
- DRY as it applies to conditional markup
- Ternary expressions inside JSX
- Using `if`/`else` with a variable to decide what gets rendered
- Logical `&&`, `||`, and `??` for conditional rendering — and how their fallback behaviors actually differ

---

## 1. Declarative JSX

JSX should be written so that **looking at the markup alone tells you what will render**, without having to mentally trace through a sequence of DOM-mutation steps. That's what "declarative" means here: you describe *what* the UI should look like for a given state/condition, rather than writing imperative step-by-step instructions for *how* to change the DOM.

## 2. DRY (Don't Repeat Yourself)

Applies to conditional markup the same way it applies to any code: if two branches of a condition share most of their structure, that shared structure shouldn't be duplicated across both branches — pull out what's common, and only vary the part that actually differs.

---

## 3. Ternary inside JSX

Since JSX only accepts **expressions** inside `{}` (not statements — covered in the JSX notes), and a ternary is an expression that evaluates to a value, it's a natural fit for inline conditional rendering:

```jsx
{isLoggedIn ? <Dashboard /> : <Login />}
```

This works directly inside JSX precisely because `? :` always produces a value — unlike an `if` statement, which doesn't.

## 4. `if`/`else` with a variable

When the logic is more involved than a simple ternary can comfortably express, run the `if`/`else` as a normal JavaScript statement *outside* JSX, assign the result to a variable, then insert that variable inside JSX:

```jsx
let content;

if (isLoggedIn) {
  content = <Dashboard />;
} else {
  content = <Login />;
}

return <div>{content}</div>;
```

The `if`/`else` statement runs in plain JavaScript; JSX never sees the statement itself — it only sees the resulting value stored in `content`, which is a valid expression to insert.

---

## 5. Logical operators for conditional rendering — `&&`, `||`, `??`

None of these are strictly "boolean operators" — they're **value-returning** operators that short-circuit and return one of their actual operands (not necessarily `true`/`false`):

- `&&` → returns the **left** side if it's falsy, otherwise returns the **right** side
- `||` → returns the **left** side if it's truthy, otherwise returns the **right** side
- `??` → returns the **left** side if it's *not* `null`/`undefined`, otherwise returns the **right** side

### The `&&` pitfall — numbers on the left

```jsx
{messageCount && <p>New messages</p>}
```

If `messageCount` is `0`, `&&` sees a falsy left side and **returns that left side as-is** — so the expression evaluates to `0`, and React dutifully renders the literal `0` on screen. The intent was "render nothing when there are no messages," but `&&` doesn't convert its return value to a boolean — it only uses truthy/falsy for the *decision*, not the *output*.

**Fix:** force the left side into an actual boolean before the `&&`:
```jsx
{messageCount > 0 && <p>New messages</p>}
```

### Does `||` have the same problem?

No — but it has a *different* one. `||` falls through to the right side on falsy, meaning:
```jsx
{someValue || <p>Fallback</p>}
```
If `someValue` is `0`, `||` moves on and renders `<p>Fallback</p>` — no stray `0` shown. But `||` treats `0`, `""`, `false`, and `NaN` as "absent" — which is a problem when one of those is actually a **legitimate value** you wanted to display:
```jsx
<p>{count || "No items"}</p>
```
If `count` is legitimately `0`, this incorrectly shows `"No items"` instead of `0`.

### Does `??` have either problem?

No — `??` only falls through when the left side is **specifically `null` or `undefined`**, not for any other falsy value:
```jsx
{count ?? "No items"}
```
If `count` is `0`, `??` correctly returns `0` as-is — `0` isn't nullish, so no unwanted fallback occurs.

### Summary — different definitions of "absent"

| Operator | Falls to right side when... | Common pitfall |
|---|---|---|
| `&&` | left is falsy | leaks the actual falsy value (e.g. `0`) into render when used as a condition-guard |
| `\|\|` | left is falsy | wrongly overrides *legitimate* falsy values like `0` or `""` with the fallback |
| `??` | left is `null`/`undefined` only | generally the safest choice for "use this value, or a default if it's genuinely missing" |

**Practical rule of thumb:**
- For a strict condition-guard (`condition && <Element />`), use `&&`, but coerce the left side to a real boolean first (`count > 0 && ...`)
- For "use this value, or fall back to a default," prefer `??` over `||` whenever `0`, `""`, or `false` could be legitimate values

---

## Q&A Summary (for quick revision)

**Q: What does "declarative JSX" mean?**
A: Writing JSX so that the markup itself communicates what will render for a given condition, rather than needing to trace imperative DOM-manipulation steps.

**Q: Why does a ternary work inside `{}` in JSX but an `if` statement doesn't?**
A: JSX only accepts expressions inside `{}`. A ternary is an expression that evaluates to a value; an `if` statement doesn't evaluate to a value at all.

**Q: How do you use `if`/`else` to control JSX rendering, given it can't go directly inside `{}`?**
A: Run the `if`/`else` as a normal statement outside JSX, assign the chosen result to a variable, then insert that variable inside JSX.

**Q: Why does `messageCount && <p>New messages</p>` sometimes render a stray `0`?**
A: `&&` doesn't convert its return value to boolean — if the left side is falsy, it returns that falsy value itself. When `messageCount` is `0`, the expression evaluates to `0`, and React renders it literally.

**Q: How do you fix the `&&`-renders-`0` bug?**
A: Coerce the left side to an actual boolean first, e.g. `messageCount > 0 && <p>New messages</p>`.

**Q: Does `||` have the same "stray 0" bug as `&&`?**
A: No — `||` falls through to the right side on any falsy left value, so it wouldn't render a stray `0`. But it has the opposite problem: it treats legitimate falsy values (`0`, `""`, `false`) as "missing" and replaces them with the fallback even when they were intentional.

**Q: How does `??` differ from `||` in terms of what counts as "absent"?**
A: `??` only treats `null`/`undefined` as absent — it preserves other falsy values like `0`, `""`, and `false` as-is, making it the safer default for "use this value or fall back."

---

## Still fuzzy / to revisit later
- Conditional rendering of **lists** (rendering nothing vs. an empty array vs. `null`) — not covered yet
- Returning `null` from a component to render nothing — mentioned conceptually via the `&&` discussion, not yet covered as its own topic

---

## One-line takeaway
JSX only accepts expressions, so conditional rendering leans on ternaries, `if`/`else`-into-a-variable, and short-circuiting logical operators — but `&&`, `||`, and `??` each define "falsy enough to fall through" differently, so picking the wrong one (especially `&&` with a numeric `0`, or `||` when `0`/`""` are valid values) silently renders the wrong thing instead of erroring.
