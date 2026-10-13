# Representing State, Trimming It, and Connecting Handlers

> Draw the looks, find the triggers, then put the state in memory with `useState`. Start with the data you must have, cut every variable you can derive, and finally connect each trigger to a setter. The screen follows the state.

---

## 1. Where this fits

The first two steps happen on paper:

1. **Visualize** every look a component can have (Empty, Typing, Submitting, Error, Success).
2. **Find the triggers** that move it between looks (human input and computer input).

The remaining three steps turn that plan into code:

3. **Represent** the state in memory with `useState`.
4. **Remove** any non-essential state variables.
5. **Connect** the event handlers to the setters.

The running example is the same quiz form: a textbox, a Submit button, and the five looks from the storybook.

---

## 2. Step 3: Represent the state with `useState`

Start with the state you **absolutely must have**, the data that nothing else can tell you:

- `answer`: what the user typed in the textbox
- `error`: the last error that came back from the server

Then add variables for the visual states from step 1. Your first idea doesn't have to be good. Refactoring state is part of the process.

```jsx
const [answer, setAnswer] = useState('');
const [error, setError] = useState(null);

// first draft: one boolean per look
const [isEmpty, setIsEmpty] = useState(true);
const [isTyping, setIsTyping] = useState(false);
const [isSubmitting, setIsSubmitting] = useState(false);
const [isSuccess, setIsSuccess] = useState(false);
const [isError, setIsError] = useState(false);
```

This draft covers every look from the storybook, so it works as a starting point. It isn't the best design, as step 4 shows.

---

## 3. Controlled inputs, and the keystroke question

The textbox is wired to state like this:

```jsx
<textarea
  value={answer}
  onChange={e => setAnswer(e.target.value)}
/>
```

This is a **controlled** input: React's state is the single source of truth for what the box shows.

### Controlled vs uncontrolled

- **Controlled:** the value lives in state. Every keystroke goes through a setter, so every keystroke re-renders.
- **Uncontrolled:** the browser holds the value inside the input. React doesn't see each keystroke, and you read the value only when you need it, such as on submit.

```jsx
// uncontrolled: read once, on submit
function handleSubmit(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  submitForm(formData.get('answer'));
}

<input name="answer" defaultValue="" />
```

Which one fits depends on **what the screen must know, and when**. Our form disables Submit while the box is empty, so the screen must react to every keystroke. That makes it controlled. If there were no such rule, an uncontrolled input would be enough. A file input is always uncontrolled, because its value can't be set from code.

### Does re-rendering on every keystroke hurt performance?

Two things get mixed up here:

- It is **not a new instance** of the component. It's the same component with the same state, and React calls the function again. That's why the typed text survives.
- A **render is not a DOM rebuild**. The function runs, it returns plain element objects, React compares them with the old ones, and only real differences touch the DOM. For one keystroke that is usually one tiny change.

So rendering a small component per keystroke is cheap. The cost appears when the render is **heavy**: a search box that sits in the same component as a list of 5,000 products re-renders the whole list on every keystroke. The cost comes from how much work is inside the render, not from the number of renders.

---

## 4. Step 4: Remove non-essential state

Five booleans can be set in 2⁵ = 32 combinations, but the quiz form has only five valid looks. The other 27 are **impossible states**, such as `isTyping` and `isSubmitting` both `true`. Nothing stops your code from creating one, and then the screen shows nonsense.

Ask three questions about each variable:

1. **Does this state cause a paradox?** `isTyping` and `isSubmitting` can't both be true, so they shouldn't be separate booleans.
2. **Is the same information already in another variable?** `isEmpty` is just `answer.length === 0`, so it doesn't need its own state.
3. **Can you get the same information from the inverse of another variable?** `isError` is just `error !== null`.

Apply them:

```jsx
const [answer, setAnswer] = useState('');
const [error, setError] = useState(null);
const [status, setStatus] = useState('typing'); // 'typing' | 'submitting' | 'success'
```

Three variables replace seven, and impossible states are gone because `status` can only hold one value at a time. `isEmpty` and `isError` didn't disappear, they became **calculated values**:

```jsx
const isEmpty = answer.length === 0;     // computed during render
const hasError = error !== null;         // computed during render
```

They're recalculated every render from the real state, so they can never be out of sync.

---

## 5. Step 5: Connect the handlers to the setters

