import { Router } from "express";
import * as classController from "../controllers/class_controller";
import { protect } from "../middleware/auth_middleware";
const router = Router();

router.get("/", classController.getAllClasses);
router.get("/students/:id", classController.showStudentsInClass);
router.post("/create",protect, classController.createClass);
router.post("/add-student/:id", protect, classController.addStudentToClass);
router.delete("/remove-student/:id", protect, classController.removeStudentFromClass);
router.delete("/delete/:id",protect, classController.deleteClass);
router.put("/edit/:id", protect, classController.editClass);
router.get("/show/:id", classController.getClassById);

export default router;