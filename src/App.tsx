import { Suspense, lazy } from 'react';

import { BrowserRouter, Route, Routes } from 'react-router-dom';
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
import RetirementPlanForm from '@/ui/features/retirement/pages/RetirementPlanForm';
import RetirementPlanList from '@/ui/features/retirement/pages/RetirementPlanList';
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

function App() {
  return (
    <AuthStateProvider gateway={firebaseAuthGateway}>
      <Toaster theme="dark" />
      <AuthGate>
        <ConfirmDialogProvider>
          <BrowserRouter>
            <Routes>
              {/* Gated on DEV so the production bundle drops the chunk instead of shipping it dead. */}
              {import.meta.env.DEV && GalleryPage !== null && (
                <Route
                  path="/gallery"
                  element={
                    <Suspense fallback={null}>
                      <GalleryPage />
                    </Suspense>
                  }
                />
              )}
              <Route path="/login" element={<Login />} />
              <Route path="/access-denied" element={<AccessDenied />} />
              <Route
                path="/onboarding"
                element={
                  <ProtectedRoute>
                    <Onboarding />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/"
                element={
                  <ProtectedRoute requireHousehold>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="close" element={<ClosePeriodPickerPage />} />
                <Route path="close/:yearMonth" element={<ClosePeriodRouteGate />} />
                <Route path="transactions" element={<Transactions />} />
                <Route path="projects" element={<ProjectsPage />} />
                <Route path="projects/:id" element={<ProjectDetailPage />} />
                <Route path="accounts" element={<Accounts />} />
                <Route path="accounts/:id" element={<AccountDetailPage />} />
                <Route path="portfolios" element={<PortfoliosPage />} />
                <Route path="portfolios/:id" element={<PortfolioDetailPage />} />
                <Route path="reports" element={<ReportListPage />} />
                <Route path="reports/:period" element={<ReportDetailPage />} />
                <Route path="retirement" element={<RetirementPlanList />} />
                <Route path="retirement/:id" element={<RetirementPlanForm />} />
                <Route path="debt" element={<DebtListPage />} />
                <Route path="debt/:id" element={<DebtDetailPage />} />
                <Route path="settings" element={<SettingsLayout />}>
                  <Route index element={<SettingsIndexRedirect />} />
                  <Route path="household" element={<HouseholdSettingsPage />} />
                  <Route path="accounting" element={<AccountingSettingsPage />} />
                  <Route path="backup" element={<BackupSettingsPage />} />
                  <Route path="system" element={<SystemSettingsPage />} />
                </Route>
              </Route>
            </Routes>
          </BrowserRouter>
        </ConfirmDialogProvider>
      </AuthGate>
    </AuthStateProvider>
  );
}

export default App;
