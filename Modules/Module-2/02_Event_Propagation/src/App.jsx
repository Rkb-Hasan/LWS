function Button({ onClick, children }) {
  return (
    <button
      onClick={() => {
        console.dir(onClick);
        onClick();
      }}
    >
      {children}
    </button>
  );
}

export default function Toolbar() {
  return (
    <div
      className="Toolbar"
      onClick={() => {
        alert("You clicked on the toolbar!");
      }}
    >
      <Button
        onClick={(e) => {
          e.stopPropagation();
          alert("Playing!");
        }}
      >
        Play Movie
      </Button>
      <Button onClick={() => alert("Uploading!")}>Upload Image</Button>
    </div>
  );
}
