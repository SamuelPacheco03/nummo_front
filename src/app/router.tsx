import { createBrowserRouter, Navigate } from 'react-router'
import { AppShell } from '@/app/layout/app-shell'
import { ProtectedRoute } from '@/features/auth/protected-route'

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
          },
          {
            path: 'contactos/nuevo',
            lazy: async () => ({
              Component: (await import('@/features/contacts/contact-form-page')).ContactFormPage,
            }),
          },
          {
            path: 'contactos/:contactId',
            lazy: async () => ({
              Component: (await import('@/features/contacts/contact-detail-page')).ContactDetailPage,
            }),
          },
          {
            path: 'contactos/:contactId/editar',
            lazy: async () => ({
              Component: (await import('@/features/contacts/contact-form-page')).ContactFormPage,
            }),
          },

          // Cartera
          {
            path: 'cartera/cxc',
            lazy: async () => ({
              Component: (await import('@/features/receivables/receivables-list-page')).ReceivablesListPage,
            }),
          },
          {
            path: 'cartera/cxc/:receivableId',
            lazy: async () => ({
              Component: (await import('@/features/receivables/receivable-detail-page')).ReceivableDetailPage,
            }),
          },
          {
            path: 'cartera/pagos',
            lazy: async () => ({
              Component: (await import('@/features/payments/payments-list-page')).PaymentsListPage,
            }),
          },
          {
            path: 'cartera/pagos/nuevo',
            lazy: async () => ({
              Component: (await import('@/features/payments/register-payment-page')).RegisterPaymentPage,
            }),
          },
          {
            path: 'cartera/pagos/:paymentId',
            lazy: async () => ({
              Component: (await import('@/features/payments/payment-detail-page')).PaymentDetailPage,
            }),
          },
          {
            path: 'cartera/acuerdos',
            lazy: async () => ({
              Component: (await import('@/features/billing/agreements-list-page')).AgreementsListPage,
            }),
          },
          {
            path: 'cartera/acuerdos/nuevo',
            lazy: async () => ({
              Component: (await import('@/features/billing/agreement-form-page')).AgreementFormPage,
            }),
          },
          {
            path: 'cartera/acuerdos/:agreementId',
            lazy: async () => ({
              Component: (await import('@/features/billing/agreement-detail-page')).AgreementDetailPage,
            }),
          },
          {
            path: 'cartera/acuerdos/:agreementId/editar',
            lazy: async () => ({
              Component: (await import('@/features/billing/agreement-form-page')).AgreementFormPage,
            }),
          },
          {
            path: 'cartera/interes',
            lazy: async () => ({
              Component: (await import('@/features/billing/interest-policies-page')).InterestPoliciesPage,
            }),
          },

          // Gastos
          {
            path: 'gastos/cxp',
            lazy: async () => ({
              Component: (await import('@/features/expenses/expenses-list-page')).ExpensesListPage,
            }),
          },
          {
            path: 'gastos/cxp/:expenseId',
            lazy: async () => ({
              Component: (await import('@/features/expenses/expense-detail-page')).ExpenseDetailPage,
            }),
          },
          {
            path: 'gastos/egresos',
            lazy: async () => ({
              Component: (await import('@/features/expenses/disbursements-list-page')).DisbursementsListPage,
            }),
          },
          {
            path: 'gastos/egresos/nuevo',
            lazy: async () => ({
              Component: (await import('@/features/expenses/register-disbursement-page')).RegisterDisbursementPage,
            }),
          },
          {
            path: 'gastos/egresos/:disbursementId',
            lazy: async () => ({
              Component: (await import('@/features/expenses/disbursement-detail-page')).DisbursementDetailPage,
            }),
          },
          {
            path: 'gastos/recurrentes',
            lazy: async () => ({
              Component: (await import('@/features/expenses/schedules-list-page')).SchedulesListPage,
            }),
          },
          {
            path: 'gastos/recurrentes/nuevo',
            lazy: async () => ({
              Component: (await import('@/features/expenses/schedule-form-page')).ScheduleFormPage,
            }),
          },
          {
            path: 'gastos/recurrentes/:scheduleId',
            lazy: async () => ({
              Component: (await import('@/features/expenses/schedule-detail-page')).ScheduleDetailPage,
            }),
          },
          {
            path: 'gastos/recurrentes/:scheduleId/editar',
            lazy: async () => ({
              Component: (await import('@/features/expenses/schedule-form-page')).ScheduleFormPage,
            }),
          },

          // Maestros
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

          // Configuración (organización)
          { path: 'config', element: <Navigate to="/config/empresa" replace /> },
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
        ],
      },
    ],
  },
])
