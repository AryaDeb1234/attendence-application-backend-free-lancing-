import { Router } from "express";
import * as mainClassController from "../controllers/mainclass_controller";
import { protect } from "../middleware/auth_middleware";

const router = Router();

router.get("/", mainClassController.getAllMainClasses);
router.get("/show/:id", mainClassController.getMainClassById);
router.post("/create", protect, mainClassController.createMainClass);
router.patch("/edit/:id", protect, mainClassController.updateMainClass);
router.delete("/delete/:id", protect, mainClassController.deleteMainClass);
router.post("/add-student", protect, mainClassController.addStudentToMainClass);
router.delete("/remove-student", protect, mainClassController.removeStudentFromMainClass);
//router.put("/:studentBatchId", protect, mainClassController.updateStudentBatch);
router.patch("/:studentBatchId", protect, mainClassController.updateStudentBatch);

export default router;
