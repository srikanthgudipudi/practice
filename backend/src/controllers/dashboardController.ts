import { Response } from 'express';
import { pool } from '../db';
import { AuthRequest } from '../middleware/auth';

export const getDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const [summaryResult, budgetResult, topCategoriesResult, recentResult, recurringDueResult] = await Promise.all([
    pool.query(
      `SELECT
        COALESCE(SUM(CASE WHEN type='EXPENSE' THEN amount END),0) AS total_expense,
        COALESCE(SUM(CASE WHEN type='INCOME'  THEN amount END),0) AS total_income,
        COUNT(*) AS transaction_count
       FROM transactions
       WHERE user_id=$1 AND EXTRACT(MONTH FROM transaction_date)=$2 AND EXTRACT(YEAR FROM transaction_date)=$3`,
      [userId, month, year]
    ),
    pool.query(
      'SELECT total_amount FROM budgets WHERE user_id=$1 AND month=$2 AND year=$3',
      [userId, month, year]
    ),
    pool.query(
      `SELECT c.name, c.icon, c.color, COALESCE(SUM(t.amount),0) AS total
       FROM categories c
       JOIN transactions t ON t.category_id=c.id AND t.user_id=$1 AND t.type='EXPENSE'
         AND EXTRACT(MONTH FROM t.transaction_date)=$2 AND EXTRACT(YEAR FROM t.transaction_date)=$3
       GROUP BY c.id, c.name, c.icon, c.color
       ORDER BY total DESC LIMIT 5`,
      [userId, month, year]
    ),
    pool.query(
      `SELECT t.*, c.name AS category_name, c.icon, c.color
       FROM transactions t
       LEFT JOIN categories c ON c.id=t.category_id
       WHERE t.user_id=$1
       ORDER BY t.transaction_date DESC, t.created_at DESC LIMIT 5`,
      [userId]
    ),
    pool.query(
      `SELECT r.*, c.name AS category_name FROM recurring_transactions r
       LEFT JOIN categories c ON c.id=r.category_id
       WHERE r.user_id=$1 AND r.is_active=TRUE AND r.next_due_date <= NOW() + INTERVAL '7 days'
       ORDER BY r.next_due_date ASC`,
      [userId]
    ),
  ]);

  const totalExpense = Number(summaryResult.rows[0].total_expense);
  const totalIncome = Number(summaryResult.rows[0].total_income);
  const totalBudget = Number(budgetResult.rows[0]?.total_amount ?? 0);

  res.json({
    month, year,
    summary: {
      total_income: totalIncome,
      total_expense: totalExpense,
      savings: totalIncome - totalExpense,
      transaction_count: Number(summaryResult.rows[0].transaction_count),
    },
    budget: {
      total: totalBudget,
      spent: totalExpense,
      remaining: totalBudget - totalExpense,
      percent_used: totalBudget > 0 ? Math.round((totalExpense / totalBudget) * 100) : null,
    },
    top_categories: topCategoriesResult.rows,
    recent_transactions: recentResult.rows,
    upcoming_recurring: recurringDueResult.rows,
  });
};
