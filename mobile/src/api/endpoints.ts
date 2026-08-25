import {apiClient} from './client';
import type {SplitMode} from '@shared/split';
import type {
  AuthResponse,
  ApiUser,
  ApiGroup,
  GroupDetail,
  Balances,
  ApiExpense,
  ApiSettlement,
  InitiateSettlementResponse,
  ApiReceipt,
  ReceiptItem,
  ApiPaymentRequest,
  PaymentRequestBuckets,
  ApiNotification,
  InsightPayload,
} from './types';

// ---- auth ----
export const apiSignup = (body: {email: string; password: string; displayName: string; deviceId?: string}) =>
  apiClient.post<AuthResponse>('/auth/signup', body).then(r => r.data);

export const apiLogin = (body: {email: string; password: string; deviceId?: string}) =>
  apiClient.post<AuthResponse>('/auth/login', body).then(r => r.data);

export const apiRefresh = (refreshToken: string) =>
  apiClient.post<AuthResponse>('/auth/refresh', {refreshToken}).then(r => r.data);

export const apiGoogleAuth = (body: {idToken: string; deviceId?: string}) =>
  apiClient.post<AuthResponse>('/auth/google', body).then(r => r.data);

export const apiAppleAuth = (body: {identityToken: string; fullName?: string; deviceId?: string}) =>
  apiClient.post<AuthResponse>('/auth/apple', body).then(r => r.data);

export const apiLogout = (refreshToken: string) =>
  apiClient.post('/auth/logout', {refreshToken}).then(r => r.data);

export const apiMe = () => apiClient.get<{user: ApiUser}>('/auth/me').then(r => r.data.user);

// ---- groups ----
export const apiListGroups = () => apiClient.get<{groups: ApiGroup[]}>('/groups').then(r => r.data.groups);

export const apiCreateGroup = (body: {name: string; fill?: string; memberEmails?: string[]}) =>
  apiClient.post<{group: ApiGroup; added: string[]; notFoundEmails: string[]}>('/groups', body).then(r => r.data);

export const apiGetGroup = (groupId: string) => apiClient.get<GroupDetail>(`/groups/${groupId}`).then(r => r.data);

export const apiGetBalances = (groupId: string) =>
  apiClient.get<Balances>(`/groups/${groupId}/balances`).then(r => r.data);

export const apiCreateInvite = (groupId: string) =>
  apiClient.post<{token: string; expiresAt: string}>(`/groups/${groupId}/invite`, {}).then(r => r.data);

export const apiJoinGroup = (token: string) =>
  apiClient.post<{groupId: string}>(`/groups/join/${token}`, {}).then(r => r.data);

// ---- expenses ----
export const apiListExpenses = (groupId: string) =>
  apiClient.get<{expenses: ApiExpense[]}>(`/groups/${groupId}/expenses`).then(r => r.data.expenses);

export const apiAddExpense = (
  groupId: string,
  body: {
    title: string;
    category?: string;
    amount: number;
    paidBy: string;
    mode: SplitMode;
    participants: string[];
    values?: Record<string, number>;
    note?: string;
  },
) => apiClient.post<{expense: ApiExpense; shares: Record<string, number>}>(`/groups/${groupId}/expenses`, body).then(r => r.data);

export const apiDeleteExpense = (groupId: string, expenseId: string) =>
  apiClient.delete(`/groups/${groupId}/expenses/${expenseId}`).then(r => r.data);

// ---- settlements ----
export const apiListSettlements = (groupId: string) =>
  apiClient.get<{settlements: ApiSettlement[]}>(`/groups/${groupId}/settlements`).then(r => r.data.settlements);

export const apiInitiateSettlement = (
  groupId: string,
  body: {toUserId: string; amount: number; method?: 'upi' | 'card'; idempotencyKey: string},
) => apiClient.post<InitiateSettlementResponse>(`/groups/${groupId}/settlements`, body).then(r => r.data);

export const apiSettlementStatus = (id: string) =>
  apiClient.get<{status: string; settlement: ApiSettlement}>(`/settlements/${id}/status`).then(r => r.data);

export const apiConfirmSettlement = (id: string, upiRef?: string) =>
  apiClient.post<{settlement: ApiSettlement}>(`/settlements/${id}/confirm`, {upiRef}).then(r => r.data);

// ---- devices ----
export const apiRegisterDevice = (body: {pushToken: string; platform: 'ios' | 'android'; deviceId: string}) =>
  apiClient.post('/devices/register', body).then(r => r.data);

// ---- receipts ----
export const apiCreateReceipt = (body: {
  merchant?: string;
  category?: string;
  amount: number;
  receiptDate?: string;
  rawText?: string;
  items?: ReceiptItem[];
  groupId?: string;
}) => apiClient.post<{receipt: ApiReceipt}>('/receipts', body).then(r => r.data.receipt);

export const apiListReceipts = () => apiClient.get<{receipts: ApiReceipt[]}>('/receipts').then(r => r.data.receipts);

export const apiDeleteReceipt = (id: string) => apiClient.delete(`/receipts/${id}`).then(r => r.data);

// ---- payment requests ----
export const apiCreatePaymentRequest = (body: {
  toUserId?: string;
  toName?: string;
  amount: number;
  note?: string;
  category?: string;
  receiptId?: string;
  groupId?: string;
  dueAt?: string;
}) => apiClient.post<{paymentRequest: ApiPaymentRequest}>('/payment-requests', body).then(r => r.data.paymentRequest);

export const apiListPaymentRequests = () =>
  apiClient.get<PaymentRequestBuckets>('/payment-requests').then(r => r.data);

export const apiMarkRequestPaid = (id: string) =>
  apiClient.post<{paymentRequest: ApiPaymentRequest}>(`/payment-requests/${id}/paid`, {}).then(r => r.data.paymentRequest);

export const apiCancelRequest = (id: string) =>
  apiClient.post<{paymentRequest: ApiPaymentRequest}>(`/payment-requests/${id}/cancel`, {}).then(r => r.data.paymentRequest);

export const apiRemindRequest = (id: string) =>
  apiClient.post<{ok: boolean}>(`/payment-requests/${id}/remind`, {}).then(r => r.data);

// ---- notifications ----
export const apiListNotifications = () =>
  apiClient.get<{notifications: ApiNotification[]; unread: number}>('/notifications').then(r => r.data);

export const apiMarkNotificationRead = (id: string) =>
  apiClient.post(`/notifications/${id}/read`, {}).then(r => r.data);

export const apiMarkAllNotificationsRead = () =>
  apiClient.post('/notifications/read-all', {}).then(r => r.data);

// ---- insights ----
export const apiGetInsights = (params?: {period?: string; refresh?: boolean}) =>
  apiClient
    .get<InsightPayload>('/insights', {params: {period: params?.period, refresh: params?.refresh ? 1 : undefined}})
    .then(r => r.data);
