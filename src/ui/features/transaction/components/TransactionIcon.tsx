import React from 'react';

import {
  ArrowRightLeft,
  Banknote,
  Briefcase,
  Building,
  Bus,
  CreditCard,
  DollarSign,
  Gift,
  GraduationCap,
  HeartPulse,
  HelpCircle,
  Home,
  PiggyBank,
  Receipt,
  Settings,
  ShoppingBag,
  TrendingUp,
  Users,
  Utensils,
} from 'lucide-react';

interface TransactionIconProps {
  category: string;
  intentType: string;
  className?: string;
  size?: number;
}

export const TransactionIcon: React.FC<TransactionIconProps> = ({
  category,
  intentType,
  className = '',
  size = 18,
}) => {
  // Mapping for Expense Categories
  if (intentType === 'EXPENSE') {
    switch (category) {
      case 'food':
        return <Utensils size={size} className={className} />;
      case 'transportation':
        return <Bus size={size} className={className} />;
      case 'shopping':
        return <ShoppingBag size={size} className={className} />;
      case 'entertainment':
        return <Gift size={size} className={className} />;
      case 'housing':
        return <Home size={size} className={className} />;
      case 'living':
        return <Settings size={size} className={className} />;
      case 'insurance':
        return <HeartPulse size={size} className={className} />;
      case 'education':
        return <GraduationCap size={size} className={className} />;
      case 'social':
        return <Users size={size} className={className} />;
      default:
        return <Receipt size={size} className={className} />;
    }
  }

  // Mapping for Income Categories
  if (intentType === 'INCOME') {
    switch (category) {
      case 'salary':
        return <Banknote size={size} className={className} />;
      case 'bonus':
        return <TrendingUp size={size} className={className} />;
      case 'investment':
        return <PiggyBank size={size} className={className} />;
      case 'side_business':
        return <Briefcase size={size} className={className} />;
      default:
        return <DollarSign size={size} className={className} />;
    }
  }

  // Mapping for Investment / Financing / Transfers
  if (intentType === 'INVESTMENT') return <TrendingUp size={size} className={className} />;
  if (intentType === 'FINANCING') return <Building size={size} className={className} />;
  if (intentType === 'TRANSFER') return <ArrowRightLeft size={size} className={className} />;
  if (intentType === 'DEBT_PAYMENT') return <CreditCard size={size} className={className} />;

  return <HelpCircle size={size} className={className} />;
};
