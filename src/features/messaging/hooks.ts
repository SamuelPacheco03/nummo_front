import { keepPreviousData, useQueryClient, type QueryClient } from '@tanstack/react-query'
import {
  getGetApiV1OrganizationsOrgIdMessagingCollectionPolicyQueryKey,
  getGetApiV1OrganizationsOrgIdMessagingConsentsQueryKey,
  getGetApiV1OrganizationsOrgIdMessagingMessagesQueryKey,
  useGetApiV1OrganizationsOrgIdMessagingCollectionPolicy,
  useGetApiV1OrganizationsOrgIdMessagingConsents,
  useGetApiV1OrganizationsOrgIdMessagingMessages,
  usePutApiV1OrganizationsOrgIdMessagingCollectionPolicy,
  usePostApiV1OrganizationsOrgIdMessagingCollectionRemindersRun,
  usePutApiV1OrganizationsOrgIdMessagingConsents,
} from '@/api/generated/endpoints/mensajería/mensajería'
/*
  `/whatsapp/account` sale del archivo de Assistant y no del de WhatsApp: el
  contrato las etiqueta con el tag `Assistant`, y Orval reparte por tag. Es una
  errata del backend anotada en SYNC-STATUS; se importa de donde están, que es lo
  único que no se puede arreglar desde aquí sin editar código generado (§88.2).
*/
import {
  useDeleteApiV1OrganizationsOrgIdWhatsappAccount,
  useGetApiV1OrganizationsOrgIdWhatsappAccount,
  usePutApiV1OrganizationsOrgIdWhatsappAccount,
  getGetApiV1OrganizationsOrgIdWhatsappAccountQueryKey,
} from '@/api/generated/endpoints/assistant/assistant'
import { getGetApiV1OrganizationsOrgIdMeCapabilitiesQueryKey } from '@/api/generated/endpoints/platform/platform'
import {
  getGetApiV1OrganizationsOrgIdWhatsappTemplateCategoriesQueryKey,
  getGetApiV1OrganizationsOrgIdWhatsappTemplatesQueryKey,
  useDeleteApiV1OrganizationsOrgIdWhatsappTemplateCategoriesCategoryId,
  useDeleteApiV1OrganizationsOrgIdWhatsappTemplatesTemplateKey,
  useGetApiV1OrganizationsOrgIdWhatsappTemplateCategories,
  useGetApiV1OrganizationsOrgIdWhatsappTemplates,
  usePatchApiV1OrganizationsOrgIdWhatsappTemplateCategoriesCategoryId,
  usePostApiV1OrganizationsOrgIdWhatsappTemplateCategories,
  usePostApiV1OrganizationsOrgIdWhatsappTemplates,
  usePostApiV1OrganizationsOrgIdWhatsappTemplatesSync,
  usePutApiV1OrganizationsOrgIdWhatsappTemplatesTemplateKeyCategory,
} from '@/api/generated/endpoints/whats-app/whats-app'
import type {
  CollectionPolicy,
  GetApiV1OrganizationsOrgIdMessagingConsentsParams,
  GetApiV1OrganizationsOrgIdMessagingMessagesParams,
  MessageConsent,
  OutboundMessage,
  WhatsAppAccount,
  WhatsAppAccountState,
  WhatsAppTemplate,
  WhatsAppTemplateCategory,
  WhatsAppTemplateCategoryList,
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

/* ---------- Categorías de plantilla ---------- */

/**
 * **Las nuestras**, no las de Meta.
 *
 * `metaCategory` (`UTILITY` · `MARKETING` · `AUTHENTICATION`) decide el precio y
 * las reglas de aprobación, y ni siquiera se elige del todo: Meta recategoriza
 * por su cuenta. Ésta responde a otra pregunta —«¿de qué va esta plantilla?»— y
 * es la que agrupa la lista.
 *
 * Devuelve **las de la plataforma y las propias**, y también **las archivadas**:
 * el contrato no filtra por `isActive`, así que quien pinta decide. Los sitios
 * donde se elige una ofrecen solo las activas; el cajón de categorías las enseña
 * todas, porque si no una archivada no se podría reactivar nunca.
 */
export function useWhatsAppTemplateCategories(orgId: string | undefined): {
  categories: WhatsAppTemplateCategory[]
  isPending: boolean
  isError: boolean
  error: unknown
} {
  const query = useGetApiV1OrganizationsOrgIdWhatsappTemplateCategories(orgId ?? '', {
    query: { enabled: !!orgId },
  })
  return {
    categories: asArray<WhatsAppTemplateCategory>(
      body<WhatsAppTemplateCategoryList>(query.data)?.categories,
    ),
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  }
}

export function useCreateWhatsAppTemplateCategory(orgId: string) {
  const qc = useQueryClient()
  return usePostApiV1OrganizationsOrgIdWhatsappTemplateCategories({
    mutation: { onSuccess: () => invalidateCategories(qc, orgId) },
  })
}

/**
 * Renombrar, describir, reordenar o **reactivar** una propia.
 *
 * Sobre una de la plataforma responde `422`, no `403`: la fila es una y
 * compartida, así que no es cuestión de permisos —un `OWNER` tampoco puede— sino
 * de a quién pertenece. Por eso el botón se apaga con `editable`, que lo dice el
 * contrato fila a fila, y no con el rol.
 */
export function useUpdateWhatsAppTemplateCategory(orgId: string) {
  const qc = useQueryClient()
  return usePatchApiV1OrganizationsOrgIdWhatsappTemplateCategoriesCategoryId({
    mutation: { onSuccess: () => invalidateCategories(qc, orgId) },
  })
}

/**
 * Archivar: baja lógica, la fila se conserva y deja de ofrecerse.
 *
 * **Con plantillas dentro responde `409` con cuántas son** y no las suelta por
 * debajo: archivar y desclasificar son dos decisiones y aquí solo se pidió una.
 */
export function useArchiveWhatsAppTemplateCategory(orgId: string) {
  const qc = useQueryClient()
  return useDeleteApiV1OrganizationsOrgIdWhatsappTemplateCategoriesCategoryId({
    mutation: { onSuccess: () => invalidateCategories(qc, orgId) },
  })
}

/**
 * Clasificar una plantilla propia. `categoryId: null` la deja sin clasificar,
 * que es un estado válido y no un hueco por rellenar.
 *
 * Las de la plataforma no se clasifican desde aquí —la fila la comparten todas
 * las organizaciones—, así que la pantalla ofrece esto solo en las propias.
 */
export function useSetWhatsAppTemplateCategory(orgId: string) {
  const qc = useQueryClient()
  return usePutApiV1OrganizationsOrgIdWhatsappTemplatesTemplateKeyCategory({
    mutation: { onSuccess: () => invalidateCategories(qc, orgId) },
  })
}

/**
 * Las dos consultas van juntas siempre: `templateCount` vive en la categoría y
 * `categoryId` en la plantilla, así que cualquiera de las dos mutaciones deja
 * vieja a la otra lista.
 */
function invalidateCategories(qc: QueryClient, orgId: string): void {
  void qc.invalidateQueries({
    queryKey: getGetApiV1OrganizationsOrgIdWhatsappTemplateCategoriesQueryKey(orgId),
  })
  void qc.invalidateQueries({
    queryKey: getGetApiV1OrganizationsOrgIdWhatsappTemplatesQueryKey(orgId),
  })
}

/* ---------- Cuenta propia de Meta (BYO) ---------- */

/**
 * **Desde qué número sale la cobranza.**
 *
 * Es una pregunta distinta de «¿puedo enviar?», y confundirlas lleva a una
 * pantalla que miente: `whatsapp_outbound` enciende el ciclo de cobranza, y esto
 * decide **por dónde**. Sin cuenta propia se envía por la de Nummo y cada
 * mensaje **consume cuota del plan**; con la propia los paga el negocio
 * directamente a Meta y no consume nada.
 *
 * Las tres rutas van detrás de la feature `whatsapp_byo`, así que la consulta se
 * ata a ella: pedirla sin el plan sería provocar el `403 FEATURE_NOT_AVAILABLE`
 * que la pantalla existe para no tener que enseñar (§88.5).
 */
export function useWhatsAppAccount(orgId: string | undefined, enabled = true) {
  const query = useGetApiV1OrganizationsOrgIdWhatsappAccount(orgId ?? '', {
    query: { enabled: enabled && !!orgId },
  })
  const state = body<WhatsAppAccountState>(query.data)
  return {
    connected: state?.connected ?? false,
    account: (state?.account ?? null) as WhatsAppAccount | null,
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
    refetch: () => void query.refetch(),
  }
}

/**
 * Conectar o reemplazar la cuenta.
 *
 * Invalida además **las capacidades y las plantillas**, y no por costumbre: al
 * conectar, el consumo del plan deja de subir —así que la barra de cupo cambia
 * de significado— y crear plantillas propias pasa a estar permitido.
 */
export function useConnectWhatsAppAccount(orgId: string) {
  const qc = useQueryClient()
  return usePutApiV1OrganizationsOrgIdWhatsappAccount({
    mutation: { onSuccess: () => invalidateAccount(qc, orgId) },
  })
}

/**
 * Desconectar. **No apaga la cobranza**: la devuelve a la cuenta de Nummo, y con
 * ella vuelve a consumir cuota. Quien lo pulsa tiene que saberlo antes.
 */
export function useDisconnectWhatsAppAccount(orgId: string) {
  const qc = useQueryClient()
  return useDeleteApiV1OrganizationsOrgIdWhatsappAccount({
    mutation: { onSuccess: () => invalidateAccount(qc, orgId) },
  })
}

function invalidateAccount(qc: QueryClient, orgId: string): void {
  void qc.invalidateQueries({
    queryKey: getGetApiV1OrganizationsOrgIdWhatsappAccountQueryKey(orgId),
  })
  void qc.invalidateQueries({
    queryKey: getGetApiV1OrganizationsOrgIdMeCapabilitiesQueryKey(orgId),
  })
  void qc.invalidateQueries({
    queryKey: getGetApiV1OrganizationsOrgIdWhatsappTemplatesQueryKey(orgId),
  })
}

/**
 * Crear una plantilla propia y borrarla.
 *
 * Las dos **exigen cuenta propia de Meta**, y no es una regla nuestra: en la
 * cuenta compartida una organización podría agotarle a las demás el cupo de
 * creación, o dejar un nombre bloqueado treinta días. Por eso la pantalla las
 * ofrece solo con la cuenta conectada (§11.1.16).
 */
export function useCreateWhatsAppTemplate(orgId: string) {
  const qc = useQueryClient()
  return usePostApiV1OrganizationsOrgIdWhatsappTemplates({
    mutation: { onSuccess: () => invalidateTemplates(qc, orgId) },
  })
}

export function useDeleteWhatsAppTemplate(orgId: string) {
  const qc = useQueryClient()
  return useDeleteApiV1OrganizationsOrgIdWhatsappTemplatesTemplateKey({
    mutation: { onSuccess: () => invalidateTemplates(qc, orgId) },
  })
}

function invalidateTemplates(qc: QueryClient, orgId: string): void {
  void qc.invalidateQueries({
    queryKey: getGetApiV1OrganizationsOrgIdWhatsappTemplatesQueryKey(orgId),
  })
  // La política nombra plantillas por su clave: borrar una que estuviera elegida
  // deja ese aviso sin plantilla, y esa pantalla tiene que enterarse.
  void qc.invalidateQueries({
    queryKey: getGetApiV1OrganizationsOrgIdMessagingCollectionPolicyQueryKey(orgId),
  })
}

/* ---------- Disparar la pasada de recordatorios ---------- */

/**
 * **«Enviar ahora»**: corre el escaneo de recordatorios sin esperar a la hora.
 *
 * El automático sale **una sola vez al día**, a la hora local de la
 * organización. Sin esto, activar la cobranza a las once significa que el primer
 * aviso sale mañana — y eso se siente roto.
 *
 * Dos cosas que cambian cómo se pinta el resultado:
 *
 * - **Encola, no envía.** El worker despacha después, así que el `200` no puede
 *   prometer «enviado»: las filas aparecen en `QUEUED` y pasan a `SENT` en
 *   segundos.
 * - **Pulsarlo dos veces no duplica nada**, y lo garantiza la clave de
 *   deduplicación de cada mensaje, no un bloqueo del cliente. Por eso el botón no
 *   se deshabilita «por si acaso» ni avisa de que ya se pulsó.
 *
 * Invalida el historial: lo encolado tiene que aparecer sin recargar.
 */
export function useRunCollectionReminders(orgId: string) {
  const qc = useQueryClient()
  return usePostApiV1OrganizationsOrgIdMessagingCollectionRemindersRun({
    mutation: {
      onSuccess: () => {
        void qc.invalidateQueries({
          queryKey: getGetApiV1OrganizationsOrgIdMessagingMessagesQueryKey(orgId),
        })
      },
    },
  })
}
