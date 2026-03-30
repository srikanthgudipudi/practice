import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { pool } from '../db';
import { AuthRequest } from '../middleware/auth';
import { UserRole } from '../models/types';

const signToken = (userId: string, email: string, role: UserRole, activeRole: UserRole) => {
  const options: SignOptions = { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'] };
  return jwt.sign({ userId, email, role, active_role: activeRole }, process.env.JWT_SECRET!, options);
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ message: 'email and password are required' });
    return;
  }

  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = result.rows[0];

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    res.status(401).json({ message: 'Invalid credentials' });
    return;
  }

  const token = signToken(user.id, user.email, user.role, user.role);
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, active_role: user.role },
  });
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  const result = await pool.query(
    'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
    [req.user!.userId]
  );
  const user = result.rows[0];
  res.json({ ...user, active_role: req.user!.active_role });
};

export const switchRole = async (req: AuthRequest, res: Response): Promise<void> => {
  const { role } = req.body as { role: UserRole };
  if (!role || !['ADMIN', 'USER'].includes(role)) {
    res.status(400).json({ message: 'role must be ADMIN or USER' });
    return;
  }

  // Only ADMIN accounts can switch to ADMIN role
  if (role === 'ADMIN' && req.user!.role !== 'ADMIN') {
    res.status(403).json({ message: 'Your account does not have ADMIN privileges' });
    return;
  }

  const token = signToken(req.user!.userId, req.user!.email, req.user!.role, role);
  res.json({ token, active_role: role });
};

export const register = async (req: Request, res: Response): Promise<void> => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) {
    res.status(400).json({ message: 'name, email, and password are required' });
    return;
  }

  const userRole: UserRole = role === 'ADMIN' ? 'ADMIN' : 'USER';
  const password_hash = await bcrypt.hash(password, 10);

  try {
    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
      [name, email, password_hash, userRole]
    );
    const user = result.rows[0];
    const token = signToken(user.id, user.email, user.role, user.role);
    res.status(201).json({ token, user: { ...user, active_role: user.role } });
  } catch (err: any) {
    if (err.code === '23505') {
      res.status(409).json({ message: 'Email already registered' });
    } else {
      throw err;
    }
  }
};
