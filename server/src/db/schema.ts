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
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name').notNull(),
  emailVerified: boolean('email_verified').notNull().default(false),
  stickerColor: text('sticker_color').notNull().default('#fa00ff'),
  payoutVpa: text('payout_vpa'), // the user's OWN UPI id, stored only with consent
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
