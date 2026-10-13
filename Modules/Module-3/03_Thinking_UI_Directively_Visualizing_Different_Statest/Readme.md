# Visualizing UI States and What Triggers Them

> Before writing any code, draw every look a component can have, then work out what moves it from one look to the next. A state is a **look**, not a value, and a trigger is either something a **human** does or something the **computer** does.

---

## 1. Start with pictures, not code

A designer doesn't build one screen and hope for the best. They draw every screen the user could ever see, like pages of a storybook, and only then does a developer build it.

Thinking about UI declaratively starts the same way, with two questions in order:

1. **What are all the different looks this component can have?**
2. **What triggers the move from one look to another?**

Code comes after both answers. If you jump into JSX first, you will keep bolting on `if` conditions to fix what you forgot.

---

## 2. A state is a look, not a value

Take a textbox. The user types `D`, then `Dh`, then `Dha`. Is that three states?

No. The textbox **looks the same** each time, and only the data inside it changed. A visual state is a different *look*:

- Drawing a mock for every possible text would never end.
- Drawing a mock for every distinct look is a short, finite list.

A second trap: don't describe states by what the user *did*. "Clicked" is a moment, not a look. Ask what the screen looks like *right after* the click.

### Example: an Add to cart button

A first attempt often lists "not clicked, clicked, clicked again", which are user actions. Describing looks gives a better list:

- **Idle:** the normal "Add to cart" button
- **Adding:** the click reached the shop, the reply hasn't come back, so the button is locked and shows "Adding…"
- **Added:** the shop confirmed, and the button shows "Added ✓"
- **Error:** the request failed, and the button invites a retry
- **Sold out:** the stock hit zero while the page was open, and the button is disabled

Notice that "sold out" exists *before* anyone clicks anything. Some looks have nothing to do with the user.

---

## 3. The storybook: a quiz form

A text box and a Submit button. Five pages.

### Page 1: Empty

```
┌──────────────────────────────┐
│  What is the capital of      │
│  Bangladesh?                 │
│  ┌────────────────────────┐  │
│  │                        │  │
│  └────────────────────────┘  │
│  [ Submit ]  (disabled)      │
└──────────────────────────────┘
```

Nothing typed, so there is nothing to send.

### Page 2: Typing

```
│  ┌────────────────────────┐  │
│  │ Dhaka                  │  │
│  └────────────────────────┘  │
│  [ Submit ]  (enabled)       │
```

Same screen, but the button wakes up.

### Page 3: Submitting

```
│  ┌────────────────────────┐  │
│  │ Dhaka          (locked)│  │
│  └────────────────────────┘  │
│  [ Submit ]  (disabled)      │
```

Everything is locked, so the user can't send twice or change the answer mid-flight.

### Page 4: Error

```
│  ┌────────────────────────┐  │
│  │ Dhaka                  │  │
│  └────────────────────────┘  │
│  ⚠ Something went wrong      │
│  [ Submit ]  (enabled)       │
```

The error shows, and the user can try again.

### Page 5: Success

```
┌──────────────────────────────┐
│        That's right!         │
└──────────────────────────────┘
```

The whole form is replaced by a message.

Drawing the pages forces you to notice states that are easy to forget, such as **Submitting** and **Error**. If you can't name a component's states (empty, loading, error, success, disabled), you aren't ready to code it.

---

## 4. What triggers a change?

A storybook doesn't turn its own pages. There are two kinds of page-turners.

### Human input

Something the user does:

- clicking a button
- typing in a field
- navigating a link

### Computer input

Something that happens without the user doing anything on this page:

- a network response arriving
- a timeout completing
- an image loading

In both cases the screen changes only when a **state variable** is set. That is the one way to tell the component "the situation changed". (How state variables are created is the next step.)

---

## 5. One click, a chain of triggers

Back to the cart. Here is who turns the page at each move:

```
Idle ──(user clicks)────────────▶ Adding      human
Adding ──(server replies: OK)───▶ Added       computer
Adding ──(server replies: fail)─▶ Error       computer
Idle ──(stock reaches zero)─────▶ Sold out    computer
```

One human click started a chain, and the next changes were not caused by a human at all. This is why the docs separate the two families.

---

## 6. Who is listening?

Something has to notice a trigger and run your code.

### Human triggers: event handlers

```jsx
<input onChange={e => /* user typed */} />
<button onClick={handleSubmit}>Submit</button>
```

A keystroke or a click does nothing on its own. A handler catches it.

### Computer triggers: handlers are not the only way

- **An image loading** has a handler too:

```jsx
<img src={photo} onLoad={() => /* image finished loading */} />
```

- **A server reply** does not use `onLoad`. It comes back through a promise, which is the `await` in your function:

```jsx
async function handleSubmit(e) {
  e.preventDefault();
  /* set the look to "submitting" */
  await submitForm(answer);   // the function pauses here
  /* runs when the reply arrives */
}
```

The code under `await` is the listener. When the reply lands, JavaScript picks the function back up from that line. So **one function holds both triggers**: the click started it, and the reply continues it.

---

## 7. The word "often"

The docs say human input *often* requires event handlers. The word is doing real work:

- **Clicking a plain link** `<a href="/cart">Cart</a>` needs **no handler from you**. The browser navigates by itself.
- **Typing** where you want to read what the user typed **needs a handler** (`onChange`).
- **An image loading** where you want to show a "loaded" look **needs a handler** (`onLoad`).

So two things are true at once:

1. Not every human input needs *your* handler. The browser already handles some (plain links, and routers like Next.js `Link` handle their own click).
2. Handlers aren't only for humans. Computer events like an image loading use them too.

The real rule: you write a handler **when you need your own code to run** in response to a trigger.

---

## 8. Common mistakes

**Drawing only the happy path**

```
Idle → Added
```

Forgetting **Adding**, **Error** and **Sold out** means the app breaks in exactly the moments users get frustrated.

**Counting values as states**

`"D"`, `"Dh"` and `"Dha"` are one look with different data. They are not three states.

**Naming states after user actions**

"Clicked" and "clicked again" describe the user. Name the look: "Adding", "Added".

**Treating every trigger as a click**

A server reply is not a button press. Looking for an `onClick` for it means looking for a handler that doesn't exist. It arrives through `await`.

**Starting with code**

JSX first means patching missed states with extra `if` conditions later. Draw first.

---

## Quick recall

- Draw **every look** of a component first, like pages of a storybook.
- A state is a **look**, not a value. Typing `D`, `Dh`, `Dha` is one look.
- Name states by what the screen shows, not by what the user did.
- Some looks (like "sold out") exist before any click.
- Triggers are **human** (click, type, navigate) or **computer** (network reply, timeout, image load).
- One human action can start a chain of computer triggers.
- Handlers listen for triggers: `onClick`, `onChange`, `onLoad`. A server reply arrives through `await`.
- A plain link needs no handler from you. Write one only when your own code must run.
- In every case the screen changes by **setting a state variable**.

---

## Self-check questions

1. Why is typing `D`, then `Dh`, then `Dha` one state and not three?
2. Why is "clicked" a poor name for a state? What would you name it?
3. Name a cart-button look that exists before the user clicks anything.
4. In the cart chain, which move is a human trigger and which are computer triggers?
5. How does the reply from the server reach your code if it doesn't use `onLoad`?
6. Which of these needs a handler you write: clicking a plain `<a href>`, typing in a textbox you want to read, an image loading when you want a "loaded" look?
7. What does "often" hide in "human input often requires event handlers"?
8. In the quiz form, which two pages can a network reply lead to, and what decides between them?
