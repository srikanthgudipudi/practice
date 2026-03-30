import { Response } from 'express';
import { pool } from '../db';
import { AuthRequest } from '../middleware/auth';

export const getBudgets = async (req: AuthRequest, res: Response): Promise<void> => {
  const { month } = req.query; // format: YYYY-MM-01
  const userId = req.user!.userId;

  let query = 'SELECT * FROM budgets WHERE user_id = $1';
  const params: any[] = [userId];

  if (month) {
    params.push(month);
    query += ` AND month = $${params.length}`;
  }

  query += ' ORDER BY category';
  const result = await pool.query(query, params);
  res.json(result.rows);
};

export const upsertBudget = async (req: AuthRequest, res: Response): Promise<void> => {
  const { category, amount, month } = req.body;
  if (!category || !amount || !month) {
    res.status(400).json({ message: 'category, amount, and month are required' });
    return;
  }

  const result = await pool.query(
    `INSERT INTO budgets (user_id, category, amount, month)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, category, month)
     DO UPDATE SET amount = EXCLUDED.amount
     RETURNING *`,
    [req.user!.userId, category, amount, month]
  );
  res.json(result.rows[0]);
};

export const deleteBudget = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const result = await pool.query(
    'DELETE FROM budgets WHERE id = $1 AND user_id = $2',
    [id, req.user!.userId]
  );
  if (result.rowCount === 0) {
    res.status(404).json({ message: 'Budget not found' });
    return;
  }
  res.status(204).send();
};
