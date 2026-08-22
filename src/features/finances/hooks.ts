import { keepPreviousData, useQueryClient, type QueryClient } from '@tanstack/react-query'
import {
  getGetApiV1OrganizationsOrgIdFinancialAccountsBalancesQueryKey,
  getGetApiV1OrganizationsOrgIdFinancialMovementsQueryKey,
  useGetApiV1OrganizationsOrgIdFinancialAccountsBalances,
  useGetApiV1OrganizationsOrgIdFinancialMovements,
  usePostApiV1OrganizationsOrgIdFinancialAccountsTransfers,
  getGetApiV1OrganizationsOrgIdPaymentInstructionsQueryKey,
  useDeleteApiV1OrganizationsOrgIdPaymentInstructionsId,
  useGetApiV1OrganizationsOrgIdPaymentInstructions,
  usePatchApiV1OrganizationsOrgIdPaymentInstructionsId,
  usePostApiV1OrganizationsOrgIdPaymentInstructions,
} from '@/api/generated/endpoints/finances/finances'
import type {
  AccountBalance,
  GetApiV1OrganizationsOrgIdFinancialMovementsParams,
  LedgerMovement,
  PaymentInstruction,
} from '@/api/generated/model'
import { asArray } from '@/lib/list-result'
import type { ListResult } from '@/lib/list-result'

export function useAccountBalances(orgId: string | undefined) {
  const query = useGetApiV1OrganizationsOrgIdFinancialAccountsBalances(orgId ?? '', {
    query: { enabled: !!orgId, staleTime: 30_000 },
  })
  return { ...query, balances: asArray<AccountBalance>(query.data?.data) }
}

export function useMovements(
  orgId: string | undefined,
  params: GetApiV1OrganizationsOrgIdFinancialMovementsParams,
): ListResult<LedgerMovement> {
  const query = useGetApiV1OrganizationsOrgIdFinancialMovements(orgId ?? '', params, {
    query: { enabled: !!orgId, placeholderData: keepPreviousData },
  })
  const page = query.data?.data as
    | { data: LedgerMovement[]; total: number; totalPages: number }
    | undefined
  return {
    items: page?.data ?? [],
    total: page?.total ?? 0,
    totalPages: page?.totalPages ?? 1,
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
    isFetching: query.isFetching,
  }
}

export function useCreateTransfer(orgId: string, idempotencyKey: string) {
  const qc = useQueryClient()
  return usePostApiV1OrganizationsOrgIdFinancialAccountsTransfers({
    mutation: {
      onSuccess: () => {
        void qc.invalidateQueries({
          queryKey: getGetApiV1OrganizationsOrgIdFinancialAccountsBalancesQueryKey(orgId),
        })
        void qc.invalidateQueries({
          queryKey: getGetApiV1OrganizationsOrgIdFinancialMovementsQueryKey(orgId),
        })
      },
    },
    request: { headers: { 'Idempotency-Key': idempotencyKey } },
  })
}

/* ---------- Dónde puede pagar quien debe ---------- */

/**
 * **Las formas de pago que se le dicen al deudor.**
 *
 * No confundir con `payment-methods`, que ya existe: aquel es **cómo se
 * registró** un pago que ya entró; esto es **dónde puede pagar** quien todavía
 * debe, y viaja dentro del recordatorio de cobranza.
 *
 * Va **por organización** y no por acuerdo ni por concepto, y lo decidió el
 * esquema: una cuenta por cobrar puede no tener acuerdo —las creadas a mano no lo
 * tienen— y colgarlo de ahí habría dejado sin datos de pago justo a esos cobros.
 */
export function usePaymentInstructions(orgId: string | undefined, includeArchived = false) {
  const query = useGetApiV1OrganizationsOrgIdPaymentInstructions(
    orgId ?? '',
    // El parámetro viaja como cadena, no como booleano.
    includeArchived ? { includeArchived: 'true' } : undefined,
    { query: { enabled: !!orgId } },
  )
  const body = query.data?.data as { instructions: PaymentInstruction[] } | undefined
  return {
    ...query,
    instructions: asArray<PaymentInstruction>(body?.instructions),
  }
}

export function useCreatePaymentInstruction(orgId: string) {
  const qc = useQueryClient()
  return usePostApiV1OrganizationsOrgIdPaymentInstructions({
    mutation: { onSuccess: () => invalidateInstructions(qc, orgId) },
  })
}

export function useUpdatePaymentInstruction(orgId: string) {
  const qc = useQueryClient()
  return usePatchApiV1OrganizationsOrgIdPaymentInstructionsId({
    mutation: { onSuccess: () => invalidateInstructions(qc, orgId) },
  })
}

/**
 * **Archiva, no borra.** Un recordatorio que ya salió nombró esa cuenta, y quien
 * mire ese mensaje mañana tiene que poder saber a dónde se le pidió que pagara.
 * Desaparece del listado y de los recordatorios; sigue estando con
 * `includeArchived`.
 */
export function useArchivePaymentInstruction(orgId: string) {
  const qc = useQueryClient()
  return useDeleteApiV1OrganizationsOrgIdPaymentInstructionsId({
    mutation: { onSuccess: () => invalidateInstructions(qc, orgId) },
  })
}

function invalidateInstructions(qc: QueryClient, orgId: string): void {
  void qc.invalidateQueries({
    queryKey: getGetApiV1OrganizationsOrgIdPaymentInstructionsQueryKey(orgId),
  })
}
