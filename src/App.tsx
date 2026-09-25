import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';

import { firebaseAuthGateway } from '@/infra/contexts/firebaseAuthGateway';
import { AuthStateProvider } from '@/ui/contexts/AuthStateProvider';
import AccountDetailPage from '@/ui/features/account/pages/AccountDetailPage';
import Accounts from '@/ui/features/account/pages/AccountsPage';
import { AuthGate } from '@/ui/features/app/AuthGate';
import { ConfirmDialogProvider } from '@/ui/features/app/confirm/ConfirmDialog';
import Layout from '@/ui/features/app/layout/Layout';
import ProtectedRoute from '@/ui/features/app/router/ProtectedRoute';
import AccessDenied from '@/ui/features/auth/pages/AccessDeniedPage';
import Login from '@/ui/features/auth/pages/LoginPage';
import Onboarding from '@/ui/features/auth/pages/OnboardingPage';
import Dashboard from '@/ui/features/dashboard/pages/DashboardPage';
import DebtDetailPage from '@/ui/features/debt/pages/DebtDetailPage';
import DebtListPage from '@/ui/features/debt/pages/DebtListPage';
import MonthlyClosePage from '@/ui/features/monthly_close/pages/MonthlyClosePage';
import PortfolioDetailPage from '@/ui/features/portfolio/pages/PortfolioDetailPage';
import PortfoliosPage from '@/ui/features/portfolio/pages/PortfoliosPage';
import ProjectDetailPage from '@/ui/features/project/pages/ProjectDetailPage';
import ProjectsPage from '@/ui/features/project/pages/ProjectsPage';
import Reports from '@/ui/features/report/pages/ReportsPage';
import RetirementPlanForm from '@/ui/features/retirement/pages/RetirementPlanForm';
import RetirementPlanList from '@/ui/features/retirement/pages/RetirementPlanList';
import Settings from '@/ui/features/setting/pages/SettingsPage';
import Transactions from '@/ui/features/transaction/pages/TransactionsPage';

function App() {
  return (
    <AuthStateProvider gateway={firebaseAuthGateway}>
      <Toaster
        toastOptions={{
          classNames: {
            toast: 'rounded-lg border border-border bg-card text-card-foreground shadow-lg',
          },
        }}
      />
      <AuthGate>
        <ConfirmDialogProvider>
          <BrowserRouter>
            <Routes>
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
                <Route path="close" element={<MonthlyClosePage />} />
                <Route path="transactions" element={<Transactions />} />
                <Route path="projects" element={<ProjectsPage />} />
                <Route path="projects/:id" element={<ProjectDetailPage />} />
                <Route path="accounts" element={<Accounts />} />
                <Route path="accounts/:id" element={<AccountDetailPage />} />
                <Route path="portfolios" element={<PortfoliosPage />} />
                <Route path="portfolios/:id" element={<PortfolioDetailPage />} />
                <Route path="reports" element={<Reports />} />
                <Route path="retirement" element={<RetirementPlanList />} />
                <Route path="retirement/:id" element={<RetirementPlanForm />} />
                <Route path="debt" element={<DebtListPage />} />
                <Route path="debt/:id" element={<DebtDetailPage />} />
                <Route path="settings" element={<Settings />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ConfirmDialogProvider>
      </AuthGate>
    </AuthStateProvider>
  );
}

export default App;
