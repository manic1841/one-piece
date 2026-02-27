import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';

import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { AuthProvider } from '@/contexts/AuthProvider';
import AccessDenied from '@/pages/AccessDenied';
import Accounts from '@/pages/Accounts';
import BalanceSheetPage from '@/pages/BalanceSheetPage';
import CashFlowPage from '@/pages/CashFlowPage';
import Dashboard from '@/pages/Dashboard';
import IncomeStatementPage from '@/pages/IncomeStatementPage';
import Login from '@/pages/Login';
import Onboarding from '@/pages/Onboarding';
import PortfolioView from '@/pages/PortfolioView';
import Portfolios from '@/pages/Portfolios';
import Projects from '@/pages/Projects';
import Records from '@/pages/Records';
import Reports from '@/pages/Reports';
import RetirementPlanDetail from '@/pages/RetirementPlanDetail';
import RetirementPlanList from '@/pages/RetirementPlanList';
import Settings from '@/pages/Settings';

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
            <Route path="records" element={<Records />} />
            <Route path="projects" element={<Projects />} />
            <Route path="accounts" element={<Accounts />} />
            <Route path="portfolios" element={<Portfolios />} />
            <Route path="portfolios/:id" element={<PortfolioView />} />
            <Route path="reports" element={<Reports />} />
            <Route path="reports/income-statement" element={<IncomeStatementPage />} />
            <Route path="reports/balance-sheet" element={<BalanceSheetPage />} />
            <Route path="reports/cash-flow" element={<CashFlowPage />} />
            <Route path="retirement" element={<RetirementPlanList />} />
            <Route path="retirement/:id" element={<RetirementPlanDetail />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
