import {Router} from 'express';
import { sendotp, verifyotp } from '../controllers/User_controller';
const router = Router();

router.post('/sendotp', sendotp);
router.post('/verifyotp', verifyotp);

export default router;