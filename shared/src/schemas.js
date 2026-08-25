"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerDeviceSchema = exports.initiateSettlementSchema = exports.addExpenseSchema = exports.createGroupSchema = exports.splitModeSchema = exports.refreshSchema = exports.loginSchema = exports.signupSchema = exports.passwordSchema = exports.emailSchema = void 0;
/**
 * Zod request schemas — the single source of validation truth, imported by the
 * server (to validate incoming requests) and the mobile app (to validate forms
 * before sending). Money fields are in rupees at the API boundary; the server
 * converts to integer paise for storage + math.
 */
const zod_1 = require("zod");
exports.emailSchema = zod_1.z.string().trim().toLowerCase().email().max(254);
exports.passwordSchema = zod_1.z.string().min(8).max(128);
exports.signupSchema = zod_1.z.object({
    email: exports.emailSchema,
    password: exports.passwordSchema,
    displayName: zod_1.z.string().trim().min(1).max(60),
    deviceId: zod_1.z.string().max(128).optional(),
});
exports.loginSchema = zod_1.z.object({
    email: exports.emailSchema,
    password: zod_1.z.string().min(1).max(128),
    deviceId: zod_1.z.string().max(128).optional(),
});
exports.refreshSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(10),
});
exports.splitModeSchema = zod_1.z.enum(['equal', 'exact', 'percent', 'shares']);
exports.createGroupSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(1).max(80),
    fill: zod_1.z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    memberEmails: zod_1.z.array(exports.emailSchema).max(50).optional(),
});
exports.addExpenseSchema = zod_1.z.object({
    title: zod_1.z.string().trim().min(1).max(120),
    category: zod_1.z.string().trim().min(1).max(40).default('Food'),
    amount: zod_1.z.number().positive().max(10_000_000), // rupees
    paidBy: zod_1.z.string().uuid(),
    mode: exports.splitModeSchema,
    /** Participant user ids included in the split. */
    participants: zod_1.z.array(zod_1.z.string().uuid()).min(1).max(50),
    /** Per-participant value keyed by user id (paise for exact, % for percent, weight for shares). Omit for equal. */
    values: zod_1.z.record(zod_1.z.string().uuid(), zod_1.z.number().nonnegative()).optional(),
    note: zod_1.z.string().max(280).optional(),
});
exports.initiateSettlementSchema = zod_1.z.object({
    toUserId: zod_1.z.string().uuid(),
    amount: zod_1.z.number().positive().max(10_000_000), // rupees
    method: zod_1.z.enum(['upi', 'card']).default('upi'),
    /** Client-generated key so a retried request never double-records. */
    idempotencyKey: zod_1.z.string().min(8).max(80),
});
exports.registerDeviceSchema = zod_1.z.object({
    pushToken: zod_1.z.string().min(1).max(512),
    platform: zod_1.z.enum(['ios', 'android']),
    deviceId: zod_1.z.string().min(1).max(128),
});
