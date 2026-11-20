export function serverError(res, err) {
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server" });
}

export function parseId(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}
