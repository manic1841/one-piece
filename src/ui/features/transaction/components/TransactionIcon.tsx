import React from 'react';
import { 
  ShoppingBag, 
  Utensils, 
  Bus, 
  Gift, 
  Home, 
  Settings, 
  HeartPulse, 
  GraduationCap, 
  Users, 
  HelpCircle,
  Banknote,
  TrendingUp,
  Receipt,
  PiggyBank,
  Briefcase,
  ArrowRightLeft,
  CreditCard,
  Building,
  DollarSign
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
  className = "", 
  size = 18 
}) => {
  // Mapping for Expense Categories
  if (intentType === 'EXPENSE') {
    switch (category) {
      case 'food': return <Utensils size={size} className={className} />;
      case 'transportation': return <Bus size={size} className={className} />;
      case 'shopping': return <ShoppingBag size={size} className={className} />;
      case 'entertainment': return <Gift size={size} className={className} />;
      case 'housing': return <Home size={size} className={className} />;
      case 'living': return <Settings size={size} className={className} />;
      case 'insurance': return <HeartPulse size={size} className={className} />;
      case 'education': return <GraduationCap size={size} className={className} />;
      case 'social': return <Users size={size} className={className} />;
      default: return <Receipt size={size} className={className} />;
    }
  }

  // Mapping for Income Categories
  if (intentType === 'INCOME') {
    switch (category) {
      case 'salary': return <Banknote size={size} className={className} />;
      case 'bonus': return <TrendingUp size={size} className={className} />;
      case 'investment': return <PiggyBank size={size} className={className} />;
      case 'side_business': return <Briefcase size={size} className={className} />;
      default: return <DollarSign size={size} className={className} />;
    }
  }

  // Mapping for Investment / Financing / Transfers
  if (intentType === 'INVESTMENT') return <TrendingUp size={size} className={className} />;
  if (intentType === 'FINANCING') return <Building size={size} className={className} />;
  if (intentType === 'PROJECT_TRANSFER') return <ArrowRightLeft size={size} className={className} />;
  if (intentType === 'DEBT_PAYMENT') return <CreditCard size={size} className={className} />;

  return <HelpCircle size={size} className={className} />;
};
