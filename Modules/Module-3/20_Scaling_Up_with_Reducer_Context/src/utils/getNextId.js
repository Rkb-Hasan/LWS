export const getNextId = (data) => {
  if (!data.length) return 0;

  const maxId = data.reduce((prev, curr) =>
    prev && prev.id > curr.id ? prev.id : curr.id,
  );

  return maxId + 1;
};
