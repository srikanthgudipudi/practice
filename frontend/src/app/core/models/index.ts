export type UserRole = 'ADMIN' | 'USER';
export type TransactionType = 'INCOME' | 'EXPENSE';
export type PaymentType = 'CASH' | 'BANK_TRANSFER' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'UPI' | 'CHEQUE' | 'OTHER';
export type FrequencyType = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
export type AlertType = 'BUDGET_THRESHOLD' | 'CATEGORY_THRESHOLD' | 'LARGE_TRANSACTION';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active_role: UserRole;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  parent_id?: string;
  is_default: boolean;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  description?: string;
  category_id?: string;
  category_name?: string;
  category_icon?: string;
  category_color?: string;
  payment_type: PaymentType;
  payee_name?: string;
  transaction_date: string;
  is_recurring: boolean;
  recurring_id?: string;
  receipt_url?: string;
  ocr_verified: boolean;
  notes?: string;
  created_at: string;
}

export interface TransactionPage {
  data: Transaction[];
  total: number;
  page: number;
  limit: number;
}

export interface RecurringTransaction {
  id: string;
  title: string;
  type: TransactionType;
  amount: number;
  category_id?: string;
  category_name?: string;
  payment_type: PaymentType;
  frequency: FrequencyType;
  start_date: string;
  end_date?: string;
  next_due_date: string;
  is_active: boolean;
}

export interface Budget {
  id: string;
  month: number;
  year: number;
  total_amount: number;
}

export interface CategoryBudget {
  id: string;
  category_id: string;
  category_name: string;
  icon?: string;
  color?: string;
  month: number;
  year: number;
  amount: number;
  spent?: number;
  remaining?: number;
}

export interface BudgetSummary {
  month: number;
  year: number;
  total_budget: number;
  total_spent: number;
  total_income: number;
  remaining: number;
  savings: number;
  category_budgets: CategoryBudget[];
}

export interface AlertConfig {
  id: string;
  type: AlertType;
  threshold_value: number;
  category_id?: string;
  category_name?: string;
  is_active: boolean;
}

export interface DashboardData {
  month: number;
  year: number;
  summary: { total_income: number; total_expense: number; savings: number; transaction_count: number };
  budget: { total: number; spent: number; remaining: number; percent_used: number | null };
  top_categories: { name: string; icon: string; color: string; total: number }[];
  recent_transactions: Transaction[];
  upcoming_recurring: RecurringTransaction[];
}
