import { keepPreviousData, useQueryClient, type QueryClient } from '@tanstack/react-query'
import {
  getGetApiV1OrganizationsOrgIdMessagingCollectionPolicyQueryKey,
  getGetApiV1OrganizationsOrgIdMessagingConsentsQueryKey,
  useGetApiV1OrganizationsOrgIdMessagingCollectionPolicy,
  useGetApiV1OrganizationsOrgIdMessagingConsents,
  useGetApiV1OrganizationsOrgIdMessagingMessages,
  usePutApiV1OrganizationsOrgIdMessagingCollectionPolicy,
  usePutApiV1OrganizationsOrgIdMessagingConsents,
} from '@/api/generated/endpoints/mensajería/mensajería'
import {
  getGetApiV1OrganizationsOrgIdWhatsappTemplatesQueryKey,
  useGetApiV1OrganizationsOrgIdWhatsappTemplates,
  usePostApiV1OrganizationsOrgIdWhatsappTemplatesSync,
} from '@/api/generated/endpoints/whats-app/whats-app'
import type {
  CollectionPolicy,
  GetApiV1OrganizationsOrgIdMessagingConsentsParams,
  GetApiV1OrganizationsOrgIdMessagingMessagesParams,
  MessageConsent,
  OutboundMessage,
  WhatsAppTemplate,
  WhatsAppTemplateList,
} from '@/api/generated/model'
import { asArray, type ListResult } from '@/lib/list-result'

/**
 * Orval tipa el cuerpo como la unión de **todas** las respuestas documentadas,
 * así que un `200` llega mezclado con el `ErrorResponse` del `4xx`. En este lado
 * esa unión no puede darse: el mutator lanza `ApiError` ante cualquier respuesta
 * que no sea correcta, así que lo que llega a `query.data` es siempre el éxito.
 *
 * De ahí el cast, que es justo el caso que §89 admite —el compilador no puede
 * saber algo que el contrato sí garantiza— y por eso se escribe **una vez aquí**
 * en lugar de repetirlo en cada hook.
 */
function body<T>(data: { data: unknown } | undefined): T | undefined {
  return data?.data as T | undefined
}

/** Una página del API, ya con la forma que comparten los diez listados. */
interface Page<T> {
  data: T[]
  total: number
  totalPages: number
}

/* ---------- Política de cobranza ---------- */

/**
 * La política de la organización: si se escribe al deudor, en qué horas no se le
 * molesta y con qué plantillas.
 *
 * Se lee con `messaging.read` y se escribe con `messaging.settings.manage` **más**
 * la feature `whatsapp_outbound`. Es la única ruta del lote con feature, así que
 * es la única que puede responder `FEATURE_NOT_AVAILABLE`.
 */
export function useCollectionPolicy(orgId: string | undefined): {
  policy: CollectionPolicy | undefined
  isPending: boolean
  isError: boolean
  error: unknown
  refetch: () => void
} {
  const query = useGetApiV1OrganizationsOrgIdMessagingCollectionPolicy(orgId ?? '', {
    query: { enabled: !!orgId },
  })
  return {
    policy: body<CollectionPolicy>(query.data),
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
    refetch: () => void query.refetch(),
  }
}

export function useUpdateCollectionPolicy(orgId: string) {
  const qc = useQueryClient()
  return usePutApiV1OrganizationsOrgIdMessagingCollectionPolicy({
    mutation: {
      onSuccess: () => {
        void qc.invalidateQueries({
          queryKey: getGetApiV1OrganizationsOrgIdMessagingCollectionPolicyQueryKey(orgId),
        })
      },
    },
  })
}

/* ---------- Historial de mensajes ---------- */

/**
 * Lo que se le ha escrito a los deudores, paginado y filtrable por estado y por
 * contacto.
 *
 * `keepPreviousData` como el resto de listados: al pasar de página se conserva
 * lo anterior en vez de parpadear a esqueleto (§45.1).
 */
export function useOutboundMessages(
  orgId: string | undefined,
  params: GetApiV1OrganizationsOrgIdMessagingMessagesParams,
): ListResult<OutboundMessage> {
  const query = useGetApiV1OrganizationsOrgIdMessagingMessages(orgId ?? '', params, {
    query: { enabled: !!orgId, placeholderData: keepPreviousData },
  })
  const page = body<Page<OutboundMessage>>(query.data)
  return {
    items: asArray<OutboundMessage>(page?.data),
    total: page?.total ?? 0,
    totalPages: page?.totalPages ?? 0,
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
    isFetching: query.isFetching,
  }
}

/* ---------- Consentimiento ---------- */

export function useMessageConsents(
  orgId: string | undefined,
  params: GetApiV1OrganizationsOrgIdMessagingConsentsParams,
): ListResult<MessageConsent> {
  const query = useGetApiV1OrganizationsOrgIdMessagingConsents(orgId ?? '', params, {
    query: { enabled: !!orgId, placeholderData: keepPreviousData },
  })
  const page = body<Page<MessageConsent>>(query.data)
  return {
    items: asArray<MessageConsent>(page?.data),
    total: page?.total ?? 0,
    totalPages: page?.totalPages ?? 0,
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
    isFetching: query.isFetching,
  }
}

/**
 * Cambiar el consentimiento de un teléfono.
 *
 * Invalida **la lista entera con cualquier filtro y en cualquier página** —la
 * clave sin parámetros es prefijo de todas—, y también el historial: `REVOKED`
 * cambia lo que va a pasar con lo que aún está en cola.
 */
export function useSetMessageConsent(orgId: string) {
  const qc = useQueryClient()
  return usePutApiV1OrganizationsOrgIdMessagingConsents({
    mutation: {
      onSuccess: () => invalidateConsents(qc, orgId),
    },
  })
}

function invalidateConsents(qc: QueryClient, orgId: string): void {
  void qc.invalidateQueries({
    queryKey: getGetApiV1OrganizationsOrgIdMessagingConsentsQueryKey(orgId),
  })
}

/* ---------- Plantillas ---------- */

/**
 * Las que la organización puede usar: **las de la plataforma y las suyas**.
 *
 * La política nombra plantillas por su `templateKey`, así que esta consulta es
 * lo que convierte esa clave en un desplegable con nombres en vez de un campo de
 * texto donde una errata es un `template_unknown` que nadie ve hasta que un
 * mensaje no sale.
 */
export function useWhatsAppTemplates(orgId: string | undefined): {
  templates: WhatsAppTemplate[]
  isPending: boolean
  isError: boolean
  error: unknown
  refetch: () => void
} {
  const query = useGetApiV1OrganizationsOrgIdWhatsappTemplates(orgId ?? '', {
    query: { enabled: !!orgId },
  })
  return {
    templates: asArray<WhatsAppTemplate>(body<WhatsAppTemplateList>(query.data)?.templates),
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
    refetch: () => void query.refetch(),
  }
}

/**
 * «Actualizar estado»: contrasta lo guardado contra lo que dice Meta ahora.
 *
 * Es el botón que resuelve el caso más común de la pantalla de plantillas — una
 * que se aprobó hace un rato y aquí sigue en revisión.
 */
export function useSyncWhatsAppTemplates(orgId: string) {
  const qc = useQueryClient()
  return usePostApiV1OrganizationsOrgIdWhatsappTemplatesSync({
    mutation: {
      onSuccess: () => {
        void qc.invalidateQueries({
          queryKey: getGetApiV1OrganizationsOrgIdWhatsappTemplatesQueryKey(orgId),
        })
      },
    },
  })
}
