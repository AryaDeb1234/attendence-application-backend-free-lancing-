import { Router } from "express";
import * as feesController from "../controllers/fees_controller";
import { protect } from "../middleware/auth_middleware";

const router = Router();

router.get("/details/:mainClassId/:studentId", protect, feesController.getFeesByMainClassAndStudent);
router.post("/pay/:mainClassId/:studentId", protect, feesController.recordStudentFeesPaid);
router.patch("/undo/:feesId", protect, feesController.undoFeesPaymentById);
router.patch("/edit/:feesId", protect, feesController.editFeesById);
router.get("/history/:mainClassId/:studentId", protect, feesController.getStudentFeesHistory);
router.post("/trigger-reminder", protect, feesController.triggerFeesReminder);

export default router;