import { Suspense, lazy } from 'react';

import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';

import { firebaseAuthGateway } from '@/infra/contexts/firebaseAuthGateway';
import { PageSkeleton } from '@/ui/components/PageSkeleton';
import { ConfirmDialogProvider } from '@/ui/components/confirm/ConfirmDialog';
import { AuthStateProvider } from '@/ui/contexts/AuthStateProvider';
import { AuthGate } from '@/ui/features/app/AuthGate';
import Layout from '@/ui/features/app/layout/Layout';
import ProtectedRoute from '@/ui/features/app/router/ProtectedRoute';
import AccessDenied from '@/ui/features/auth/pages/AccessDeniedPage';
import Login from '@/ui/features/auth/pages/LoginPage';

/**
 * 只有 shell（provider／router／`AuthGate`／`Layout`）與登入、拒絕頁是靜態 import；
 * 其餘頁面一律 `lazy()`，讓首屏不必下載任何一個 feature。chunk 檔名帶 hash，
 * 回訪由 HTTP cache 承擔。
 */
const Dashboard = lazy(() => import('@/ui/features/dashboard/pages/DashboardPage'));
const Transactions = lazy(() => import('@/ui/features/transaction/pages/TransactionsPage'));
const Accounts = lazy(() => import('@/ui/features/account/pages/AccountsPage'));
const AccountDetailPage = lazy(() => import('@/ui/features/account/pages/AccountDetailPage'));
const ProjectsPage = lazy(() => import('@/ui/features/project/pages/ProjectsPage'));
const ProjectDetailPage = lazy(() => import('@/ui/features/project/pages/ProjectDetailPage'));
const PortfoliosPage = lazy(() => import('@/ui/features/portfolio/pages/PortfoliosPage'));
const PortfolioDetailPage = lazy(() => import('@/ui/features/portfolio/pages/PortfolioDetailPage'));
const ReportListPage = lazy(() => import('@/ui/features/report/pages/ReportListPage'));
const ReportAnalysisPage = lazy(() => import('@/ui/features/report/pages/ReportAnalysisPage'));
const ReportDetailPage = lazy(() => import('@/ui/features/report/pages/ReportDetailPage'));
const DebtListPage = lazy(() => import('@/ui/features/debt/pages/DebtListPage'));
const DebtDetailPage = lazy(() => import('@/ui/features/debt/pages/DebtDetailPage'));
const Onboarding = lazy(() => import('@/ui/features/auth/pages/OnboardingPage'));
const ClosePeriodPickerPage = lazy(() =>
  import('@/ui/features/monthly_close/pages/ClosePeriodPickerPage').then((module) => ({
    default: module.ClosePeriodPickerPage,
  })),
);
const ClosePeriodRouteGate = lazy(() =>
  import('@/ui/features/monthly_close/pages/ClosePeriodRouteGate').then((module) => ({
    default: module.ClosePeriodRouteGate,
  })),
);
const ProjectionListPage = lazy(() => import('@/ui/features/retirement/pages/ProjectionListPage'));
const ProjectionViewPage = lazy(() => import('@/ui/features/retirement/pages/ProjectionViewPage'));
const ProjectionWorkspacePage = lazy(
  () => import('@/ui/features/retirement/pages/ProjectionWorkspacePage'),
);
const RetirementPlanListPage = lazy(
  () => import('@/ui/features/retirement/pages/RetirementPlanListPage'),
);
const RetirementPlanCreatePage = lazy(
  () => import('@/ui/features/retirement/pages/RetirementPlanCreatePage'),
);
const RetirementPlanViewPage = lazy(
  () => import('@/ui/features/retirement/pages/RetirementPlanViewPage'),
);
const RetirementPlanEditPage = lazy(
  () => import('@/ui/features/retirement/pages/RetirementPlanEditPage'),
);
const SettingsLayout = lazy(() => import('@/ui/features/setting/pages/SettingsLayout'));
const SettingsIndexRedirect = lazy(
  () => import('@/ui/features/setting/pages/SettingsIndexRedirect'),
);
const HouseholdSettingsPage = lazy(
  () => import('@/ui/features/setting/pages/sections/HouseholdSettingsPage'),
);
const AccountingSettingsPage = lazy(
  () => import('@/ui/features/setting/pages/sections/AccountingSettingsPage'),
);
const BackupSettingsPage = lazy(
  () => import('@/ui/features/setting/pages/sections/BackupSettingsPage'),
);
const SystemSettingsPage = lazy(
  () => import('@/ui/features/setting/pages/sections/SystemSettingsPage'),
);

const GalleryPage = import.meta.env.DEV
  ? lazy(() => import('@/ui/features/app/pages/GalleryPage'))
  : null;

/** 路由樹外的頁面（`Layout` 之外）需要自己的 Suspense 邊界。 */
const withSkeleton = (element: React.ReactNode): React.ReactNode => (
  <Suspense fallback={<PageSkeleton />}>{element}</Suspense>
);

const router = createBrowserRouter([
  // Gated on DEV so the production bundle drops the chunk instead of shipping it dead.
  ...(import.meta.env.DEV && GalleryPage !== null
    ? [
        {
          path: '/gallery',
          element: withSkeleton(<GalleryPage />),
        },
      ]
    : []),
  { path: '/login', element: <Login /> },
  { path: '/access-denied', element: <AccessDenied /> },
  {
    path: '/onboarding',
    element: withSkeleton(
      <ProtectedRoute>
        <Onboarding />
      </ProtectedRoute>,
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
      { path: 'reports/analysis', element: <ReportAnalysisPage /> },
      { path: 'reports/:period', element: <ReportDetailPage /> },
      { path: 'retirement', element: <ProjectionListPage /> },
      { path: 'retirement/new', element: <ProjectionWorkspacePage /> },
      { path: 'retirement/projections/:id', element: <ProjectionViewPage /> },
      { path: 'retirement/plans', element: <RetirementPlanListPage /> },
      { path: 'retirement/plans/new', element: <RetirementPlanCreatePage /> },
      { path: 'retirement/plans/:id', element: <RetirementPlanViewPage /> },
      { path: 'retirement/plans/:id/edit', element: <RetirementPlanEditPage /> },
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
