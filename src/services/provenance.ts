export function dataStatus(
  row: {
    is_demo?: boolean | null;
    source?: string | null;
    note?: string | null;
  },
  sourceDescription?: string | null,
) {
  const text = [row.source, row.note, sourceDescription]
    .filter(Boolean)
    .join(" ");
  if (
    row.is_demo === true ||
    /synthetic|simulat|demo dataset|illustrative/i.test(text)
  )
    return "Illustrative";
  return "Reference data";
}
export function displayNumber(value: unknown, unit = "") {
  return typeof value === "number" && Number.isFinite(value)
    ? `${Math.round(value * 10) / 10}${unit}`
    : "Not supplied";
}
export function qatarTimestamp(value: string | null | undefined) {
  if (!value || !Number.isFinite(Date.parse(value)))
    return "Timestamp not supplied";
  return (
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Qatar",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value)) + " Qatar"
  );
}
