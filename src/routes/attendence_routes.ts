import * as attendencecontroller from "../controllers/attendence_controller";
import { Router } from "express";
import { protect } from "../middleware/auth_middleware";
const router = Router();


router.post("/mark/:classId", protect, attendencecontroller.markAttendenceForClass);
router.get("/summary/mainclass/:mainClassId", protect, attendencecontroller.getMainClassAttendanceSummary);
router.get("/summary/mainclass/:mainClassId/student/:studentId", protect, attendencecontroller.getStudentMainClassAttendanceDetails);
router.get("/by-date", protect, attendencecontroller.getClassAttendanceByDate);
router.get("/by-date/:classId", protect, attendencecontroller.getClassAttendanceByDate);
//custom attendence by admin
router.patch("/update/:classId", protect, attendencecontroller.updateClassAttendanceRecord);
//optional
router.get("/by-date-range/:classId", protect, attendencecontroller.getClassAttendanceByDateRange);


export default router;