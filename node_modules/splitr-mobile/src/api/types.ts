/** Response shapes from the paxa API (see /server). */

export type ApiUser = {
  id: string;
  email: string;
  displayName: string;
  stickerColor: string;
  payoutVpa: string | null;
  emailVerified: boolean;
};

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: ApiUser;
};

export type ApiGroup = {
  id: string;
  name: string;
  fill: string;
  createdBy: string;
  createdAt: string;
};

export type ApiMember = {
  id: string;
  displayName: string;
  email: string;
  stickerColor: string;
  payoutVpa: string | null;
};

export type Transfer = {from: string; to: string; amountPaise: number};

export type Balances = {net: Record<string, number>; transfers: Transfer[]};

export type GroupDetail = {
  group: ApiGroup;
  members: ApiMember[];
  balances: Balances;
};

export type ApiExpense = {
  id: string;
  groupId: string;
  title: string;
  category: string;
  amountPaise: number;
  paidBy: string;
  note: string | null;
  createdBy: string;
  createdAt: string;
  deletedAt: string | null;
};

export type ApiSettlement = {
  id: string;
  groupId: string;
  fromUser: string;
  toUser: string;
  amountPaise: number;
  method: string;
  status: 'initiated' | 'completed' | 'failed';
  upiRef: string | null;
  createdAt: string;
  completedAt: string | null;
};

export type InitiateSettlementResponse = {
  settlement: ApiSettlement;
  payeeVpa: string | null;
  payeeName?: string;
};
