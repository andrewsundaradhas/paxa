/**
 * Zod request schemas — the single source of validation truth, imported by the
 * server (to validate incoming requests) and the mobile app (to validate forms
 * before sending). Money fields are in rupees at the API boundary; the server
 * converts to integer paise for storage + math.
 */
import {z} from 'zod';

export const emailSchema = z.string().trim().toLowerCase().email().max(254);
export const passwordSchema = z.string().min(8).max(128);

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

export type Signup = z.infer<typeof signupSchema>;
export type Login = z.infer<typeof loginSchema>;
export type CreateGroup = z.infer<typeof createGroupSchema>;
export type AddExpense = z.infer<typeof addExpenseSchema>;
export type InitiateSettlement = z.infer<typeof initiateSettlementSchema>;
export type RegisterDevice = z.infer<typeof registerDeviceSchema>;
