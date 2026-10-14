import { useState } from "react";
import { initialTravelPlan } from "../data/places-normalized";
import PlaceTree from "./PlaceTree";
export default function TravelPlan() {
  const [plan, setPlan] = useState(initialTravelPlan);

  const root = plan[0];
  const planetIds = root.childIds;

  return (
    <>
      <h2>Places to Visist : </h2>

      <ol>
        {planetIds.map((placeId) => (
          <PlaceTree key={placeId} id={placeId} placesById={plan} />
        ))}
      </ol>
    </>
  );
}
