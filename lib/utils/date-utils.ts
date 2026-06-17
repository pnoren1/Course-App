/**
 * Format a date string as a Gregorian date in Hebrew locale.
 * Example: "17/06/2025"
 */
export function formatGregorianDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Converts a numeric Hebrew year (e.g. 5786) to gematria notation (e.g. "תשפ״ו").
 * Works for years 5001–5999 (the current millennium).
 * The thousands digit is omitted (conventional practice).
 */
function hebrewYearToGematria(year: number): string {
  const ones =     ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
  const tens =     ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];
  const hundreds = ['', 'ק', 'ר', 'ש', 'ת', 'תק', 'תר', 'תש', 'תת', 'תתק'];

  const remainder = year % 1000;
  const h = Math.floor(remainder / 100);
  const t = Math.floor((remainder % 100) / 10);
  const o = remainder % 10;

  let letters = hundreds[h] + tens[t] + ones[o];

  // Avoid writing divine names: יה → טו, יו → טז
  letters = letters.replace('יה', 'טו').replace('יו', 'טז');

  // Add geresh (׳) for a single letter, gershayim (״) before the last letter
  if (letters.length === 1) {
    letters = letters + '׳';
  } else {
    letters = letters.slice(0, -1) + '״' + letters.slice(-1);
  }

  return letters;
}

/**
 * Format a date string as a Hebrew calendar date.
 * Example: "ד׳ בתמוז תשפ״ו"
 *
 * Note: Intl does not convert Hebrew years to gematria notation,
 * so we extract the parts and convert the year manually.
 */
export function formatHebrewCalendarDate(dateStr: string): string {
  const date = new Date(dateStr);

  const formatter = new Intl.DateTimeFormat('he-IL-u-ca-hebrew', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const parts = formatter.formatToParts(date);
  const dayStr   = parts.find(p => p.type === 'day')?.value   ?? '';
  const monthStr = parts.find(p => p.type === 'month')?.value ?? '';
  const yearNum  = Number(parts.find(p => p.type === 'year')?.value ?? '0');

  const dayNum = parseInt(dayStr, 10);
  const dayGem = hebrewYearToGematria(dayNum);

  return `${dayGem} ב${monthStr} ${hebrewYearToGematria(yearNum)}`;
}

/**
 * Returns both Gregorian and Hebrew calendar representations of a date.
 * Example: { gregorian: "17/06/2025", hebrew: "כ״ב בסיון תשפ״ה" }
 */
export function formatDualDate(dateStr: string): { gregorian: string; hebrew: string } {
  return {
    gregorian: formatGregorianDate(dateStr),
    hebrew: formatHebrewCalendarDate(dateStr),
  };
}

/**
 * Returns true only when today is strictly after the deadline day (deadline day is inclusive).
 */
export function isDeadlineDayPassed(deadlineStr: string): boolean {
  const now = new Date();
  const dl = new Date(deadlineStr);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const deadlineStart = new Date(dl.getFullYear(), dl.getMonth(), dl.getDate());
  return todayStart > deadlineStart;
}

/**
 * Days remaining until (and including) the deadline day.
 * Returns 0 on the deadline day itself, negative values after.
 */
export function getDeadlineDaysRemaining(deadlineStr: string): number {
  const now = new Date();
  const dl = new Date(deadlineStr);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const deadlineStart = new Date(dl.getFullYear(), dl.getMonth(), dl.getDate());
  const diffMs = deadlineStart.getTime() - todayStart.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}
