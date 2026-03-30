import { Router } from 'express';
import { register, login, getMe, switchRole } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, getMe);
router.post('/switch-role', authenticate, switchRole);

export default router;
