import { Router } from 'express';
import { getBudgetSummary, upsertBudget, upsertCategoryBudget, deleteCategoryBudget } from '../controllers/budgetController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/summary', getBudgetSummary);
router.post('/', requireAdmin, upsertBudget);
router.post('/category', requireAdmin, upsertCategoryBudget);
router.delete('/category/:id', requireAdmin, deleteCategoryBudget);

export default router;
