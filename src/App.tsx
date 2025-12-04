import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/AuthProvider';
import Layout from './components/Layout';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import AccessDenied from './pages/AccessDenied';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import Records from './pages/Records';
import Projects from './pages/Projects';
import Accounts from './pages/Accounts';
import Portfolios from './pages/Portfolios';
import PortfolioView from './pages/PortfolioView';
import Reconciliation from './pages/Reconciliation';
import Settings from './pages/Settings';
import Reports from './pages/Reports';
import IncomeStatementPage from './pages/IncomeStatementPage';
import BalanceSheetPage from './pages/BalanceSheetPage';
import CashFlowPage from './pages/CashFlowPage';
import RetirementPlanList from './pages/RetirementPlanList';
import RetirementPlanDetail from './pages/RetirementPlanDetail';

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
            <Route path="transactions" element={<Records />} />
            <Route path="projects" element={<Projects />} />
            <Route path="accounts" element={<Accounts />} />
            <Route path="portfolios" element={<Portfolios />} />
            <Route path="portfolios/:id" element={<PortfolioView />} />
            <Route path="reconciliation" element={<Reconciliation />} />
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
