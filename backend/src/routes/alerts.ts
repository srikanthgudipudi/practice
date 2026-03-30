import { Router } from 'express';
import { getAlertConfigs, createAlertConfig, updateAlertConfig, deleteAlertConfig, getActiveAlerts } from '../controllers/alertController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/active', getActiveAlerts);
router.get('/config', requireAdmin, getAlertConfigs);
router.post('/config', requireAdmin, createAlertConfig);
router.put('/config/:id', requireAdmin, updateAlertConfig);
router.delete('/config/:id', requireAdmin, deleteAlertConfig);

export default router;
