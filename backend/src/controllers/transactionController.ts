import { Response } from 'express';
import path from 'path';
import { pool } from '../db';
import { AuthRequest } from '../middleware/auth';
import { checkAlerts } from './alertController';

export const getTransactions = async (req: AuthRequest, res: Response): Promise<void> => {
  const { month, year, type, category_id, page = '1', limit = '20' } = req.query as Record<string, string>;
  const offset = (Number(page) - 1) * Number(limit);

  const conditions: string[] = ['t.user_id = $1'];
  const params: unknown[] = [req.user!.userId];
  let i = 2;

  if (month && year) {
    conditions.push(`EXTRACT(MONTH FROM t.transaction_date) = $${i++} AND EXTRACT(YEAR FROM t.transaction_date) = $${i++}`);
    params.push(Number(month), Number(year));
  }
  if (type) { conditions.push(`t.type = $${i++}`); params.push(type); }
  if (category_id) { conditions.push(`t.category_id = $${i++}`); params.push(category_id); }

  const where = conditions.join(' AND ');

  const [dataResult, countResult] = await Promise.all([
    pool.query(
      `SELECT t.*, c.name AS category_name, c.icon AS category_icon, c.color AS category_color
       FROM transactions t
       LEFT JOIN categories c ON c.id = t.category_id
       WHERE ${where}
       ORDER BY t.transaction_date DESC, t.created_at DESC
       LIMIT $${i++} OFFSET $${i++}`,
      [...params, Number(limit), offset]
    ),
    pool.query(`SELECT COUNT(*) FROM transactions t WHERE ${where}`, params),
  ]);

  res.json({
    data: dataResult.rows,
    total: Number(countResult.rows[0].count),
    page: Number(page),
    limit: Number(limit),
  });
};

export const getTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  const result = await pool.query(
    `SELECT t.*, c.name AS category_name, c.icon AS category_icon, c.color AS category_color
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     WHERE t.id = $1 AND t.user_id = $2`,
    [req.params.id, req.user!.userId]
  );
  if (!result.rows[0]) { res.status(404).json({ message: 'Transaction not found' }); return; }
  res.json(result.rows[0]);
};

export const createTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  const { type, amount, description, category_id, payment_type, payee_name, transaction_date, is_recurring, recurring_id, notes } = req.body;

  if (!type || !amount || !payment_type) {
    res.status(400).json({ message: 'type, amount, and payment_type are required' });
    return;
  }

  const result = await pool.query(
    `INSERT INTO transactions
      (user_id, type, amount, description, category_id, payment_type, payee_name, transaction_date, is_recurring, recurring_id, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING *`,
    [req.user!.userId, type, amount, description ?? null, category_id ?? null, payment_type,
     payee_name ?? null, transaction_date || new Date().toISOString().split('T')[0],
     is_recurring ?? false, recurring_id ?? null, notes ?? null]
  );

  const transaction = result.rows[0];
  await checkAlerts(req.user!.userId, transaction);
  res.status(201).json(transaction);
};

export const updateTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  const { type, amount, description, category_id, payment_type, payee_name, transaction_date, notes } = req.body;

  const result = await pool.query(
    `UPDATE transactions SET
      type             = COALESCE($1, type),
      amount           = COALESCE($2, amount),
      description      = COALESCE($3, description),
      category_id      = COALESCE($4, category_id),
      payment_type     = COALESCE($5, payment_type),
      payee_name       = COALESCE($6, payee_name),
      transaction_date = COALESCE($7, transaction_date),
      notes            = COALESCE($8, notes),
      updated_at       = NOW()
    WHERE id = $9 AND user_id = $10
    RETURNING *`,
    [type ?? null, amount ?? null, description ?? null, category_id ?? null,
     payment_type ?? null, payee_name ?? null, transaction_date ?? null,
     notes ?? null, req.params.id, req.user!.userId]
  );

  if (!result.rows[0]) { res.status(404).json({ message: 'Transaction not found' }); return; }
  res.json(result.rows[0]);
};

export const deleteTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  const result = await pool.query(
    'DELETE FROM transactions WHERE id = $1 AND user_id = $2 RETURNING id',
    [req.params.id, req.user!.userId]
  );
  if (!result.rows[0]) { res.status(404).json({ message: 'Transaction not found' }); return; }
  res.status(204).send();
};

export const uploadReceipt = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.file) { res.status(400).json({ message: 'No file uploaded' }); return; }

  const receiptUrl = `/uploads/${req.file.filename}`;
  const result = await pool.query(
    'UPDATE transactions SET receipt_url = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING *',
    [receiptUrl, req.params.id, req.user!.userId]
  );
  if (!result.rows[0]) { res.status(404).json({ message: 'Transaction not found' }); return; }
  res.json({ receipt_url: receiptUrl });
};

export const processOcr = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.file) { res.status(400).json({ message: 'No file uploaded' }); return; }

  const keyFile = process.env.GOOGLE_VISION_KEY_FILE;
  if (!keyFile) {
    res.status(503).json({ message: 'OCR service not configured' });
    return;
  }

  try {
    const { ImageAnnotatorClient } = await import('@google-cloud/vision');
    const client = new ImageAnnotatorClient({ keyFilename: path.resolve(keyFile) });
    const [visionResult] = await client.textDetection(req.file.path);
    const text = visionResult.fullTextAnnotation?.text ?? '';

    const amountMatch = text.match(/(?:total|amount|subtotal)[^\d]*(\d+[\.,]\d{2})/i);
    const dateMatch = text.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/);

    res.json({
      raw_text: text,
      ocr_raw: visionResult.fullTextAnnotation,
      extracted: {
        amount: amountMatch ? parseFloat(amountMatch[1].replace(',', '.')) : null,
        date: dateMatch ? dateMatch[0] : null,
      },
    });
  } catch {
    res.status(500).json({ message: 'OCR processing failed' });
  }
};
