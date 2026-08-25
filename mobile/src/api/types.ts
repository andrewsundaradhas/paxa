/** Response shapes from the paxa API (see /server). */

export type ApiUser = {
  id: string;
  email: string;
  displayName: string;
  stickerColor: string;
  payoutVpa: string | null;
  emailVerified: boolean;
  avatarUrl?: string | null;
  authProvider?: string;
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

// ---- receipts / payment requests / notifications / insights ----

export type ReceiptItem = {name: string; pricePaise: number; qty?: number};

export type ApiReceipt = {
  id: string;
  userId: string;
  groupId: string | null;
  merchant: string | null;
  category: string;
  totalPaise: number;
  receiptDate: string | null;
  rawText: string | null;
  items: ReceiptItem[] | null;
  status: string;
  createdAt: string;
};

export type PaymentRequestStatus = 'pending' | 'paid' | 'cancelled';

export type ApiPaymentRequest = {
  id: string;
  fromUser: string;
  toUser: string | null;
  toName: string;
  amountPaise: number;
  note: string | null;
  category: string;
  status: PaymentRequestStatus;
  receiptId: string | null;
  groupId: string | null;
  dueAt: string | null;
  remindedAt: string | null;
  paidAt: string | null;
  createdAt: string;
  /** Creditor's linked UPI VPA + name — lets a payer be redirected to UPI. */
  payeeVpa?: string | null;
  payeeName?: string | null;
};

export type PaymentRequestBuckets = {owedToMe: ApiPaymentRequest[]; iOwe: ApiPaymentRequest[]};

export type ApiNotification = {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
};

export type InsightCategoryRow = {category: string; amountPaise: number};

export type InsightPayload = {
  period: string;
  totals: {spentPaise: number; receivedPaise: number; iOwePaise: number; owedToMePaise: number};
  categories: InsightCategoryRow[];
  weekday: {weekdayPaise: number; weekendPaise: number};
  insights: string[];
};
