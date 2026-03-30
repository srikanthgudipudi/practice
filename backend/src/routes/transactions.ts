import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { getTransactions, getTransaction, createTransaction, updateTransaction, deleteTransaction, uploadReceipt, processOcr } from '../controllers/transactionController';
import { authenticate } from '../middleware/auth';

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../uploads'),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

const router = Router();
router.use(authenticate);

router.get('/', getTransactions);
router.post('/ocr', upload.single('receipt'), processOcr);
router.get('/:id', getTransaction);
router.post('/', createTransaction);
router.put('/:id', updateTransaction);
router.delete('/:id', deleteTransaction);
router.post('/:id/receipt', upload.single('receipt'), uploadReceipt);

export default router;
