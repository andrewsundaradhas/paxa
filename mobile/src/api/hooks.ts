/**
 * TanStack Query hooks over the paxa API. Screens use these instead of the local
 * seed store once a backend is connected; the server stays the source of truth
 * and the cache invalidations keep balances fresh after every mutation.
 */
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import type {SplitMode} from '@shared/split';
import {
  apiListGroups,
  apiGetGroup,
  apiGetBalances,
  apiCreateGroup,
  apiListExpenses,
  apiAddExpense,
  apiDeleteExpense,
  apiListSettlements,
  apiInitiateSettlement,
  apiConfirmSettlement,
  apiListPaymentRequests,
  apiCreatePaymentRequest,
  apiMarkRequestPaid,
  apiCancelRequest,
  apiRemindRequest,
  apiListNotifications,
  apiMarkNotificationRead,
  apiMarkAllNotificationsRead,
  apiGetInsights,
  apiListReceipts,
} from './endpoints';

export const qk = {
  groups: ['groups'] as const,
  group: (id: string) => ['group', id] as const,
  balances: (id: string) => ['balances', id] as const,
  expenses: (id: string) => ['expenses', id] as const,
  settlements: (id: string) => ['settlements', id] as const,
  paymentRequests: ['paymentRequests'] as const,
  notifications: ['notifications'] as const,
  insights: (period?: string) => ['insights', period ?? 'current'] as const,
  receipts: ['receipts'] as const,
};

export const useGroups = () => useQuery({queryKey: qk.groups, queryFn: apiListGroups});
export const useGroup = (id: string) => useQuery({queryKey: qk.group(id), queryFn: () => apiGetGroup(id), enabled: !!id});
export const useBalances = (id: string) => useQuery({queryKey: qk.balances(id), queryFn: () => apiGetBalances(id), enabled: !!id});
export const useExpenses = (id: string) => useQuery({queryKey: qk.expenses(id), queryFn: () => apiListExpenses(id), enabled: !!id});
export const useSettlements = (id: string) =>
  useQuery({queryKey: qk.settlements(id), queryFn: () => apiListSettlements(id), enabled: !!id});

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {name: string; fill?: string; memberEmails?: string[]}) => apiCreateGroup(body),
    onSuccess: () => qc.invalidateQueries({queryKey: qk.groups}),
  });
}

export function useAddExpense(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      title: string;
      category?: string;
      amount: number;
      paidBy: string;
      mode: SplitMode;
      participants: string[];
      values?: Record<string, number>;
      note?: string;
    }) => apiAddExpense(groupId, body),
    onSuccess: () => {
      qc.invalidateQueries({queryKey: qk.expenses(groupId)});
      qc.invalidateQueries({queryKey: qk.balances(groupId)});
      qc.invalidateQueries({queryKey: qk.group(groupId)});
    },
  });
}

export function useDeleteExpense(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (expenseId: string) => apiDeleteExpense(groupId, expenseId),
    onSuccess: () => {
      qc.invalidateQueries({queryKey: qk.expenses(groupId)});
      qc.invalidateQueries({queryKey: qk.balances(groupId)});
    },
  });
}

export function useInitiateSettlement(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {toUserId: string; amount: number; method?: 'upi' | 'card'; idempotencyKey: string}) =>
      apiInitiateSettlement(groupId, body),
    onSuccess: () => qc.invalidateQueries({queryKey: qk.settlements(groupId)}),
  });
}

export function useConfirmSettlement(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({id, upiRef}: {id: string; upiRef?: string}) => apiConfirmSettlement(id, upiRef),
    onSuccess: () => {
      qc.invalidateQueries({queryKey: qk.settlements(groupId)});
      qc.invalidateQueries({queryKey: qk.balances(groupId)});
    },
  });
}

// ---- payment requests ----
export const usePaymentRequests = (enabled = true) =>
  useQuery({queryKey: qk.paymentRequests, queryFn: apiListPaymentRequests, enabled});

export function useCreatePaymentRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: apiCreatePaymentRequest,
    onSuccess: () => qc.invalidateQueries({queryKey: qk.paymentRequests}),
  });
}

export function useMarkRequestPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiMarkRequestPaid(id),
    onSuccess: () => {
      qc.invalidateQueries({queryKey: qk.paymentRequests});
      qc.invalidateQueries({queryKey: qk.insights()});
    },
  });
}

export function useCancelRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiCancelRequest(id),
    onSuccess: () => qc.invalidateQueries({queryKey: qk.paymentRequests}),
  });
}

export function useRemindRequest() {
  return useMutation({mutationFn: (id: string) => apiRemindRequest(id)});
}

// ---- notifications ----
export const useNotifications = () =>
  useQuery({queryKey: qk.notifications, queryFn: apiListNotifications});

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiMarkNotificationRead(id),
    onSuccess: () => qc.invalidateQueries({queryKey: qk.notifications}),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: apiMarkAllNotificationsRead,
    onSuccess: () => qc.invalidateQueries({queryKey: qk.notifications}),
  });
}

// ---- insights ----
export const useInsights = (period?: string, enabled = true) =>
  useQuery({queryKey: qk.insights(period), queryFn: () => apiGetInsights({period}), enabled});

// ---- notifications (gated) ----
export const useNotificationsGated = (enabled = true) =>
  useQuery({queryKey: qk.notifications, queryFn: apiListNotifications, enabled});

// ---- receipts ----
export const useReceipts = () => useQuery({queryKey: qk.receipts, queryFn: apiListReceipts});
