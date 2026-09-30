# Tic Tac Toe

A classic Tic Tac Toe game built by following the [official React tutorial](https://react.dev/learn/tutorial-tic-tac-toe) — built to practice core React fundamentals: component composition, state, lifting state up, immutable updates, and rendering lists.

**Repository:** [github.com/Rkb-Hasan/LWS](https://github.com/Rkb-Hasan/LWS/tree/main/Project_Tutorials/Tic_Tac_Toe)

---

## What it does

A fully playable, two-player Tic Tac Toe game in the browser:

- Two players take turns placing **X** and **O** on a 3×3 board by clicking squares
- The game announces whose turn is next, or declares the winner once one is found
- Once a square is filled, it can't be overwritten — and no more moves can be made after a winner is decided
- Full move history is tracked, with the ability to **jump back to any previous move** and continue the game from that point

---

## Features

- **3×3 interactive board** — nine clickable squares, each showing `X`, `O`, or nothing
- **Turn tracking** — automatically alternates between `X` and `O` on every valid move
- **Win detection** — checks all 8 possible winning lines (3 rows, 3 columns, 2 diagonals) after every move
- **Game status display** — shows either "Next player: X / O" or "Winner: X / O" depending on game state
- **Move history / time travel** — every move is stored, and a list of buttons ("Go to move #N", "Go to game start") lets you jump to any point in the game
- **Immutable board updates** — each move creates a **new** copy of the board array rather than mutating the existing one (see "Immutable updates" below)

---

## How it's built (mapped to React concepts)

### Component structure
```
Game               ← owns the full move history and current move index
 └── Board          ← owns nothing; receives squares + a click handler as props
      └── Square    ← purely presentational, renders one cell
```

This is a direct example of **lifting state up**: individual `Square` components don't hold their own state. Instead, the single source of truth — the full game history — lives in `Game`, the closest common ancestor of everything that needs it. `Board` and `Square` are effectively controlled components: they display whatever props they're given and report clicks back upward via a callback prop, rather than managing anything themselves.

### State
`Game` holds two pieces of state:
- `history` — an array of every board state that has ever existed in this game
- `currentMove` — an index into `history`, representing which move is currently being viewed

The **current board** shown at any time is simply derived from these two: `history[currentMove]` — nothing else needs its own separate state, since it can always be computed from what's already there.

### Immutable updates
When a square is clicked, the board is never edited directly. Instead, a **copy** of the current squares array is made (via `.slice()` or spread), the copy is updated at the clicked index, and that new array becomes the next entry in `history`. This is the same principle from the Pure Components and Props notes: React needs a genuinely new reference to correctly detect a change and re-render — mutating the existing array in place would be invisible to React's change detection.

### Rendering the board
The board's nine squares are rendered using `.map()` over the board array, same as any dynamic list — each `Square` needs a stable identity, following the same key principles covered in Rendering Lists.

### Win checking
After every move, a helper function checks the current board against all fixed winning-line combinations (index triplets like `[0,1,2]`, `[0,3,6]`, `[0,4,8]`, etc.) to see if any line is filled with the same non-null player mark. This is plain JavaScript logic living in the "space before `return`" — a pure calculation derived from current state, not a side effect.

### Time travel
Because every past board state is kept in `history` rather than being discarded, "jumping back" to any move is just a matter of changing `currentMove` to point at an earlier index — no undo logic or special-casing needed. The board simply re-renders using `history[currentMove]`, whatever that index happens to be.

---

## Tech Stack

- **React** — component structure, state, and rendering
- Built while following the official React documentation's tutorial project

---

## Repository

[github.com/Rkb-Hasan/LWS/tree/main/Project_Tutorials/Tic_Tac_Toe](https://github.com/Rkb-Hasan/LWS/tree/main/Project_Tutorials/Tic_Tac_Toe)

*Built as a hands-on tutorial project alongside the Learn with Sumit — Reactive Accelerator course, following the official React docs.*