Now each trigger from step 2 gets wired to a setter. This is the point where the plan from steps 1 and 2 becomes code.

```jsx
import { useState } from 'react';

export default function Form() {
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('typing'); // 'typing' | 'submitting' | 'success'

  if (status === 'success') {
    return <h1>That's right!</h1>;
  }

  async function handleSubmit(e) {
    e.preventDefault();          // stop the page reload
    setError(null);              // clear the old error
    setStatus('submitting');
    try {
      await submitForm(answer);  // the reply arrives here
      setStatus('success');
    } catch (err) {
      setStatus('typing');
      setError(err);
    }
  }

  function handleTextareaChange(e) {
    setAnswer(e.target.value);
  }

  return (
    <>
      <p>What is the capital of Bangladesh?</p>
      <form onSubmit={handleSubmit}>
        <textarea
          value={answer}
          onChange={handleTextareaChange}
          disabled={status === 'submitting'}
        />
        <br />
        <button disabled={answer.length === 0 || status === 'submitting'}>
          Submit
        </button>
        {error !== null && <p>{error.message}</p>}
      </form>
    </>
  );
}
```

Count the connections:

- **Human trigger (typing)** → `onChange` → `setAnswer`
- **Human trigger (clicking Submit)** → `onSubmit` → `setStatus('submitting')`
- **Computer trigger (reply OK)** → the line after `await` → `setStatus('success')`
- **Computer trigger (reply failed)** → the `catch` → `setStatus('typing')` and `setError(err)`

### One submit, start to finish

1. The user types. `handleTextareaChange` calls `setAnswer`, and the page re-renders with the Typing look.
2. The user clicks Submit. `setStatus('submitting')` is queued, and the page re-renders with everything locked.
3. The reply arrives. The function resumes after `await`, and either `setStatus('success')` or the `catch` branch runs.
4. React renders the look that matches the new state.

No handler ever says "disable the button" or "show the error". They only change data, and the JSX rules decide what that data looks like.

---

## 6. Common mistakes

**Keeping derived values in state**

```jsx
const [isEmpty, setIsEmpty] = useState(true);   // redundant: answer.length === 0
```

Another variable has to be updated in sync, and if it isn't, the screen lies.

**Several booleans for one-at-a-time states**

```jsx
const [isTyping, setIsTyping] = useState(false);
const [isSubmitting, setIsSubmitting] = useState(false);
// both can be true: an impossible state
```

Use one `status` variable instead.

**`value` without `onChange`**

```jsx
<textarea value={answer} />    // the box becomes read-only
```

A controlled input needs both `value` and a handler that updates state.

**Forgetting to clear the old error**

If `setError(null)` is missing from the start of `handleSubmit`, the old error message stays on screen while the next request is in flight.

**Forgetting `e.preventDefault()`**

A form's default submit reloads the page and wipes all state.

**Putting heavy work next to a controlled input**

The input re-renders everything in its component on each keystroke. If the same component holds a long list, typing will lag.

---

## Quick recall

- **Step 3:** start with the data you must have (`answer`, `error`), then add what's needed for the visual states.
- Your first draft of state is allowed to be messy.
- **Step 4:** cut anything that causes a paradox, repeats information, or is the inverse of another variable.
- Derived values (`isEmpty`, `hasError`) are calculated during render, not stored.
- One `status` variable replaces many booleans and rules out impossible states.
- **Step 5:** connect each trigger to a setter. Handlers change data, never the screen directly.
- Controlled input = state holds the value (`value` + `onChange`). Uncontrolled = the browser holds it, and you read it when needed.
- A keystroke re-render is the same component, not a new instance, and it's cheap unless the render is heavy.

---

## Self-check questions

1. Which two pieces of state are "mandatory" in the quiz form, and why can't they be derived?
2. With five boolean variables, how many combinations exist, and how many are valid?
3. Why is `isEmpty` better as `answer.length === 0` than as state?
4. What do the three questions in step 4 each catch?
5. Why does the quiz form need a controlled textbox? When would an uncontrolled one be enough?
6. Does a keystroke create a new instance of the component? What does React do instead?
7. Name the setter that each trigger calls: typing, clicking Submit, reply OK, reply failed.
8. What happens if you write `<textarea value={answer} />` without `onChange`?
9. When does rendering on every keystroke become a real problem?
