import { Router } from 'express';
import { getMonthlyReport, getYearlyReport, getComparisonReport, getSavingsReport } from '../controllers/reportController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/monthly', getMonthlyReport);
router.get('/yearly', getYearlyReport);
router.get('/comparison', getComparisonReport);
router.get('/savings', getSavingsReport);

export default router;
