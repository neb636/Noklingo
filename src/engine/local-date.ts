export function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseLocalDate(value: string): { year: number; month: number; day: number } {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) throw new Error(`Invalid local date: ${value}`);
  return { year, month, day };
}

export function localDateOrdinal(value: string): number {
  const { year, month, day } = parseLocalDate(value);
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

export function compareLocalDates(a: string, b: string): number {
  return Math.sign(localDateOrdinal(a) - localDateOrdinal(b));
}

export function addLocalDays(value: string, days: number): string {
  const { year, month, day } = parseLocalDate(value);
  const date = new Date(year, month - 1, day, 12);
  date.setDate(date.getDate() + days);
  return localDateKey(date);
}

export function localDaysBetween(a: string, b: string): number {
  return localDateOrdinal(b) - localDateOrdinal(a);
}

export function formatLocalDate(value: string): string {
  const { year, month, day } = parseLocalDate(value);
  return new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric", year: "numeric" })
    .format(new Date(year, month - 1, day, 12));
}
