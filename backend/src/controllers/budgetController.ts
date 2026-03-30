import { Response } from 'express';
import { pool } from '../db';
import { AuthRequest } from '../middleware/auth';

export const getBudgetSummary = async (req: AuthRequest, res: Response): Promise<void> => {
  const now = new Date();
  const month = Number(req.query.month) || now.getMonth() + 1;
  const year = Number(req.query.year) || now.getFullYear();
  const userId = req.user!.userId;

  const [budgetResult, categoryBudgetsResult, spentResult, catSpentResult, incomeResult] = await Promise.all([
    pool.query('SELECT * FROM budgets WHERE user_id=$1 AND month=$2 AND year=$3', [userId, month, year]),
    pool.query(
      `SELECT cb.*, c.name AS category_name, c.icon, c.color
       FROM category_budgets cb JOIN categories c ON c.id = cb.category_id
       WHERE cb.user_id=$1 AND cb.month=$2 AND cb.year=$3`,
      [userId, month, year]
    ),
    pool.query(
      `SELECT COALESCE(SUM(amount),0) AS total FROM transactions
       WHERE user_id=$1 AND type='EXPENSE'
       AND EXTRACT(MONTH FROM transaction_date)=$2 AND EXTRACT(YEAR FROM transaction_date)=$3`,
      [userId, month, year]
    ),
    pool.query(
      `SELECT category_id, COALESCE(SUM(amount),0) AS spent FROM transactions
       WHERE user_id=$1 AND type='EXPENSE'
       AND EXTRACT(MONTH FROM transaction_date)=$2 AND EXTRACT(YEAR FROM transaction_date)=$3
       GROUP BY category_id`,
      [userId, month, year]
    ),
    pool.query(
      `SELECT COALESCE(SUM(amount),0) AS total FROM transactions
       WHERE user_id=$1 AND type='INCOME'
       AND EXTRACT(MONTH FROM transaction_date)=$2 AND EXTRACT(YEAR FROM transaction_date)=$3`,
      [userId, month, year]
    ),
  ]);

  const totalBudget = Number(budgetResult.rows[0]?.total_amount ?? 0);
  const totalSpent = Number(spentResult.rows[0].total);
  const totalIncome = Number(incomeResult.rows[0].total);
  const catSpentMap = Object.fromEntries(catSpentResult.rows.map((r: { category_id: string; spent: string }) => [r.category_id, Number(r.spent)]));

  const categoryBudgets = categoryBudgetsResult.rows.map((cb: Record<string, unknown>) => ({
    ...cb,
    spent: catSpentMap[cb.category_id as string] ?? 0,
    remaining: Number(cb.amount) - (catSpentMap[cb.category_id as string] ?? 0),
  }));

  res.json({
    month, year,
    total_budget: totalBudget,
    total_spent: totalSpent,
    total_income: totalIncome,
    remaining: totalBudget - totalSpent,
    savings: totalIncome - totalSpent,
    category_budgets: categoryBudgets,
  });
};

export const upsertBudget = async (req: AuthRequest, res: Response): Promise<void> => {
  const { month, year, total_amount } = req.body;
  if (!month || !year || !total_amount) {
    res.status(400).json({ message: 'month, year, and total_amount are required' });
    return;
  }
  const result = await pool.query(
    `INSERT INTO budgets (user_id, month, year, total_amount)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (user_id, month, year) DO UPDATE SET total_amount=EXCLUDED.total_amount, updated_at=NOW()
     RETURNING *`,
    [req.user!.userId, month, year, total_amount]
  );
  res.json(result.rows[0]);
};

export const upsertCategoryBudget = async (req: AuthRequest, res: Response): Promise<void> => {
  const { category_id, month, year, amount } = req.body;
  if (!category_id || !month || !year || !amount) {
    res.status(400).json({ message: 'category_id, month, year, and amount are required' });
    return;
  }
  const result = await pool.query(
    `INSERT INTO category_budgets (user_id, category_id, month, year, amount)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (user_id, category_id, month, year) DO UPDATE SET amount=EXCLUDED.amount
     RETURNING *`,
    [req.user!.userId, category_id, month, year, amount]
  );
  res.json(result.rows[0]);
};

export const deleteCategoryBudget = async (req: AuthRequest, res: Response): Promise<void> => {
  const result = await pool.query(
    'DELETE FROM category_budgets WHERE id=$1 AND user_id=$2 RETURNING id',
    [req.params.id, req.user!.userId]
  );
  if (!result.rows[0]) { res.status(404).json({ message: 'Category budget not found' }); return; }
  res.status(204).send();
};
