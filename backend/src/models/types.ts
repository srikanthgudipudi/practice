export type UserRole = 'ADMIN' | 'USER';
export type TransactionType = 'INCOME' | 'EXPENSE';
export type PaymentType = 'CASH' | 'BANK_TRANSFER' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'UPI' | 'CHEQUE' | 'OTHER';
export type FrequencyType = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
export type AlertType = 'BUDGET_THRESHOLD' | 'CATEGORY_THRESHOLD' | 'LARGE_TRANSACTION';

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  created_at: Date;
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  parent_id?: string;
  is_default: boolean;
  created_at: Date;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  description?: string;
  category_id?: string;
  payment_type: PaymentType;
  payee_name?: string;
  transaction_date: string;
  is_recurring: boolean;
  recurring_id?: string;
  receipt_url?: string;
  ocr_raw?: Record<string, unknown>;
  ocr_verified: boolean;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface RecurringTransaction {
  id: string;
  user_id: string;
  title: string;
  type: TransactionType;
  amount: number;
  category_id?: string;
  payment_type: PaymentType;
  frequency: FrequencyType;
  start_date: string;
  end_date?: string;
  next_due_date: string;
  is_active: boolean;
  created_at: Date;
}

export interface Budget {
  id: string;
  user_id: string;
  month: number;
  year: number;
  total_amount: number;
  created_at: Date;
  updated_at: Date;
}

export interface CategoryBudget {
  id: string;
  user_id: string;
  category_id: string;
  month: number;
  year: number;
  amount: number;
  created_at: Date;
}

export interface AlertConfig {
  id: string;
  user_id: string;
  type: AlertType;
  threshold_value: number;
  category_id?: string;
  is_active: boolean;
  created_at: Date;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  active_role: UserRole;
}
