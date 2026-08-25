/**
 * Database schema (Drizzle / Postgres). Money is stored as integer **paise**.
 * Soft-deletes via `deletedAt`. Designed for Supabase Postgres; enable
 * Row-Level Security on these tables in production (see README).
 */
import {pgTable, uuid, text, integer, timestamp, boolean, jsonb, unique, index} from 'drizzle-orm/pg-core';
import {sql} from 'drizzle-orm';

const id = () => uuid('id').primaryKey().default(sql`gen_random_uuid()`);
const now = (name: string) => timestamp(name, {withTimezone: true}).defaultNow().notNull();

export const users = pgTable('users', {
  id: id(),
  email: text('email').notNull().unique(),
  // Nullable: OAuth-only accounts (Google/Apple) have no password.
  passwordHash: text('password_hash'),
  displayName: text('display_name').notNull(),
  emailVerified: boolean('email_verified').notNull().default(false),
  stickerColor: text('sticker_color').notNull().default('#fa00ff'),
  payoutVpa: text('payout_vpa'), // the user's OWN UPI id, stored only with consent
  // Sign-in method + provider subject id. 'password' | 'google' | 'apple'.
  // Account-linking: a Google/Apple sign-in matched to an existing email adopts
  // that account instead of creating a duplicate.
  authProvider: text('auth_provider').notNull().default('password'),
  googleSub: text('google_sub'),
  appleSub: text('apple_sub'),
  avatarUrl: text('avatar_url'),
  createdAt: now('created_at'),
  updatedAt: now('updated_at'),
});

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: id(),
    userId: uuid('user_id').notNull().references(() => users.id, {onDelete: 'cascade'}),
    tokenHash: text('token_hash').notNull(), // sha-256 of the opaque token; never store the raw token
    deviceId: text('device_id'),
    expiresAt: timestamp('expires_at', {withTimezone: true}).notNull(),
    revokedAt: timestamp('revoked_at', {withTimezone: true}),
    createdAt: now('created_at'),
  },
  t => ({userIdx: index('refresh_user_idx').on(t.userId)}),
);

export const groups = pgTable('groups', {
  id: id(),
  name: text('name').notNull(),
  fill: text('fill').notNull().default('#02bbff'),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: now('created_at'),
});

export const groupMembers = pgTable(
  'group_members',
  {
    id: id(),
    groupId: uuid('group_id').notNull().references(() => groups.id, {onDelete: 'cascade'}),
    userId: uuid('user_id').notNull().references(() => users.id, {onDelete: 'cascade'}),
    role: text('role').notNull().default('member'), // 'owner' | 'member'
    joinedAt: now('joined_at'),
  },
  t => ({uniqMember: unique('uniq_group_member').on(t.groupId, t.userId), gIdx: index('member_group_idx').on(t.groupId)}),
);

export const groupInvites = pgTable('group_invites', {
  id: id(),
  groupId: uuid('group_id').notNull().references(() => groups.id, {onDelete: 'cascade'}),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', {withTimezone: true}).notNull(),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: now('created_at'),
});

export const expenses = pgTable(
  'expenses',
  {
    id: id(),
    groupId: uuid('group_id').notNull().references(() => groups.id, {onDelete: 'cascade'}),
    title: text('title').notNull(),
    category: text('category').notNull().default('Food'),
    amountPaise: integer('amount_paise').notNull(),
    paidBy: uuid('paid_by').notNull().references(() => users.id),
    note: text('note'),
    createdBy: uuid('created_by').notNull().references(() => users.id),
    createdAt: now('created_at'),
    deletedAt: timestamp('deleted_at', {withTimezone: true}),
  },
  t => ({gIdx: index('expense_group_idx').on(t.groupId)}),
);

export const expenseSplits = pgTable(
  'expense_splits',
  {
    id: id(),
    expenseId: uuid('expense_id').notNull().references(() => expenses.id, {onDelete: 'cascade'}),
    userId: uuid('user_id').notNull().references(() => users.id),
    sharePaise: integer('share_paise').notNull(),
  },
  t => ({uniqSplit: unique('uniq_expense_split').on(t.expenseId, t.userId)}),
);

export const settlements = pgTable(
  'settlements',
  {
    id: id(),
    groupId: uuid('group_id').notNull().references(() => groups.id, {onDelete: 'cascade'}),
    fromUser: uuid('from_user').notNull().references(() => users.id),
    toUser: uuid('to_user').notNull().references(() => users.id),
    amountPaise: integer('amount_paise').notNull(),
    method: text('method').notNull().default('upi'),
    status: text('status').notNull().default('initiated'), // 'initiated' | 'completed' | 'failed'
    upiRef: text('upi_ref'),
    idempotencyKey: text('idempotency_key').notNull().unique(),
    createdAt: now('created_at'),
    completedAt: timestamp('completed_at', {withTimezone: true}),
  },
  t => ({gIdx: index('settlement_group_idx').on(t.groupId)}),
);

export const auditLog = pgTable('audit_log', {
  id: id(),
  userId: uuid('user_id').references(() => users.id, {onDelete: 'set null'}),
  action: text('action').notNull(),
  entity: text('entity').notNull(),
  entityId: text('entity_id'),
  meta: jsonb('meta'),
  createdAt: now('created_at'),
});

