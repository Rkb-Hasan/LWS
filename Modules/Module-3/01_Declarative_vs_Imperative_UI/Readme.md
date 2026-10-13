# Declarative vs Imperative UI

> Managing State, React docs. Today's one idea: **two ways of thinking about changing a screen.**

---

## The story of two taxi rides

You step into a taxi in Dhaka and you need to get to the airport.

**Ride 1: you give directions.**
"Turn left at the signal. Go straight past the bridge. Take the second right. Slow down, there's a gate. Stop here."

You are in charge of every move. If you forget one instruction, say the "second right", the driver ends up somewhere wrong, and *you* are the one who has to notice and fix it.

**Ride 2: you give the destination.**
"Take me to the airport."

The driver knows the roads, the traffic, the shortcuts. You said *where you want to end up*, and the driver handles the *how*.

That is the whole lesson:

| | Ride 1 | Ride 2 |
|---|---|---|
| Style | **Imperative** | **Declarative** |
| You say | *How* to do it, step by step | *What* the result should be |

Now let's see the same two rides, but with a screen instead of a taxi.

---

## Ride 1 on a screen: imperative UI

We have a small form: a text box and a Submit button.

What do we want?

- Submit is **disabled** while the box is empty
- While sending, the box and button are **disabled**
- If it fails, an **error shows**
- If it works, a **success message shows**

In plain JavaScript, we give the browser directions:

```js
const input  = document.getElementById('answer');
const button = document.getElementById('submit');
const error  = document.getElementById('error');

input.addEventListener('input', () => {
  button.disabled = input.value.length === 0;   // direction 1
});

button.addEventListener('click', async () => {
  input.disabled = true;                        // direction 2
  button.disabled = true;                       // direction 3
  error.style.display = 'none';                 // direction 4

  try {
    await submitForm(input.value);
    showSuccessMessage();                       // direction 5
  } catch (e) {
    error.textContent = e.message;              // direction 6
    error.style.display = 'block';              // direction 7
    input.disabled = false;                     // direction 8
    button.disabled = false;                    // direction 9
  }
});
```

Read it like a driver would hear it: *"Find the input. Find the button. Find the error. When they click, disable this, disable that, hide that..."*

We are reaching into the page again and again, telling each element exactly what to do and when.

---

## Where Ride 1 starts to hurt

For this tiny form it is fine. But the story gets uncomfortable as the app grows:

- **A new feature touches old code.** Add a "Cancel" button, and now you must go back and update every place that disables the input.
- **Every situation needs its own directions.** Typing, sending, failed, succeeded, and the *journeys between them*. Each journey is another list of instructions.
- **One forgotten direction makes a broken screen.** Forget `button.disabled = false` in the error branch and the user is stuck forever. The page is in a state you never planned.

The core problem: you are not describing the screen. You are describing **every trip between screens**, and the number of trips explodes.

---

## Ride 2 on a screen: declarative UI

Now we say: *"Here is what the screen looks like in each situation. You do the driving."*

```jsx
function Form() {
  const [answer, setAnswer] = useState('');
  const [status, setStatus] = useState('typing'); // 'typing' | 'submitting' | 'success'
  const [error, setError]   = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('submitting');
    try {
      await submitForm(answer);
      setStatus('success');
    } catch (err) {
      setError(err);
      setStatus('typing');
    }
  }

  if (status === 'success') {
    return <h1>That's right!</h1>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        disabled={status === 'submitting'}
      />
      <button disabled={answer.length === 0 || status === 'submitting'}>
        Submit
      </button>
      {error !== null && <p>{error.message}</p>}
    </form>
  );
}
```

Look for what is **missing**. Nowhere do we say "disable the button now" or "hide the error now."

Instead we wrote rules, like a destination:

- The button is disabled **when** the box is empty or we're submitting
- The error shows **when** `error` is not `null`
- The success message shows **when** `status` is `'success'`

The `set...` calls (`setStatus`, `setError`, `setAnswer`) only change **data**. React sees the data changed, works out how the screen must change, and updates it.

We named the destination. React drove.

---

## The mental shift

The question you ask yourself changes:

- Imperative thinking: *"What do I need to show, hide, enable or disable right now?"*
- Declarative thinking: *"What is the state right now, and what should the screen look like for that state?"*

You stop being the driver and become the person who knows **where the passenger wants to go**.

---

## Common mistakes

### 1. Reaching for the DOM inside React

```jsx
// ❌ Imperative habits sneaking back in
function handleClick() {
  document.getElementById('error').style.display = 'none';
}
```

```jsx
// ✅ Let state decide
const [error, setError] = useState(null);

function handleClick() {
  setError(null);
}

// in JSX
{error !== null && <p>{error.message}</p>}
```

When you catch yourself typing `document.getElementById` to show or hide something, pause and ask: **"Which state should control this?"**

### 2. Thinking `setState` directly changes the screen

`setStatus('submitting')` does not say "disable the button." It says "the situation is now *submitting*." The button is disabled because your JSX has a rule for that situation.

### 3. Writing "before and after" instead of "what it looks like"

```jsx
// ❌ Thinking in transitions
// "When submitted, hide the form, then show the message"

// ✅ Thinking in situations
if (status === 'success') return <h1>That's right!</h1>;
return <form>...</form>;
```

Describe each situation fully. Do not describe the trip between them.

---

## Quick revision

- **Imperative:** you give step-by-step directions and manually update the UI (the first taxi ride).
- **Declarative:** you describe what the UI should look like for each state, and React handles the updating (the second taxi ride).
- In React, you change **state**, not the DOM. The screen follows.
- As apps grow, imperative code multiplies the number of directions you must remember. Declarative code only needs one description per situation.

---

## Questions to sit with

1. In the imperative form, which instruction would break the page if you forgot it? Why is that scary at scale?
2. In the declarative form, what *data* decides whether the error message is visible?
3. If you added a "Cancel" button to each version, where would you have to change code?
