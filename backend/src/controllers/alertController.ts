import { Response } from 'express';
import { pool } from '../db';
import { AuthRequest } from '../middleware/auth';

// Called internally after a transaction is created/updated
export const checkAlerts = async (userId: string, transaction: { type: string; amount: number; category_id?: string }): Promise<void> => {
  const alertsResult = await pool.query(
    'SELECT * FROM alert_configs WHERE user_id = $1 AND is_active = TRUE',
    [userId]
  );
  const alerts = alertsResult.rows;
  if (!alerts.length) return;

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  for (const alert of alerts) {
    if (alert.type === 'LARGE_TRANSACTION' && transaction.type === 'EXPENSE') {
      if (Number(transaction.amount) >= Number(alert.threshold_value)) {
        console.warn(`[ALERT] Large transaction: $${transaction.amount} >= threshold $${alert.threshold_value}`);
      }
    }

    if (alert.type === 'BUDGET_THRESHOLD') {
      const [spentResult, budgetResult] = await Promise.all([
        pool.query(
          `SELECT COALESCE(SUM(amount),0) AS spent FROM transactions
           WHERE user_id=$1 AND type='EXPENSE'
           AND EXTRACT(MONTH FROM transaction_date)=$2 AND EXTRACT(YEAR FROM transaction_date)=$3`,
          [userId, month, year]
        ),
        pool.query(
          'SELECT total_amount FROM budgets WHERE user_id=$1 AND month=$2 AND year=$3',
          [userId, month, year]
        ),
      ]);
      const spent = Number(spentResult.rows[0].spent);
      const total = Number(budgetResult.rows[0]?.total_amount ?? 0);
      if (total > 0 && (spent / total) * 100 >= Number(alert.threshold_value)) {
        console.warn(`[ALERT] Budget threshold reached: ${Math.round((spent/total)*100)}% of monthly budget`);
      }
    }

    if (alert.type === 'CATEGORY_THRESHOLD' && alert.category_id && alert.category_id === transaction.category_id) {
      const [spentResult, budgetResult] = await Promise.all([
        pool.query(
          `SELECT COALESCE(SUM(amount),0) AS spent FROM transactions
           WHERE user_id=$1 AND type='EXPENSE' AND category_id=$2
           AND EXTRACT(MONTH FROM transaction_date)=$3 AND EXTRACT(YEAR FROM transaction_date)=$4`,
          [userId, alert.category_id, month, year]
        ),
        pool.query(
          'SELECT amount FROM category_budgets WHERE user_id=$1 AND category_id=$2 AND month=$3 AND year=$4',
          [userId, alert.category_id, month, year]
        ),
      ]);
      const spent = Number(spentResult.rows[0].spent);
      const budgeted = Number(budgetResult.rows[0]?.amount ?? 0);
      if (budgeted > 0 && (spent / budgeted) * 100 >= Number(alert.threshold_value)) {
        console.warn(`[ALERT] Category budget threshold reached: ${Math.round((spent/budgeted)*100)}% of category budget`);
      }
    }
  }
};

export const getAlertConfigs = async (req: AuthRequest, res: Response): Promise<void> => {
  const result = await pool.query(
    `SELECT a.*, c.name AS category_name FROM alert_configs a
     LEFT JOIN categories c ON c.id = a.category_id
     WHERE a.user_id = $1 ORDER BY a.created_at DESC`,
    [req.user!.userId]
  );
  res.json(result.rows);
};

export const createAlertConfig = async (req: AuthRequest, res: Response): Promise<void> => {
  const { type, threshold_value, category_id } = req.body;
  if (!type || threshold_value === undefined) {
    res.status(400).json({ message: 'type and threshold_value are required' });
    return;
  }
  const result = await pool.query(
    'INSERT INTO alert_configs (user_id, type, threshold_value, category_id) VALUES ($1,$2,$3,$4) RETURNING *',
    [req.user!.userId, type, threshold_value, category_id ?? null]
  );
  res.status(201).json(result.rows[0]);
};

export const updateAlertConfig = async (req: AuthRequest, res: Response): Promise<void> => {
  const { threshold_value, is_active } = req.body;
  const result = await pool.query(
    `UPDATE alert_configs SET
      threshold_value = COALESCE($1, threshold_value),
      is_active       = COALESCE($2, is_active)
     WHERE id = $3 AND user_id = $4 RETURNING *`,
    [threshold_value ?? null, is_active ?? null, req.params.id, req.user!.userId]
  );
  if (!result.rows[0]) { res.status(404).json({ message: 'Alert config not found' }); return; }
  res.json(result.rows[0]);
};

export const deleteAlertConfig = async (req: AuthRequest, res: Response): Promise<void> => {
  const result = await pool.query(
    'DELETE FROM alert_configs WHERE id = $1 AND user_id = $2 RETURNING id',
    [req.params.id, req.user!.userId]
  );
  if (!result.rows[0]) { res.status(404).json({ message: 'Alert config not found' }); return; }
  res.status(204).send();
};

export const getActiveAlerts = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const triggered: { type: string; message: string }[] = [];

  const [alertsResult, budgetResult, spentResult] = await Promise.all([
    pool.query('SELECT * FROM alert_configs WHERE user_id=$1 AND is_active=TRUE', [userId]),
    pool.query('SELECT total_amount FROM budgets WHERE user_id=$1 AND month=$2 AND year=$3', [userId, month, year]),
    pool.query(
      `SELECT COALESCE(SUM(amount),0) AS spent FROM transactions
       WHERE user_id=$1 AND type='EXPENSE'
       AND EXTRACT(MONTH FROM transaction_date)=$2 AND EXTRACT(YEAR FROM transaction_date)=$3`,
      [userId, month, year]
    ),
  ]);

  const alerts = alertsResult.rows;
  const totalBudget = Number(budgetResult.rows[0]?.total_amount ?? 0);
  const totalSpent = Number(spentResult.rows[0].spent);

  for (const alert of alerts) {
    if (alert.type === 'BUDGET_THRESHOLD' && totalBudget > 0) {
      const pct = (totalSpent / totalBudget) * 100;
      if (pct >= Number(alert.threshold_value)) {
        triggered.push({ type: 'BUDGET_THRESHOLD', message: `You've used ${Math.round(pct)}% of your monthly budget` });
      }
    }

    if (alert.type === 'CATEGORY_THRESHOLD' && alert.category_id) {
      const [catSpent, catBudget] = await Promise.all([
        pool.query(
          `SELECT COALESCE(SUM(amount),0) AS spent FROM transactions
           WHERE user_id=$1 AND type='EXPENSE' AND category_id=$2
           AND EXTRACT(MONTH FROM transaction_date)=$3 AND EXTRACT(YEAR FROM transaction_date)=$4`,
          [userId, alert.category_id, month, year]
        ),
        pool.query(
          'SELECT amount FROM category_budgets WHERE user_id=$1 AND category_id=$2 AND month=$3 AND year=$4',
          [userId, alert.category_id, month, year]
        ),
      ]);
      const spent = Number(catSpent.rows[0].spent);
      const budgeted = Number(catBudget.rows[0]?.amount ?? 0);
      if (budgeted > 0 && (spent / budgeted) * 100 >= Number(alert.threshold_value)) {
        triggered.push({ type: 'CATEGORY_THRESHOLD', message: `Category budget ${Math.round((spent/budgeted)*100)}% used` });
      }
    }
  }

  res.json(triggered);
};
