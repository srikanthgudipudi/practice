import { Response } from 'express';
import { pool } from '../db';
import { AuthRequest } from '../middleware/auth';

export const getTransactions = async (req: AuthRequest, res: Response): Promise<void> => {
  const { type, category, from, to } = req.query;
  const userId = req.user!.userId;

  let query = 'SELECT * FROM transactions WHERE user_id = $1';
  const params: any[] = [userId];

  if (type) { params.push(type); query += ` AND type = $${params.length}`; }
  if (category) { params.push(category); query += ` AND category = $${params.length}`; }
  if (from) { params.push(from); query += ` AND date >= $${params.length}`; }
  if (to) { params.push(to); query += ` AND date <= $${params.length}`; }

  query += ' ORDER BY date DESC, created_at DESC';

  const result = await pool.query(query, params);
  res.json(result.rows);
};

export const createTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  const { type, category, amount, description, date } = req.body;
  if (!type || !category || !amount) {
    res.status(400).json({ message: 'type, category, and amount are required' });
    return;
  }

  const result = await pool.query(
    `INSERT INTO transactions (user_id, type, category, amount, description, date)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [req.user!.userId, type, category, amount, description, date || new Date()]
  );
  res.status(201).json(result.rows[0]);
};

export const updateTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { type, category, amount, description, date } = req.body;

  const result = await pool.query(
    `UPDATE transactions
     SET type = $1, category = $2, amount = $3, description = $4, date = $5
     WHERE id = $6 AND user_id = $7
     RETURNING *`,
    [type, category, amount, description, date, id, req.user!.userId]
  );

  if (result.rowCount === 0) {
    res.status(404).json({ message: 'Transaction not found' });
    return;
  }
  res.json(result.rows[0]);
};

export const deleteTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const result = await pool.query(
    'DELETE FROM transactions WHERE id = $1 AND user_id = $2',
    [id, req.user!.userId]
  );
  if (result.rowCount === 0) {
    res.status(404).json({ message: 'Transaction not found' });
    return;
  }
  res.status(204).send();
};
