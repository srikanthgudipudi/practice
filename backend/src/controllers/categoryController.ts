import { Response } from 'express';
import { pool } from '../db';
import { AuthRequest } from '../middleware/auth';

export const getCategories = async (_req: AuthRequest, res: Response): Promise<void> => {
  const result = await pool.query(
    'SELECT * FROM categories ORDER BY is_default DESC, name ASC'
  );
  res.json(result.rows);
};

export const createCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, icon, color, parent_id } = req.body;
  if (!name) {
    res.status(400).json({ message: 'name is required' });
    return;
  }

  const result = await pool.query(
    'INSERT INTO categories (name, icon, color, parent_id, is_default) VALUES ($1, $2, $3, $4, FALSE) RETURNING *',
    [name, icon ?? null, color ?? null, parent_id ?? null]
  );
  res.status(201).json(result.rows[0]);
};

export const updateCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { name, icon, color, parent_id } = req.body;

  const result = await pool.query(
    `UPDATE categories SET
      name      = COALESCE($1, name),
      icon      = COALESCE($2, icon),
      color     = COALESCE($3, color),
      parent_id = COALESCE($4, parent_id)
    WHERE id = $5 RETURNING *`,
    [name ?? null, icon ?? null, color ?? null, parent_id ?? null, id]
  );

  if (!result.rows[0]) {
    res.status(404).json({ message: 'Category not found' });
    return;
  }
  res.json(result.rows[0]);
};

export const deleteCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  const existing = await pool.query('SELECT is_default FROM categories WHERE id = $1', [id]);
  if (!existing.rows[0]) {
    res.status(404).json({ message: 'Category not found' });
    return;
  }
  if (existing.rows[0].is_default) {
    res.status(400).json({ message: 'Default categories cannot be deleted' });
    return;
  }

  await pool.query('DELETE FROM categories WHERE id = $1', [id]);
  res.status(204).send();
};
