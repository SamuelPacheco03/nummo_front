import { createBrowserRouter, Navigate } from 'react-router'
import { AppShell } from '@/app/layout/app-shell'
import { ProtectedRoute } from '@/features/auth/protected-route'
import { SettingsLayout } from '@/features/config/settings-layout'

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
          {
            path: 'ayuda',
            lazy: async () => ({ Component: (await import('@/features/help/guide-page')).GuidePage }),
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
          {
            path: 'informes/cartera',
            lazy: async () => ({
              Component: (await import('@/features/reports/reports-portfolio-page')).ReportsPortfolioPage,
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
                lazy: async () => ({
                  Component: (await import('@/features/contacts/contact-form-page')).ContactFormPage,
                }),
              },
              {
                path: ':contactId/editar',
                lazy: async () => ({
                  Component: (await import('@/features/contacts/contact-form-page')).ContactFormPage,
                }),
              },
              {
                path: ':contactId',
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
                lazy: async () => ({
                  Component: (await import('@/features/payments/register-payment-page')).RegisterPaymentPage,
                }),
              },
              {
                path: ':paymentId',
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
                lazy: async () => ({
                  Component: (await import('@/features/billing/agreement-form-page')).AgreementFormPage,
                }),
              },
              {
                path: ':agreementId/editar',
                lazy: async () => ({
                  Component: (await import('@/features/billing/agreement-form-page')).AgreementFormPage,
                }),
              },
              {
                path: ':agreementId',
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
                lazy: async () => ({
                  Component: (await import('@/features/expenses/register-disbursement-page')).RegisterDisbursementPage,
                }),
              },
              {
                path: ':disbursementId',
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
                lazy: async () => ({
                  Component: (await import('@/features/expenses/schedule-form-page')).ScheduleFormPage,
                }),
              },
              {
                path: ':scheduleId/editar',
                lazy: async () => ({
                  Component: (await import('@/features/expenses/schedule-form-page')).ScheduleFormPage,
                }),
              },
              {
                path: ':scheduleId',
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
                path: 'config/apariencia',
                lazy: async () => ({
                  Component: (await import('@/features/config/appearance-page')).AppearancePage,
                }),
              },
              {
                path: 'config/asistente',
                lazy: async () => ({
                  Component: (await import('@/features/config/assistant-page')).AssistantPage,
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
