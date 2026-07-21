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
} from './types';

// ---- auth ----
export const apiSignup = (body: {email: string; password: string; displayName: string; deviceId?: string}) =>
  apiClient.post<AuthResponse>('/auth/signup', body).then(r => r.data);

export const apiLogin = (body: {email: string; password: string; deviceId?: string}) =>
  apiClient.post<AuthResponse>('/auth/login', body).then(r => r.data);

export const apiRefresh = (refreshToken: string) =>
  apiClient.post<AuthResponse>('/auth/refresh', {refreshToken}).then(r => r.data);

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
