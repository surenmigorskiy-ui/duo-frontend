export type User = 'Suren' | 'Alena' | 'shared';
export type Priority = 'must-have' | 'nice-to-have';
export type View = 'dashboard' | 'transactions' | 'budget' | 'goals' | 'accounts';
export type Theme = 'light' | 'dark';
export type DateRangePreset = 'all' | 'month' | 'week' | 'custom';
export type Language = 'ru' | 'en' | 'uz' | 'es' | 'de' | 'fr' | 'zh' | 'ja' | 'ko' | 'pt';

export interface CustomDateRange {
  start: string | null;
  end: string | null;
}

export type PaymentMethodType = 'Card' | 'Cash' | 'Bank Account';

export interface PaymentMethod {
  id: string;
  name: string;
  type: PaymentMethodType;
  owner: User;
  last4?: string;
}

export interface Transaction {
  id:string;
  description: string;
  amount: number;
  category: string;
  subCategory?: string;
  date: string; // ISO string format, includes time
  user: User;
  priority: Priority;
  type: 'income' | 'expense';
  paymentMethodId?: string;
}

export interface SubCategory {
  id: string;
  name: string;
  icon?: string; // Font Awesome icon class for sub-category
}

export interface Category {
  id: string;
  name: string;
  icon: string; // Font Awesome icon class
  type: 'expense' | 'income';
  subCategories?: SubCategory[];
}

export interface Goal {
    id: string;
    description: string;
    amount: number;
    priority: GoalPriority;
    category: string;
    user: User;
}

export interface PlannedExpense {
    id: string;
    description: string;
    amount: number;
    category: string;
    dueDate: string; // ISO string
    user: User;
}

export type GoalPriority = 'high' | 'medium' | 'low';


export interface Budget {
  total: number;
  /**
   * byCategory stores the percentage allocation for each category.
   * e.g., { 'Еда': 30, 'Транспорт': 15 } means 30% for Food, 15% for Transport.
   */
  byCategory: { [key: string]: number };
}

export interface ParsedReceipt {
  amount: number;
  category: string;
  date: string; // YYYY-MM-DD
  description: string;
}

export interface DashboardLayoutItem {
    id: string;
    visible: boolean;
}

export type UserDetails = { [key in User]: { name: string; color: string; avatar: string; photoUrl?: string } };

export interface Currency {
    code: string;
    name: string;
}

export interface LanguageSetting {
    code: Language;
    name: string;
}