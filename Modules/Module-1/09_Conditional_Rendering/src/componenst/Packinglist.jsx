function Item({ name, isPacked }) {
  let itemContent;

  //   deep level conditions
  if (isPacked) {
    itemContent = name + "✅";
  } else {
    itemContent = name;
  }

  //   ---better for two level condition
  //   return <li className="item">{isPacked ? name + "✅" : name}</li>;

  return <li className="item">{itemContent}</li>;
}

export default function PackingList() {
  return (
    <section>
      <h1>Sally Ride's Packing List</h1>
      <ul>
        <Item isPacked={true} name="Space suit" />
        <Item isPacked={true} name="Helmet with a golden leaf" />
        <Item isPacked={false} name="Photo of Tam" />
      </ul>
    </section>
  );
}
