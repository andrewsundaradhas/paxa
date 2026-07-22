import crypto from 'crypto';
import {Router} from 'express';
import {eq, inArray} from 'drizzle-orm';
import {createGroupSchema} from '@splitr/shared';
import {db} from '../db/client';
import {groups, groupMembers, groupInvites, users} from '../db/schema';
import {asyncHandler, notFound, audit} from '../lib/http';
import {requireAuth, requireGroupMember, type AuthedRequest} from '../middleware';
import {getGroupBalances} from '../services/balance';

export const groupsRouter = Router();
groupsRouter.use(requireAuth);

/** GET /groups → groups the user belongs to. */
groupsRouter.get(
  '/',
  asyncHandler(async (req: AuthedRequest, res) => {
    const memberships = await db.select().from(groupMembers).where(eq(groupMembers.userId, req.user!.id));
    const ids = memberships.map(m => m.groupId);
    const rows = ids.length ? await db.select().from(groups).where(inArray(groups.id, ids)) : [];
    res.json({groups: rows});
  }),
);

/** POST /groups → create a group; creator becomes owner; add known members by email. */
groupsRouter.post(
  '/',
  asyncHandler(async (req: AuthedRequest, res) => {
    const {name, fill, memberEmails} = createGroupSchema.parse(req.body);
    const me = req.user!.id;

    const [group] = await db.insert(groups).values({name, fill: fill ?? '#02bbff', createdBy: me}).returning();
    await db.insert(groupMembers).values({groupId: group.id, userId: me, role: 'owner'});

    let added: string[] = [];
    let notFoundEmails: string[] = [];
    if (memberEmails?.length) {
      const found = await db.select().from(users).where(inArray(users.email, memberEmails));
      const foundEmails = new Set(found.map(u => u.email));
      notFoundEmails = memberEmails.filter(e => !foundEmails.has(e));
      const toAdd = found.filter(u => u.id !== me);
      if (toAdd.length) {
        await db.insert(groupMembers).values(toAdd.map(u => ({groupId: group.id, userId: u.id}))).onConflictDoNothing();
        added = toAdd.map(u => u.id);
      }
    }
    await audit(me, 'create_group', 'group', group.id, {added});
    res.status(201).json({group, added, notFoundEmails});
  }),
);

/** POST /groups/join/:token → join via an invite link. */
groupsRouter.post(
  '/join/:token',
  asyncHandler(async (req: AuthedRequest, res) => {
    const [invite] = await db.select().from(groupInvites).where(eq(groupInvites.token, req.params.token)).limit(1);
    if (!invite || invite.expiresAt.getTime() < Date.now()) {
      throw notFound('Invite is invalid or expired');
    }
    await db.insert(groupMembers).values({groupId: invite.groupId, userId: req.user!.id}).onConflictDoNothing();
    await audit(req.user!.id, 'join_group', 'group', invite.groupId);
    res.json({groupId: invite.groupId});
  }),
);

// ---- routes scoped to a group the caller must belong to ----
groupsRouter.get(
  '/:groupId',
  requireGroupMember,
  asyncHandler(async (req, res) => {
    const [group] = await db.select().from(groups).where(eq(groups.id, req.params.groupId)).limit(1);
    if (!group) {
      throw notFound();
    }
    const members = await db
      .select({id: users.id, displayName: users.displayName, email: users.email, stickerColor: users.stickerColor, payoutVpa: users.payoutVpa})
      .from(groupMembers)
      .innerJoin(users, eq(users.id, groupMembers.userId))
      .where(eq(groupMembers.groupId, group.id));
    const {net, transfers} = await getGroupBalances(group.id);
    res.json({group, members, balances: {net, transfers}});
  }),
);

/** GET /groups/:groupId/balances → authoritative net balances + simplified transfers. */
groupsRouter.get(
  '/:groupId/balances',
  requireGroupMember,
  asyncHandler(async (req, res) => {
    res.json(await getGroupBalances(req.params.groupId));
  }),
);

/** POST /groups/:groupId/invite → mint a 7-day invite token. */
groupsRouter.post(
  '/:groupId/invite',
  requireGroupMember,
  asyncHandler(async (req: AuthedRequest, res) => {
    const token = crypto.randomBytes(18).toString('base64url');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db.insert(groupInvites).values({groupId: req.params.groupId, token, createdBy: req.user!.id, expiresAt});
    res.status(201).json({token, expiresAt});
  }),
);
