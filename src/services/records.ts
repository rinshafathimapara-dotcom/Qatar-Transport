export function uniqueRecords<T extends { id: string }>(rows: T[]): T[] {
  return [...new Map(rows.map((r) => [r.id, r])).values()];
}
// Stable pages avoid the server's default maximum row count truncating schedules.
export async function readPages<T extends { id: string }>(
  page: (
    from: number,
    to: number,
  ) => Promise<{ data: T[] | null; error: { message: string } | null }>,
  size = 500,
  maxPages = 40,
): Promise<T[]> {
  const rows: T[] = [];
  for (let i = 0; i < maxPages; i++) {
    const { data, error } = await page(i * size, (i + 1) * size - 1);
    if (error) throw new Error(error.message);
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < size) return uniqueRecords(rows);
  }
  throw new Error(
    "Dataset exceeds the supported page limit; use a geographic or date filter.",
  );
}
