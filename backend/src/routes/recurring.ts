import { Router } from 'express';
import { getRecurring, createRecurring, updateRecurring, deleteRecurring } from '../controllers/recurringController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', getRecurring);
router.post('/', requireAdmin, createRecurring);
router.put('/:id', requireAdmin, updateRecurring);
router.delete('/:id', requireAdmin, deleteRecurring);

export default router;
