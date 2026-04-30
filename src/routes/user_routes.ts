import { Router } from "express";
import * as userController from "../controllers/User_controller";
import { protect } from "../middleware/auth_middleware";
import upload from "../middleware/multer";

const router = Router();

router.get("/students", protect, userController.getAllStudents);
router.get("/teachers", protect, userController.getAllTeachers);
router.post(
	"/add",
	protect,
	upload.fields([
		{ name: "profilePic", maxCount: 1 },
		{ name: "documents", maxCount: 3 },
	]),
	userController.addInstituteUser,
);
router.patch(
	"/edit/:userId",
	protect,
	upload.fields([
		{ name: "profilePic", maxCount: 1 },
		{ name: "documents", maxCount: 3 },
	]),
	userController.editInstituteUser,
);
router.delete("/delete/:userId", protect, userController.deleteInstituteUser);
router.get("/details/:userId", protect, userController.userDetails);
export default router;
