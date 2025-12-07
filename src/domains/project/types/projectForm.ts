export interface ProjectFormData {
  name: string;
  category: string;
  icon: string;
  color: string;
  description: string;
  accounting: {
    enabled: boolean;
    incomeStatement?: {
      category: string;
      order?: number;
    };
    cashFlow?: {
      category: string;
      order?: number;
    };
    balanceSheet?: {
      category: string;
      order?: number;
    };
  };
}
