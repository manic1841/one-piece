import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';

import { AuthProvider } from '@/infra/contexts/AuthProvider';
import Accounts from '@/ui/features/account/pages/AccountsPage';
import Layout from '@/ui/features/app/layout/Layout';
import ProtectedRoute from '@/ui/features/app/router/ProtectedRoute';
import AccessDenied from '@/ui/features/auth/pages/AccessDeniedPage';
import Login from '@/ui/features/auth/pages/LoginPage';
import Onboarding from '@/ui/features/auth/pages/OnboardingPage';
import Dashboard from '@/ui/features/dashboard/pages/DashboardPage';
import DebtListPage from '@/ui/features/debt/pages/DebtListPage';
import PortfolioDetailPage from '@/ui/features/portfolio/pages/PortfolioDetailPage';
import PortfoliosPage from '@/ui/features/portfolio/pages/PortfoliosPage';
import ProjectsPage from '@/ui/features/project/pages/ProjectsPage';
import Reports from '@/ui/features/report/pages/ReportsPage';
import RetirementPlanForm from '@/ui/features/retirement/pages/RetirementPlanForm';
import RetirementPlanList from '@/ui/features/retirement/pages/RetirementPlanList';
import Settings from '@/ui/features/setting/pages/SettingsPage';
import Transactions from '@/ui/features/transaction/pages/TransactionsPage';

function App() {
  return (
    <AuthProvider>
      <Toaster />
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
            <Route path="transactions" element={<Transactions />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="accounts" element={<Accounts />} />
            <Route path="portfolios" element={<PortfoliosPage />} />
            <Route path="portfolios/:id" element={<PortfolioDetailPage />} />
            <Route path="reports" element={<Reports />} />
            <Route path="retirement" element={<RetirementPlanList />} />
            <Route path="retirement/:id" element={<RetirementPlanForm />} />
            <Route path="debt" element={<DebtListPage />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
