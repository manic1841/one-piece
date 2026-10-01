import React from 'react';

import { Navigate, useParams } from 'react-router-dom';

import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';
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
    return <p className="text-sm text-muted-foreground">{MONTHLY_CLOSE_LABELS.LOADING}</p>;
  }

  if (state.status === 'error') {
    return (
      <div className="rounded-lg border border-negative/20 bg-negative/10 px-4 py-3 text-sm text-negative">
        {state.errorMessage}
      </div>
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
