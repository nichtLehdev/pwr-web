/**
 * Passwortstärke ohne Zusatz-Dependency.
 *
 * Bewusst kein zxcvbn: die Wörterbücher wiegen mehrere hundert Kilobyte im
 * Client-Bundle und die Registrierung ist die erste Seite, die ein neuer Nutzer
 * lädt. Die Heuristik hier ist grob, aber ehrlich — sie belohnt Länge deutlich
 * stärker als Zeichenklassen-Bingo und erkennt die Muster, die Nutzer sonst für
 * "sicher" halten (Tastaturreihen, Jahreszahlen, wiederholte Zeichen).
 */

export const PASSWORD_MIN_LENGTH = 8;

export type PasswordScore = 0 | 1 | 2 | 3 | 4;

export type PasswordStrength = {
  score: PasswordScore;
  label: string;
  /** Der wichtigste offene Punkt — leer, sobald nichts mehr zu meckern ist. */
  hint: string;
};

const SEQUENCES = [
  "abcdefghijklmnopqrstuvwxyz",
  "qwertzuiopasdfghjklyxcvbnm",
  "qwertyuiopasdfghjklzxcvbnm",
  "01234567890",
];

const COMMON = [
  "passwort",
  "password",
  "qwertz",
  "qwerty",
  "asdfgh",
  "letmein",
  "willkommen",
  "welcome",
  "admin",
  "iloveyou",
  "posaune",
  "trompete",
];

const hasRun = (value: string) => /(.)\1{2,}/.test(value);

const hasSequence = (value: string) => {
  const lower = value.toLowerCase();
  for (let i = 0; i + 4 <= lower.length; i++) {
    const chunk = lower.slice(i, i + 4);
    const reversed = [...chunk].reverse().join("");
    if (SEQUENCES.some((seq) => seq.includes(chunk) || seq.includes(reversed))) {
      return true;
    }
  }
  return false;
};

const hasCommonWord = (value: string) => {
  const lower = value.toLowerCase();
  return COMMON.some((word) => lower.includes(word));
};

const LABELS: Record<PasswordScore, string> = {
  0: "Sehr schwach",
  1: "Schwach",
  2: "Mittel",
  3: "Stark",
  4: "Sehr stark",
};

/**
 * Bewertet ein Passwort auf einer Skala von 0 (sehr schwach) bis 4 (sehr stark).
 * Ein Passwort unter {@link PASSWORD_MIN_LENGTH} Zeichen kommt nie über 0 —
 * der Balken darf nicht grün werden, wenn das Formular die Eingabe ohnehin
 * ablehnt.
 */
export function scorePassword(password: string): PasswordStrength {
  if (!password) {
    return { score: 0, label: LABELS[0], hint: "" };
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    return {
      score: 0,
      label: LABELS[0],
      hint: `Noch ${PASSWORD_MIN_LENGTH - password.length} Zeichen bis zum Minimum`,
    };
  }

  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((re) =>
    re.test(password),
  ).length;

  let points = 0;
  if (password.length >= 8) points += 1;
  if (password.length >= 12) points += 1;
  if (password.length >= 16) points += 1;
  if (password.length >= 20) points += 1;
  if (classes >= 2) points += 1;
  if (classes >= 3) points += 1;
  if (classes >= 4) points += 1;

  if (hasRun(password)) points -= 1;
  if (hasSequence(password)) points -= 1;
  if (hasCommonWord(password)) points -= 2;

  // Länge dominiert: ein kurzes Passwort erreicht auch mit allen vier
  // Zeichenklassen nie mehr als "Mittel".
  const lengthCap = password.length >= 12 ? 4 : 2;
  const score = Math.max(
    0,
    Math.min(lengthCap, points - 1),
  ) as PasswordScore;

  let hint = "";
  if (hasCommonWord(password)) {
    hint = "Enthält ein sehr gebräuchliches Wort";
  } else if (hasSequence(password)) {
    hint = "Enthält eine Zeichenfolge wie „abcd“ oder „1234“";
  } else if (hasRun(password)) {
    hint = "Enthält ein mehrfach wiederholtes Zeichen";
  } else if (password.length < 12) {
    hint = "Länger ist wirksamer als Sonderzeichen";
  } else if (classes < 3) {
    hint = "Groß-/Kleinbuchstaben, Zahlen oder Sonderzeichen mischen";
  }

  return { score, label: LABELS[score], hint };
}
