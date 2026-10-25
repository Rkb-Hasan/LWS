import { useState } from "react";

export default function AddTask({ onAdd }) {
  const [text, setText] = useState("");

  return (
    <>
      <input
        placeholder="Add task"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button
        onClick={() => {
          setText("");
          onAdd(text);
        }}
      >
        Add
      </button>
    </>
  );
}
