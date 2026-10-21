import { Suspense, lazy } from 'react';

import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';

import { firebaseAuthGateway } from '@/infra/contexts/firebaseAuthGateway';
import { ConfirmDialogProvider } from '@/ui/components/confirm/ConfirmDialog';
import { AuthStateProvider } from '@/ui/contexts/AuthStateProvider';
import AccountDetailPage from '@/ui/features/account/pages/AccountDetailPage';
import Accounts from '@/ui/features/account/pages/AccountsPage';
import { AuthGate } from '@/ui/features/app/AuthGate';
import Layout from '@/ui/features/app/layout/Layout';
import ProtectedRoute from '@/ui/features/app/router/ProtectedRoute';
import AccessDenied from '@/ui/features/auth/pages/AccessDeniedPage';
import Login from '@/ui/features/auth/pages/LoginPage';
import Onboarding from '@/ui/features/auth/pages/OnboardingPage';
import Dashboard from '@/ui/features/dashboard/pages/DashboardPage';
import DebtDetailPage from '@/ui/features/debt/pages/DebtDetailPage';
import DebtListPage from '@/ui/features/debt/pages/DebtListPage';
import { ClosePeriodPickerPage } from '@/ui/features/monthly_close/pages/ClosePeriodPickerPage';
import { ClosePeriodRouteGate } from '@/ui/features/monthly_close/pages/ClosePeriodRouteGate';
import PortfolioDetailPage from '@/ui/features/portfolio/pages/PortfolioDetailPage';
import PortfoliosPage from '@/ui/features/portfolio/pages/PortfoliosPage';
import ProjectDetailPage from '@/ui/features/project/pages/ProjectDetailPage';
import ProjectsPage from '@/ui/features/project/pages/ProjectsPage';
import ReportDetailPage from '@/ui/features/report/pages/ReportDetailPage';
import ReportListPage from '@/ui/features/report/pages/ReportListPage';
import ProjectionListPage from '@/ui/features/retirement-redesign/pages/ProjectionListPage';
import ProjectionViewPage from '@/ui/features/retirement-redesign/pages/ProjectionViewPage';
import ProjectionWorkspacePage from '@/ui/features/retirement-redesign/pages/ProjectionWorkspacePage';
import RetirementPlanForm from '@/ui/features/retirement/pages/RetirementPlanForm';
import SettingsIndexRedirect from '@/ui/features/setting/pages/SettingsIndexRedirect';
import SettingsLayout from '@/ui/features/setting/pages/SettingsLayout';
import AccountingSettingsPage from '@/ui/features/setting/pages/sections/AccountingSettingsPage';
import BackupSettingsPage from '@/ui/features/setting/pages/sections/BackupSettingsPage';
import HouseholdSettingsPage from '@/ui/features/setting/pages/sections/HouseholdSettingsPage';
import SystemSettingsPage from '@/ui/features/setting/pages/sections/SystemSettingsPage';
import Transactions from '@/ui/features/transaction/pages/TransactionsPage';

const GalleryPage = import.meta.env.DEV
  ? lazy(() => import('@/ui/features/app/pages/GalleryPage'))
  : null;

const router = createBrowserRouter([
  // Gated on DEV so the production bundle drops the chunk instead of shipping it dead.
  ...(import.meta.env.DEV && GalleryPage !== null
    ? [
        {
          path: '/gallery',
          element: (
            <Suspense fallback={null}>
              <GalleryPage />
            </Suspense>
          ),
        },
      ]
    : []),
  { path: '/login', element: <Login /> },
  { path: '/access-denied', element: <AccessDenied /> },
  {
    path: '/onboarding',
    element: (
      <ProtectedRoute>
        <Onboarding />
      </ProtectedRoute>
    ),
  },
  {
    path: '/',
    element: (
      <ProtectedRoute requireHousehold>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'close', element: <ClosePeriodPickerPage /> },
      { path: 'close/:yearMonth', element: <ClosePeriodRouteGate /> },
      { path: 'transactions', element: <Transactions /> },
      { path: 'projects', element: <ProjectsPage /> },
      { path: 'projects/:id', element: <ProjectDetailPage /> },
      { path: 'accounts', element: <Accounts /> },
      { path: 'accounts/:id', element: <AccountDetailPage /> },
      { path: 'portfolios', element: <PortfoliosPage /> },
      { path: 'portfolios/:id', element: <PortfolioDetailPage /> },
      { path: 'reports', element: <ReportListPage /> },
      { path: 'reports/:period', element: <ReportDetailPage /> },
      { path: 'retirement', element: <ProjectionListPage /> },
      { path: 'retirement/new', element: <ProjectionWorkspacePage /> },
      { path: 'retirement/projections/:id', element: <ProjectionViewPage /> },
      { path: 'retirement/:id', element: <RetirementPlanForm /> },
      { path: 'debt', element: <DebtListPage /> },
      { path: 'debt/:id', element: <DebtDetailPage /> },
      {
        path: 'settings',
        element: <SettingsLayout />,
        children: [
          { index: true, element: <SettingsIndexRedirect /> },
          { path: 'household', element: <HouseholdSettingsPage /> },
          { path: 'accounting', element: <AccountingSettingsPage /> },
          { path: 'backup', element: <BackupSettingsPage /> },
          { path: 'system', element: <SystemSettingsPage /> },
        ],
      },
    ],
  },
]);

function App() {
  return (
    <AuthStateProvider gateway={firebaseAuthGateway}>
      <Toaster theme="dark" />
      <AuthGate>
        <ConfirmDialogProvider>
          <RouterProvider router={router} />
        </ConfirmDialogProvider>
      </AuthGate>
    </AuthStateProvider>
  );
}

export default App;
