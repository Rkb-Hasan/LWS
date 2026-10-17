export default function PlaceTree({ id, placesById, onComplete, parentId }) {
  const place = placesById[id];
  const childPlacesIds = place.childIds;

  return (
    <li>
      {place.title}{" "}
      <button onClick={() => onComplete(parentId, id)} type="button">
        Complete
      </button>
      n
      {childPlacesIds.length > 0 && (
        <ol>
          {childPlacesIds.map((childId) => (
            <PlaceTree
              key={childId}
              id={childId}
              parentId={id}
              placesById={placesById}
              onComplete={onComplete}
            />
          ))}
        </ol>
      )}
    </li>
  );
}
