const initialList = [
  { id: 0, title: "Big Bellies" },
  { id: 1, title: "Lunar Landscape" },
  { id: 2, title: "Terracotta Army" },
];

const newList = initialList.map((list) => {
  return { ...list };
});

newList.map((list) => (list.title = "change"));
console.log(newList);
console.log("init", initialList);
console.log(Object.is(initialList, newList));
