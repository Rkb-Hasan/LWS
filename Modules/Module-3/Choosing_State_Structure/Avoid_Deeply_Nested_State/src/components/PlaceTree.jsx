export default function PlaceTree({ id, placesById }) {
  const place = placesById[id];

  const childPlacesIds = place.childIds;

  return (
    <li>
      {place.title}
      {childPlacesIds.length > 0 && (
        <ol>
          {childPlacesIds.map((id) => (
            <PlaceTree key={id} id={id} placesById={placesById} />
          ))}
        </ol>
      )}
    </li>
  );
}