export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    id: id(),
    userId: uuid('user_id').notNull().references(() => users.id, {onDelete: 'cascade'}),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', {withTimezone: true}).notNull(),
    usedAt: timestamp('used_at', {withTimezone: true}),
    createdAt: now('created_at'),
  },
  t => ({userIdx: index('prt_user_idx').on(t.userId), hashIdx: index('prt_hash_idx').on(t.tokenHash)}),
);

export const devicePushTokens = pgTable(
  'device_push_tokens',
  {
    id: id(),
    userId: uuid('user_id').notNull().references(() => users.id, {onDelete: 'cascade'}),
    pushToken: text('push_token').notNull(),
    platform: text('platform').notNull(),
    deviceId: text('device_id').notNull(),
    lastActiveAt: now('last_active_at'),
    createdAt: now('created_at'),
  },
  t => ({uniqDevice: unique('uniq_user_device').on(t.userId, t.deviceId)}),
);

/**
 * A scanned bill/receipt. OCR runs on-device (ML Kit); the app posts the
 * user-reviewed structured result here. `items` holds line items as JSON.
 * The image itself is not stored server-side — only extracted fields — to keep
 * storage light and avoid holding user photos.
 */
export const receipts = pgTable(
  'receipts',
  {
    id: id(),
    userId: uuid('user_id').notNull().references(() => users.id, {onDelete: 'cascade'}),
    groupId: uuid('group_id').references(() => groups.id, {onDelete: 'set null'}),
    merchant: text('merchant'),
    category: text('category').notNull().default('Other'),
    totalPaise: integer('total_paise').notNull(),
    receiptDate: timestamp('receipt_date', {withTimezone: true}),
    rawText: text('raw_text'), // full OCR text, kept for re-parsing / user reference
    items: jsonb('items'), // [{name, qtyPaise?, pricePaise}]
    status: text('status').notNull().default('reviewed'), // 'reviewed' | 'converted'
    createdAt: now('created_at'),
    deletedAt: timestamp('deleted_at', {withTimezone: true}),
  },
  t => ({userIdx: index('receipt_user_idx').on(t.userId)}),
);

/**
 * A request for money from one person to another. The payer may be a paxa user
 * (`toUser`) or an off-app contact (`toName` only). Kept deliberately separate
 * from group `settlements` so 1:1 "you owe me" requests work without a group.
 */
export const paymentRequests = pgTable(
  'payment_requests',
  {
    id: id(),
    fromUser: uuid('from_user').notNull().references(() => users.id, {onDelete: 'cascade'}), // creditor
    toUser: uuid('to_user').references(() => users.id, {onDelete: 'set null'}), // payer, if a paxa user
    toName: text('to_name').notNull(), // display name of the payer (always set)
    amountPaise: integer('amount_paise').notNull(),
    note: text('note'),
    category: text('category').notNull().default('Other'),
    status: text('status').notNull().default('pending'), // 'pending' | 'paid' | 'cancelled'
    receiptId: uuid('receipt_id').references(() => receipts.id, {onDelete: 'set null'}),
    groupId: uuid('group_id').references(() => groups.id, {onDelete: 'set null'}),
    dueAt: timestamp('due_at', {withTimezone: true}),
    remindedAt: timestamp('reminded_at', {withTimezone: true}),
    paidAt: timestamp('paid_at', {withTimezone: true}),
    createdAt: now('created_at'),
  },
  t => ({
    fromIdx: index('preq_from_idx').on(t.fromUser),
    toIdx: index('preq_to_idx').on(t.toUser),
    statusIdx: index('preq_status_idx').on(t.status),
  }),
);

/** Persistent in-app notifications / reminders. */
export const notifications = pgTable(
  'notifications',
  {
    id: id(),
    userId: uuid('user_id').notNull().references(() => users.id, {onDelete: 'cascade'}),
    type: text('type').notNull(), // 'payment_request' | 'reminder' | 'paid' | 'system'
    title: text('title').notNull(),
    body: text('body'),
    data: jsonb('data'), // deep-link payload, e.g. {paymentRequestId}
    readAt: timestamp('read_at', {withTimezone: true}),
    createdAt: now('created_at'),
  },
  t => ({userIdx: index('notif_user_idx').on(t.userId, t.readAt)}),
);

/**
 * Cached spending insights per user per calendar month (`YYYY-MM`). Computed by
 * the server from the user's own history so the dashboard opens instantly
 * without recomputing on every load. Upserted on the unique (user, period) key.
 */
export const spendingInsights = pgTable(
  'spending_insights',
  {
    id: id(),
    userId: uuid('user_id').notNull().references(() => users.id, {onDelete: 'cascade'}),
    period: text('period').notNull(), // 'YYYY-MM'
    payload: jsonb('payload').notNull(), // {totals, categories, insights[]}
    generatedAt: now('generated_at'),
  },
  t => ({uniqPeriod: unique('uniq_user_period').on(t.userId, t.period)}),
);
