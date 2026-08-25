/**
 * Zod request schemas — the single source of validation truth, imported by the
 * server (to validate incoming requests) and the mobile app (to validate forms
 * before sending). Money fields are in rupees at the API boundary; the server
 * converts to integer paise for storage + math.
 */
import {z} from 'zod';

export const emailSchema = z.string().trim().toLowerCase().email().max(254);
export const passwordSchema = z.string().min(8).max(128);

/**
 * UPI VPA (virtual payment address), e.g. "name@okhdfc". Validated so it can be
 * safely dropped into a `upi://pay?pa=…` deep link without breaking the URL or
 * letting arbitrary text through.
 */
export const vpaSchema = z
  .string()
  .trim()
  .regex(/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/, 'Enter a valid UPI ID like name@bank')
  .max(256);

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: z.string().trim().min(1).max(60),
  deviceId: z.string().max(128).optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
  deviceId: z.string().max(128).optional(),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

/** Continue with Google — the client sends the Google ID token (JWT). */
export const googleAuthSchema = z.object({
  idToken: z.string().min(20),
  deviceId: z.string().max(128).optional(),
});

/** Continue with Apple — identity token + (first sign-in only) the name Apple
 * returns exactly once. Later sign-ins omit the name, so we keep the stored one. */
export const appleAuthSchema = z.object({
  identityToken: z.string().min(20),
  fullName: z.string().trim().max(80).optional(),
  deviceId: z.string().max(128).optional(),
});

export const splitModeSchema = z.enum(['equal', 'exact', 'percent', 'shares']);

export const createGroupSchema = z.object({
  name: z.string().trim().min(1).max(80),
  fill: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  memberEmails: z.array(emailSchema).max(50).optional(),
});

export const addExpenseSchema = z.object({
  title: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(40).default('Food'),
  amount: z.number().positive().max(10_000_000), // rupees
  paidBy: z.string().uuid(),
  mode: splitModeSchema,
  /** Participant user ids included in the split. */
  participants: z.array(z.string().uuid()).min(1).max(50),
  /** Per-participant value keyed by user id (paise for exact, % for percent, weight for shares). Omit for equal. */
  values: z.record(z.string().uuid(), z.number().nonnegative()).optional(),
  note: z.string().max(280).optional(),
});

export const initiateSettlementSchema = z.object({
  toUserId: z.string().uuid(),
  amount: z.number().positive().max(10_000_000), // rupees
  method: z.enum(['upi', 'card']).default('upi'),
  /** Client-generated key so a retried request never double-records. */
  idempotencyKey: z.string().min(8).max(80),
});

export const registerDeviceSchema = z.object({
  pushToken: z.string().min(1).max(512),
  platform: z.enum(['ios', 'android']),
  deviceId: z.string().min(1).max(128),
});

/** Canonical spending categories used across receipts, requests and insights. */
export const categorySchema = z.enum([
  'Food',
  'Travel',
  'Shopping',
  'Entertainment',
  'Bills',
  'Education',
  'Groceries',
  'Other',
]);
export const SPENDING_CATEGORIES = categorySchema.options;

const receiptItemSchema = z.object({
  name: z.string().trim().min(1).max(120),
  pricePaise: z.number().int().nonnegative().max(1_000_000_000),
  qty: z.number().positive().max(1000).optional(),
});

/** A user-reviewed scanned receipt (OCR ran on-device before this call). */
export const createReceiptSchema = z.object({
  merchant: z.string().trim().max(120).optional(),
  category: categorySchema.default('Other'),
  amount: z.number().positive().max(10_000_000), // rupees
  receiptDate: z.string().datetime().optional(),
  rawText: z.string().max(20_000).optional(),
  items: z.array(receiptItemSchema).max(200).optional(),
  groupId: z.string().uuid().optional(),
});

/** Create a 1:1 (or off-app) money request. Payer is a paxa user or a name. */
export const createPaymentRequestSchema = z
  .object({
    toUserId: z.string().uuid().optional(),
    toName: z.string().trim().min(1).max(60).optional(),
    amount: z.number().positive().max(10_000_000), // rupees
    note: z.string().max(280).optional(),
    category: categorySchema.default('Other'),
    receiptId: z.string().uuid().optional(),
    groupId: z.string().uuid().optional(),
    dueAt: z.string().datetime().optional(),
  })
  .refine(v => Boolean(v.toUserId) || Boolean(v.toName), {
    message: 'Provide toUserId or toName',
    path: ['toName'],
  });

export type CreateReceipt = z.infer<typeof createReceiptSchema>;
export type CreatePaymentRequest = z.infer<typeof createPaymentRequestSchema>;
export type SpendingCategory = z.infer<typeof categorySchema>;

export type Signup = z.infer<typeof signupSchema>;
export type Login = z.infer<typeof loginSchema>;
export type CreateGroup = z.infer<typeof createGroupSchema>;
export type AddExpense = z.infer<typeof addExpenseSchema>;
export type InitiateSettlement = z.infer<typeof initiateSettlementSchema>;
export type RegisterDevice = z.infer<typeof registerDeviceSchema>;
