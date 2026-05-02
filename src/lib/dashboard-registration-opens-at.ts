/** Split/merge HTML `date` + `time` inputs into one `YYYY-MM-DDTHH:mm` string for API/state. */

const DEFAULT_TIME = "09:00";

export function registrationOpensSplit(isoDatetimeLocal: string): {
  date: string;
  time: string;
} {
  if (!isoDatetimeLocal?.includes?.("T")) {
    return { date: "", time: "" };
  }
  const [d, rest] = isoDatetimeLocal.split("T") as [string, string];
  return { date: d ?? "", time: (rest ?? "").slice(0, 5) };
}

export function registrationOpensMerge(date: string, time: string): string {
  const d = date.trim();
  if (!d) return "";
  const tRaw = time.trim();
  const t =
    tRaw.length >= 4 ? tRaw.slice(0, 5) : DEFAULT_TIME;
  return `${d}T${t}`;
}
