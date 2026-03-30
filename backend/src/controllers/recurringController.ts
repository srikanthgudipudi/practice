import { Response } from 'express';
import { pool } from '../db';
import { AuthRequest } from '../middleware/auth';
import { FrequencyType } from '../models/types';

const calcNextDue = (from: Date, frequency: FrequencyType): Date => {
  const d = new Date(from);
  if (frequency === 'DAILY') d.setDate(d.getDate() + 1);
  else if (frequency === 'WEEKLY') d.setDate(d.getDate() + 7);
  else if (frequency === 'MONTHLY') d.setMonth(d.getMonth() + 1);
  else if (frequency === 'YEARLY') d.setFullYear(d.getFullYear() + 1);
  return d;
};

export const getRecurring = async (req: AuthRequest, res: Response): Promise<void> => {
  const result = await pool.query(
    `SELECT r.*, c.name AS category_name, c.icon, c.color
     FROM recurring_transactions r
     LEFT JOIN categories c ON c.id = r.category_id
     WHERE r.user_id = $1 ORDER BY r.next_due_date ASC`,
    [req.user!.userId]
  );
  res.json(result.rows);
};

export const createRecurring = async (req: AuthRequest, res: Response): Promise<void> => {
  const { title, type, amount, category_id, payment_type, frequency, start_date, end_date } = req.body;
  if (!title || !type || !amount || !payment_type || !frequency || !start_date) {
    res.status(400).json({ message: 'title, type, amount, payment_type, frequency, and start_date are required' });
    return;
  }

  const nextDue = calcNextDue(new Date(start_date), frequency as FrequencyType);

  const result = await pool.query(
    `INSERT INTO recurring_transactions
      (user_id, title, type, amount, category_id, payment_type, frequency, start_date, end_date, next_due_date)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [req.user!.userId, title, type, amount, category_id ?? null, payment_type,
     frequency, start_date, end_date ?? null, nextDue.toISOString().split('T')[0]]
  );
  res.status(201).json(result.rows[0]);
};

export const updateRecurring = async (req: AuthRequest, res: Response): Promise<void> => {
  const { title, amount, category_id, payment_type, end_date, is_active } = req.body;
  const result = await pool.query(
    `UPDATE recurring_transactions SET
      title        = COALESCE($1, title),
      amount       = COALESCE($2, amount),
      category_id  = COALESCE($3, category_id),
      payment_type = COALESCE($4, payment_type),
      end_date     = COALESCE($5, end_date),
      is_active    = COALESCE($6, is_active)
     WHERE id=$7 AND user_id=$8 RETURNING *`,
    [title ?? null, amount ?? null, category_id ?? null, payment_type ?? null,
     end_date ?? null, is_active ?? null, req.params.id, req.user!.userId]
  );
  if (!result.rows[0]) { res.status(404).json({ message: 'Recurring transaction not found' }); return; }
  res.json(result.rows[0]);
};

export const deleteRecurring = async (req: AuthRequest, res: Response): Promise<void> => {
  const result = await pool.query(
    'DELETE FROM recurring_transactions WHERE id=$1 AND user_id=$2 RETURNING id',
    [req.params.id, req.user!.userId]
  );
  if (!result.rows[0]) { res.status(404).json({ message: 'Recurring transaction not found' }); return; }
  res.status(204).send();
};
