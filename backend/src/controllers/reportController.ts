import { Response } from 'express';
import { pool } from '../db';
import { AuthRequest } from '../middleware/auth';

export const getMonthlyReport = async (req: AuthRequest, res: Response): Promise<void> => {
  const now = new Date();
  const month = Number(req.query.month) || now.getMonth() + 1;
  const year = Number(req.query.year) || now.getFullYear();
  const userId = req.user!.userId;

  const [summaryResult, byCategoryResult, byPaymentResult, dailyResult] = await Promise.all([
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
      `SELECT c.id, c.name, c.icon, c.color,
        COALESCE(SUM(t.amount),0) AS total,
        COUNT(t.id) AS count
       FROM categories c
       LEFT JOIN transactions t ON t.category_id=c.id AND t.user_id=$1 AND t.type='EXPENSE'
         AND EXTRACT(MONTH FROM t.transaction_date)=$2 AND EXTRACT(YEAR FROM t.transaction_date)=$3
       GROUP BY c.id, c.name, c.icon, c.color
       HAVING COALESCE(SUM(t.amount),0) > 0
       ORDER BY total DESC`,
      [userId, month, year]
    ),
    pool.query(
      `SELECT payment_type, COALESCE(SUM(amount),0) AS total, COUNT(*) AS count
       FROM transactions
       WHERE user_id=$1 AND type='EXPENSE'
         AND EXTRACT(MONTH FROM transaction_date)=$2 AND EXTRACT(YEAR FROM transaction_date)=$3
       GROUP BY payment_type ORDER BY total DESC`,
      [userId, month, year]
    ),
    pool.query(
      `SELECT transaction_date, COALESCE(SUM(CASE WHEN type='EXPENSE' THEN amount END),0) AS expense,
        COALESCE(SUM(CASE WHEN type='INCOME' THEN amount END),0) AS income
       FROM transactions
       WHERE user_id=$1 AND EXTRACT(MONTH FROM transaction_date)=$2 AND EXTRACT(YEAR FROM transaction_date)=$3
       GROUP BY transaction_date ORDER BY transaction_date`,
      [userId, month, year]
    ),
  ]);

  const summary = summaryResult.rows[0];
  res.json({
    month, year,
    total_income: Number(summary.total_income),
    total_expense: Number(summary.total_expense),
    savings: Number(summary.total_income) - Number(summary.total_expense),
    transaction_count: Number(summary.transaction_count),
    by_category: byCategoryResult.rows,
    by_payment_type: byPaymentResult.rows,
    daily_breakdown: dailyResult.rows,
  });
};

export const getYearlyReport = async (req: AuthRequest, res: Response): Promise<void> => {
  const year = Number(req.query.year) || new Date().getFullYear();
  const userId = req.user!.userId;

  const [monthlyResult, byCategoryResult] = await Promise.all([
    pool.query(
      `SELECT
        EXTRACT(MONTH FROM transaction_date) AS month,
        COALESCE(SUM(CASE WHEN type='EXPENSE' THEN amount END),0) AS expense,
        COALESCE(SUM(CASE WHEN type='INCOME'  THEN amount END),0) AS income
       FROM transactions
       WHERE user_id=$1 AND EXTRACT(YEAR FROM transaction_date)=$2
       GROUP BY month ORDER BY month`,
      [userId, year]
    ),
    pool.query(
      `SELECT c.name, c.icon, c.color, COALESCE(SUM(t.amount),0) AS total
       FROM categories c
       LEFT JOIN transactions t ON t.category_id=c.id AND t.user_id=$1 AND t.type='EXPENSE'
         AND EXTRACT(YEAR FROM t.transaction_date)=$2
       GROUP BY c.id, c.name, c.icon, c.color
       HAVING COALESCE(SUM(t.amount),0) > 0
       ORDER BY total DESC`,
      [userId, year]
    ),
  ]);

  const monthly = monthlyResult.rows.map((r: Record<string, unknown>) => ({
    month: Number(r.month),
    income: Number(r.income),
    expense: Number(r.expense),
    savings: Number(r.income) - Number(r.expense),
  }));

  const totals = monthly.reduce((acc, m) => ({
    total_income: acc.total_income + m.income,
    total_expense: acc.total_expense + m.expense,
    total_savings: acc.total_savings + m.savings,
  }), { total_income: 0, total_expense: 0, total_savings: 0 });

  res.json({ year, ...totals, monthly_breakdown: monthly, by_category: byCategoryResult.rows });
};

export const getComparisonReport = async (req: AuthRequest, res: Response): Promise<void> => {
  const { from_month, from_year, to_month, to_year } = req.query as Record<string, string>;
  if (!from_month || !from_year || !to_month || !to_year) {
    res.status(400).json({ message: 'from_month, from_year, to_month, to_year are required' });
    return;
  }
  const userId = req.user!.userId;

  const periodSummary = async (month: number, year: number) => {
    const result = await pool.query(
      `SELECT
        COALESCE(SUM(CASE WHEN type='EXPENSE' THEN amount END),0) AS expense,
        COALESCE(SUM(CASE WHEN type='INCOME'  THEN amount END),0) AS income
       FROM transactions
       WHERE user_id=$1 AND EXTRACT(MONTH FROM transaction_date)=$2 AND EXTRACT(YEAR FROM transaction_date)=$3`,
      [userId, month, year]
    );
    return { month, year, income: Number(result.rows[0].income), expense: Number(result.rows[0].expense) };
  };

  const [from, to] = await Promise.all([
    periodSummary(Number(from_month), Number(from_year)),
    periodSummary(Number(to_month), Number(to_year)),
  ]);

  res.json({
    from: { ...from, savings: from.income - from.expense },
    to: { ...to, savings: to.income - to.expense },
    diff: {
      income: to.income - from.income,
      expense: to.expense - from.expense,
      savings: (to.income - to.expense) - (from.income - from.expense),
    },
  });
};

export const getSavingsReport = async (req: AuthRequest, res: Response): Promise<void> => {
  const year = Number(req.query.year) || new Date().getFullYear();
  const userId = req.user!.userId;

  const result = await pool.query(
    `SELECT
      EXTRACT(MONTH FROM transaction_date) AS month,
      COALESCE(SUM(CASE WHEN type='INCOME'  THEN amount END),0) AS income,
      COALESCE(SUM(CASE WHEN type='EXPENSE' THEN amount END),0) AS expense
     FROM transactions
     WHERE user_id=$1 AND EXTRACT(YEAR FROM transaction_date)=$2
     GROUP BY month ORDER BY month`,
    [userId, year]
  );

  const rows = result.rows.map((r: Record<string, unknown>) => ({
    month: Number(r.month),
    income: Number(r.income),
    expense: Number(r.expense),
    savings: Number(r.income) - Number(r.expense),
  }));

  const total_saved = rows.reduce((acc, r) => acc + r.savings, 0);
  res.json({ year, total_saved, monthly: rows });
};
