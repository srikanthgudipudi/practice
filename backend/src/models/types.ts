export interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  created_at: Date;
}

export interface Transaction {
  id: number;
  user_id: number;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description?: string;
  date: string;
  created_at: Date;
}

export interface Budget {
  id: number;
  user_id: number;
  category: string;
  amount: number;
  month: string;
  created_at: Date;
}

export interface JwtPayload {
  userId: number;
  email: string;
}
