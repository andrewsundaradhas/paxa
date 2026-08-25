/**
 * Pure receipt parser: turns raw OCR text into structured fields the user can
 * review before creating a payment request. No native deps, fully unit-testable.
 *
 * Everything here is heuristic and deliberately conservative — the review screen
 * lets the user correct anything, so we favour "a sensible guess" over cleverness.
 */
import type {SpendingCategory} from '../categories';

export interface ParsedReceipt {
  merchant: string | null;
  total: number | null; // rupees
  date: string | null; // ISO yyyy-mm-dd
  items: {name: string; price: number}[]; // price in rupees
  category: SpendingCategory;
}

const CURRENCY = /(?:₹|rs\.?|inr)?\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/gi;
const TOTAL_HINTS = /(grand\s*total|total\s*amount|amount\s*due|amount\s*payable|net\s*(?:amount|payable)|balance\s*due|\btotal\b|\bpaid\b)/i;
const NEGATIVE_HINTS = /(sub\s*total|subtotal|tax|gst|cgst|sgst|discount|change|tip|round)/i;

/** Parse a currency-looking token to a number, or null. */
function money(token: string): number | null {
  const n = Number(token.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** All currency amounts found in a line. */
function amountsIn(line: string): number[] {
  const out: number[] = [];
  let m: RegExpExecArray | null;
  CURRENCY.lastIndex = 0;
  while ((m = CURRENCY.exec(line))) {
    const v = money(m[1]);
    if (v != null) {
      out.push(v);
    }
  }
  return out;
}

const CATEGORY_KEYWORDS: [SpendingCategory, RegExp][] = [
  ['Food', /(restaurant|cafe|café|hotel|dhaba|pizza|burger|kitchen|foods?|dine|biryani|swiggy|zomato|bakery|coffee|tea|bar\b|resto)/i],
  ['Groceries', /(super\s*market|supermarket|grocery|groceries|mart|kirana|provisions?|bigbasket|dmart|reliance\s*fresh|more\b)/i],
  ['Travel', /(uber|ola|rapido|cab|taxi|petrol|fuel|diesel|indian\s*oil|hpcl|bpcl|irctc|airlines|flight|metro|bus|toll|parking)/i],
  // Entertainment before Shopping so "PVR … Forum Mall" isn't mis-tagged as Shopping.
  ['Entertainment', /(cinema|movie|pvr|inox|bookmyshow|gaming|netflix|spotify|nightclub|\bpub\b|concert|events?)/i],
  ['Shopping', /(mall|fashion|apparel|clothing|store|lifestyle|myntra|amazon|flipkart|electronics|shoppe|retail)/i],
  ['Bills', /(electricity|water\s*bill|gas\s*bill|broadband|recharge|postpaid|utility|dth|internet|mobile\s*bill)/i],
  ['Education', /(school|college|university|tuition|course|academy|institute|books?\s*(store|shop))/i],
];

function guessCategory(text: string): SpendingCategory {
  for (const [cat, re] of CATEGORY_KEYWORDS) {
    if (re.test(text)) {
      return cat;
    }
  }
  return 'Other';
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

const pad = (n: number) => String(n).padStart(2, '0');

/** Extract the first plausible date as ISO yyyy-mm-dd. */
function findDate(text: string): string | null {
  // 2024-01-12 / 2024/01/12
  let m = text.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (m) {
    return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;
  }
  // 12/01/2024 or 12-01-24  (assume day-first, common in India)
  m = text.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/);
  if (m) {
    let year = +m[3];
    if (year < 100) {
      year += 2000;
    }
    const day = +m[1];
    const mon = +m[2];
    if (mon >= 1 && mon <= 12 && day >= 1 && day <= 31) {
      return `${year}-${pad(mon)}-${pad(day)}`;
    }
  }
  // 12 Jan 2024  /  Jan 12, 2024
  m = text.match(/\b(\d{1,2})\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*,?\s*(20\d{2})\b/i);
  if (m) {
    return `${m[3]}-${pad(MONTHS[m[2].toLowerCase()])}-${pad(+m[1])}`;
  }
  m = text.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})\s*,?\s*(20\d{2})\b/i);
  if (m) {
    return `${m[3]}-${pad(MONTHS[m[1].toLowerCase()])}-${pad(+m[2])}`;
  }
  return null;
}

/** Pick the receipt total: prefer amounts on "total" lines, else the max seen. */
function findTotal(lines: string[]): number | null {
  const totalCandidates: number[] = [];
  let maxAmount = 0;
  for (const line of lines) {
    if (NEGATIVE_HINTS.test(line) && !TOTAL_HINTS.test(line.replace(NEGATIVE_HINTS, ''))) {
      // still track for max, but don't treat as the total line
      amountsIn(line).forEach(a => (maxAmount = Math.max(maxAmount, a)));
      continue;
    }
    const amounts = amountsIn(line);
    amounts.forEach(a => (maxAmount = Math.max(maxAmount, a)));
    if (TOTAL_HINTS.test(line) && amounts.length) {
      totalCandidates.push(Math.max(...amounts));
    }
  }
  if (totalCandidates.length) {
    // The grand total is typically the largest of the "total"-hinted amounts.
    return Math.max(...totalCandidates);
  }
  return maxAmount > 0 ? maxAmount : null;
}

/** A line item is "some text … a trailing price". */
function findItems(lines: string[]): {name: string; price: number}[] {
  const items: {name: string; price: number}[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || TOTAL_HINTS.test(line) || NEGATIVE_HINTS.test(line)) {
      continue;
    }
    const m = line.match(/^(.*?[a-zA-Z].*?)\s+(?:₹|rs\.?|inr)?\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)\s*$/i);
    if (m) {
      const name = m[1].replace(/\s{2,}/g, ' ').replace(/[.\-–—:]+$/, '').trim();
      const price = money(m[2]);
      if (name.length >= 2 && name.length <= 60 && price != null) {
        items.push({name, price});
      }
    }
    if (items.length >= 30) {
      break;
    }
  }
  return items;
}

/** Guess the merchant: the first "namey" line near the top of the receipt. */
function findMerchant(lines: string[]): string | null {
  for (const raw of lines.slice(0, 6)) {
    const line = raw.trim();
    if (!line) {
      continue;
    }
    const lettered = line.replace(/[^a-zA-Z]/g, '');
    // Skip pure numbers, dates, GST lines, very short noise.
    if (lettered.length < 3 || /gst|invoice|receipt|bill\s*no|tax/i.test(line) || findDate(line)) {
      continue;
    }
    return line.replace(/\s{2,}/g, ' ').slice(0, 60);
  }
  return null;
}

/** Parse full OCR text into reviewable fields. */
export function parseReceipt(rawText: string): ParsedReceipt {
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const merchant = findMerchant(lines);
  return {
    merchant,
    total: findTotal(lines),
    date: findDate(rawText),
    items: findItems(lines),
    category: guessCategory(`${merchant ?? ''}\n${rawText}`),
  };
}
