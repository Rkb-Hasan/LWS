import star from "../../assets/star.svg";
export default function Rating({ value }) {
  //   const stars = Array(value).fill(star);
  return (
    <>
      {/* {stars.map((star, index) => (
        <img key={index} src={star} width="14" height="14" alt="star" />
      ))} */}

      {/* ------------------------------------------------------------------------------- */}

      {/* an obj with length property is treated as an array like obj in JS */}
      {/* Array.from() takes an array like obj for first param */}
      {/* takes a mapFn as 2nd param */}
      {/* the returned value of mapFn is the actual Array returned */}

      {Array.from({ length: value }, (_, i) => (
        <img key={i} src={star} width="14" height="14" alt="star" />
      ))}
    </>
  );
}
