import { createBrowserRouter, Navigate } from 'react-router'
import { AppShell } from '@/app/layout/app-shell'
import { ProtectedRoute } from '@/features/auth/protected-route'
import { SettingsLayout } from '@/features/config/settings-layout'

/**
 * Marca una ruta como **capa sobre la de arriba** —un cajón de detalle, un
 * formulario de alta—, no como pantalla nueva.
 *
 * Lo lee `PageScrollRestoration`: es lo único que distingue «abrir la ficha de un
 * contacto» de «irme a otra pantalla», porque en la URL las dos son igual de
 * nuevas. Sin esto, abrir un cajón mandaría al principio la lista de detrás.
 */
const OVERLAY = { overlay: true } as const

// Rutas pesadas cargadas bajo demanda (code-splitting).
export const router = createBrowserRouter([
  {
    path: '/login',
    lazy: async () => ({ Component: (await import('@/features/auth/login-page')).LoginPage }),
  },
  {
    path: '/register',
    lazy: async () => ({ Component: (await import('@/features/auth/register-page')).RegisterPage }),
  },
  {
    element: <ProtectedRoute />,
    children: [
      /*
        La consola **fuera de `AppShell`**: ese shell empieza por «¿a qué
        organización perteneces?» y enseña el onboarding a quien no pertenece a
        ninguna, y un superadmin no tiene por qué tener una — administra todas.
        Con la consola dentro, `/plataforma` acababa en «Crea tu organización».

        Es lo mismo que hace el backend: `requirePlatformAdmin` corre fuera de
        `requireTenant`.
      */
      {
        path: 'plataforma',
        lazy: async () => ({
          Component: (await import('@/features/admin/platform-shell')).PlatformShell,
        }),
        children: [
          { index: true, element: <Navigate to="/plataforma/organizaciones" replace /> },
          {
            path: 'organizaciones',
            lazy: async () => ({
              Component: (await import('@/features/admin/organizations-page'))
                .AdminOrganizationsPage,
            }),
            // La ficha es hija: la lista sigue montada detrás del cajón.
            children: [
              {
                path: ':orgId',
                handle: OVERLAY,
                lazy: async () => ({
                  Component: (await import('@/features/admin/organization-detail-page'))
                    .AdminOrganizationDetailPage,
                }),
              },
            ],
          },
          {
            path: 'planes',
            lazy: async () => ({
              Component: (await import('@/features/admin/plans-page')).AdminPlansPage,
            }),
          },
        ],
      },
      {
        element: <AppShell />,
        children: [
          {
            index: true,
            lazy: async () => ({ Component: (await import('@/features/dashboard/dashboard-page')).DashboardPage }),
          },
          {
            path: 'estado',
            lazy: async () => ({ Component: (await import('@/pages/health')).HealthPage }),
          },
          // Ayuda: portada con buscador y un tema por ruta, con su propia
          // navegación (la misma forma que Configuración). Un tema por pantalla
          // en vez de los nueve en un solo scroll.
          {
            path: 'ayuda',
            lazy: async () => ({ Component: (await import('@/features/help/help-layout')).HelpLayout }),
            children: [
              {
                index: true,
                lazy: async () => ({ Component: (await import('@/features/help/help-home')).HelpHome }),
              },
              {
                path: ':tema',
                lazy: async () => ({ Component: (await import('@/features/help/topic-page')).TopicPage }),
              },
            ],
          },
          {
            path: 'caja/cuentas',
            lazy: async () => ({ Component: (await import('@/features/finances/accounts-page')).AccountsPage }),
          },
          {
            path: 'caja/movimientos',
            lazy: async () => ({ Component: (await import('@/features/finances/movements-page')).MovementsPage }),
          },

          // Informes
          {
            path: 'informes/resultados',
            lazy: async () => ({
              Component: (await import('@/features/reports/reports-results-page')).ReportsResultsPage,
            }),
          },

          // Contactos
          {
            path: 'contactos',
            lazy: async () => ({
              Component: (await import('@/features/contacts/contacts-list-page')).ContactsListPage,
            }),
            // Ficha, alta y edición cuelgan de la lista: abren en cajón sobre ella.
            children: [
              {
                path: 'nuevo',
                handle: OVERLAY,
                lazy: async () => ({
                  Component: (await import('@/features/contacts/contact-form-page')).ContactFormPage,
                }),
              },
              {
                path: ':contactId/editar',
                handle: OVERLAY,
                lazy: async () => ({
                  Component: (await import('@/features/contacts/contact-form-page')).ContactFormPage,
                }),
              },
              {
                path: ':contactId',
                handle: OVERLAY,
                lazy: async () => ({
                  Component: (await import('@/features/contacts/contact-detail-page')).ContactDetailPage,
                }),
              },
            ],
          },

          // Cartera
          {
            path: 'cartera/cxc',
            lazy: async () => ({
              Component: (await import('@/features/receivables/receivables-list-page')).ReceivablesListPage,
            }),
            // El detalle es hijo: la lista sigue montada detrás del cajón.
            children: [
              {
                path: ':receivableId',
                handle: OVERLAY,
                lazy: async () => ({
                  Component: (await import('@/features/receivables/receivable-detail-page')).ReceivableDetailPage,
                }),
              },
            ],
          },
          {
            path: 'cartera/pagos',
            lazy: async () => ({
              Component: (await import('@/features/payments/payments-list-page')).PaymentsListPage,
            }),
            // El detalle es hijo: la lista sigue montada detrás del cajón.
            children: [
              {
                path: 'nuevo',
                handle: OVERLAY,
                lazy: async () => ({
                  Component: (await import('@/features/payments/register-payment-page')).RegisterPaymentPage,
                }),
              },
              {
                path: ':paymentId',
                handle: OVERLAY,
                lazy: async () => ({
                  Component: (await import('@/features/payments/payment-detail-page')).PaymentDetailPage,
                }),
              },
            ],
          },
          {
            path: 'cartera/acuerdos',
            lazy: async () => ({
              Component: (await import('@/features/billing/agreements-list-page')).AgreementsListPage,
            }),
            // Ficha, alta y edición cuelgan de la lista: abren en cajón sobre ella.
            children: [
              {
                path: 'nuevo',
                handle: OVERLAY,
                lazy: async () => ({
                  Component: (await import('@/features/billing/agreement-form-page')).AgreementFormPage,
                }),
              },
              {
                path: ':agreementId/editar',
                handle: OVERLAY,
                lazy: async () => ({
                  Component: (await import('@/features/billing/agreement-form-page')).AgreementFormPage,
                }),
              },
              {
                path: ':agreementId',
                handle: OVERLAY,
                lazy: async () => ({
                  Component: (await import('@/features/billing/agreement-detail-page')).AgreementDetailPage,
                }),
              },
            ],
          },
          // Gastos
          {
            path: 'gastos/cxp',
            lazy: async () => ({
              Component: (await import('@/features/expenses/expenses-list-page')).ExpensesListPage,
            }),
            // El detalle es hijo: la lista sigue montada detrás del cajón.
            children: [
              {
                path: ':expenseId',
                handle: OVERLAY,
                lazy: async () => ({
                  Component: (await import('@/features/expenses/expense-detail-page')).ExpenseDetailPage,
                }),
              },
            ],
          },
          {
            path: 'gastos/egresos',
            lazy: async () => ({
              Component: (await import('@/features/expenses/disbursements-list-page')).DisbursementsListPage,
            }),
            // El detalle es hijo: la lista sigue montada detrás del cajón.
            children: [
              {
                path: 'nuevo',
                handle: OVERLAY,
                lazy: async () => ({
                  Component: (await import('@/features/expenses/register-disbursement-page')).RegisterDisbursementPage,
                }),
              },
              {
                path: ':disbursementId',
                handle: OVERLAY,
                lazy: async () => ({
                  Component: (await import('@/features/expenses/disbursement-detail-page')).DisbursementDetailPage,
                }),
              },
            ],
          },
          {
            path: 'gastos/recurrentes',
            lazy: async () => ({
              Component: (await import('@/features/expenses/schedules-list-page')).SchedulesListPage,
            }),
            // Ficha, alta y edición cuelgan de la lista: abren en cajón sobre ella.
            children: [
              {
                path: 'nuevo',
                handle: OVERLAY,
                lazy: async () => ({
                  Component: (await import('@/features/expenses/schedule-form-page')).ScheduleFormPage,
                }),
              },
              {
                path: ':scheduleId/editar',
                handle: OVERLAY,
                lazy: async () => ({
                  Component: (await import('@/features/expenses/schedule-form-page')).ScheduleFormPage,
                }),
              },
              {
                path: ':scheduleId',
                handle: OVERLAY,
                lazy: async () => ({
                  Component: (await import('@/features/expenses/schedule-detail-page')).ScheduleDetailPage,
                }),
              },
            ],
          },

          // Catálogos (bajo Configuración)
          // Configuración: una sola entrada en el sidebar con su propia
          // sub-navegación. Las URLs no cambian —los enlaces guardados siguen
          // funcionando—; lo que cambia es dónde vive cada pantalla en la
          // navegación (§14: modelo mental, no modelo de datos).
          {
            element: <SettingsLayout />,
            children: [
              { path: 'config', element: <Navigate to="/config/empresa" replace /> },
              {
                path: 'cartera/interes',
                lazy: async () => ({
                  Component: (await import('@/features/billing/interest-policies-page')).InterestPoliciesPage,
                }),
              },

              {
                path: 'gastos/aprobacion',
                lazy: async () => ({
                  Component: (await import('@/features/config/approval-policy-page'))
                    .ApprovalPolicyPage,
                }),
              },

              {
                path: 'maestros/conceptos',
                lazy: async () => ({
                  Component: (await import('@/features/masters/billing-concepts-page')).BillingConceptsPage,
                }),
              },
              {
                path: 'maestros/categorias',
                lazy: async () => ({
                  Component: (await import('@/features/masters/expense-categories-page'))
                    .ExpenseCategoriesPage,
                }),
              },
              {
                path: 'maestros/metodos',
                lazy: async () => ({
                  Component: (await import('@/features/masters/payment-methods-page')).PaymentMethodsPage,
                }),
              },
              {
                path: 'maestros/cuentas',
                lazy: async () => ({
                  Component: (await import('@/features/masters/financial-accounts-page'))
                    .FinancialAccountsPage,
                }),
              },

              {
                path: 'config/empresa',
                lazy: async () => ({ Component: (await import('@/features/config/company-page')).CompanyPage }),
              },
              {
                path: 'config/sedes',
                lazy: async () => ({ Component: (await import('@/features/config/branches-page')).BranchesPage }),
              },
              {
                path: 'config/miembros',
                lazy: async () => ({ Component: (await import('@/features/config/members-page')).MembersPage }),
              },
              {
                path: 'config/roles',
                lazy: async () => ({ Component: (await import('@/features/config/roles-page')).RolesPage }),
                // El editor cuelga de la lista: abre en cajón sobre ella.
                children: [
                  {
                    path: 'nuevo',
                    handle: OVERLAY,
                    lazy: async () => ({
                      Component: (await import('@/features/config/role-form-page')).RoleFormPage,
                    }),
                  },
                  {
                    path: ':roleId',
                    handle: OVERLAY,
                    lazy: async () => ({
                      Component: (await import('@/features/config/role-form-page')).RoleFormPage,
                    }),
                  },
                ],
              },
              {
                path: 'config/plan',
                lazy: async () => ({ Component: (await import('@/features/platform/plan-page')).PlanPage }),
              },
              {
                path: 'config/apariencia',
                lazy: async () => ({
                  Component: (await import('@/features/config/appearance-page')).AppearancePage,
                }),
              },
              {
                path: 'config/avisos',
                lazy: async () => ({
                  Component: (await import('@/features/notifications/policy-page'))
                    .NotificationPolicyPage,
                }),
              },
              {
                path: 'config/notificaciones',
                lazy: async () => ({
                  Component: (await import('@/features/notifications/preferences-page'))
                    .NotificationPreferencesPage,
                }),
              },
              {
                path: 'config/asistente',
                lazy: async () => ({
                  Component: (await import('@/features/config/assistant-page')).AssistantPage,
                }),
              },
              {
                path: 'config/aplicacion',
                lazy: async () => ({
                  Component: (await import('@/features/config/app-page')).AppPage,
                }),
              },
              {
                path: 'config/sesiones',
                lazy: async () => ({
                  Component: (await import('@/features/config/sessions-page')).SessionsPage,
                }),
              },
            ],
          },
        ],
      },
    ],
  },
])
