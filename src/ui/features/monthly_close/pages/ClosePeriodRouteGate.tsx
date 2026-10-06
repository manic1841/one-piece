import React from 'react';

import { Navigate, useParams } from 'react-router-dom';

import { LoadingLine } from '@/ui/components/LoadingLine';
import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import { useAuthState } from '@/ui/contexts/useAuthState';

import { useClosePeriodRoute } from '../hooks/useClosePeriodRoute';
import { MonthlyClosePage } from './MonthlyClosePage';

/** Malformed or unstarted period → the picker; a failed read shows the error (ADR-0072). */
export const ClosePeriodRouteGate: React.FC = () => {
  const { userProfile } = useAuthState();
  const householdId = userProfile?.householdId ?? '';
  const userEmail = userProfile?.email ?? '';
  const { yearMonth: rawYearMonth } = useParams();
  const state = useClosePeriodRoute(householdId, rawYearMonth);

  if (state.status === 'invalid' || state.status === 'not-found') {
    return <Navigate to="/close" replace />;
  }

  if (state.status === 'loading') {
    return <LoadingLine className="min-h-0 py-6" />;
  }

  if (state.status === 'error') {
    return (
      <Alert variant="destructive">
        <AlertDescription>{state.errorMessage}</AlertDescription>
      </Alert>
    );
  }

  return (
    <MonthlyClosePage
      key={state.yearMonth}
      householdId={householdId}
      userEmail={userEmail}
      yearMonth={state.yearMonth}
      initialPeriod={state.period}
    />
  );
};
