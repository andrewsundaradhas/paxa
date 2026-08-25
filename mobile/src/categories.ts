/**
 * Canonical spending categories for the mobile UI.
 *
 * Kept in sync with the server's `categorySchema` (shared/src/schemas.ts), which
 * remains the validation source of truth. Mirrored here as a plain constant
 * because the mobile bundle only ever *type*-imports from `@shared` — Metro's
 * alias doesn't resolve `@shared/*` subpaths for runtime values.
 */
export const SPENDING_CATEGORIES = [
  'Food',
  'Travel',
  'Shopping',
  'Entertainment',
  'Bills',
  'Education',
  'Groceries',
  'Other',
] as const;

export type SpendingCategory = (typeof SPENDING_CATEGORIES)[number];
