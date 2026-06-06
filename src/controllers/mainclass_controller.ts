import { Request, Response } from "express";
import { ICreateMainClassInput } from "../models/MainClass";
import * as mainClassService from "../services/mainclass_service";

declare global {
  namespace Express {
    interface Request {
      user?: { role: string; [key: string]: any };
    }
  }
}

export const createMainClass = async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== "Admin") {
      return res.status(403).json({ message: "Access denied. Admin privileges required." });
    }

    const mainClassData: ICreateMainClassInput = req.body;

    // Accept either `teachers` (array of user ids) or `teacherEmail` for backward compatibility
    if (!((mainClassData as any).teachers && (mainClassData as any).teachers.length > 0) && !(mainClassData as any).teacherEmail) {
      return res.status(400).json({ message: "teacherEmail or teachers is required" });
    }

    if (!mainClassData.startDate) {
      return res.status(400).json({ message: "startDate is required" });
    }

    if (mainClassData.duration === undefined || mainClassData.duration === null) {
      return res.status(400).json({ message: "duration is required" });
    }

    const newMainClass = await mainClassService.createMainClass(mainClassData);
    res.status(201).json(newMainClass);
  } catch (error) {
    const status = (error as any)?.status === 404 ? 404 : (error as any)?.status === 400 ? 400 : 500;
    const message =
      (error as any)?.status === 404
        ? "Teacher/Admin not found"
        : (error as any)?.status === 400
        ? "Invalid main class input"
        : "Error creating main class";
    res.status(status).json({
      message,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const updateMainClass = async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== "Admin") {
      return res.status(403).json({ message: "Access denied. Admin privileges required." });
    }

    const mainClassId = req.params.id;
    const updateData = req.body;

    if (!mainClassId) {
      return res.status(400).json({ message: "mainClassId is required" });
    }

    const updatedMainClass = await mainClassService.updateMainClass(mainClassId, updateData);
    return res.status(200).json({
      message: "Main class updated successfully",
      data: updatedMainClass,
    });
  } catch (error) {
    const status = (error as any)?.status === 404 ? 404 : (error as any)?.status === 400 ? 400 : 500;
    const message =
      (error as any)?.status === 404
        ? "Main class not found"
        : (error as any)?.status === 400
        ? "Invalid main class data"
        : "Error updating main class";

    return res.status(status).json({
      message,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const getAllMainClasses = async (_req: Request, res: Response) => {
  try {
    const mainClasses = await mainClassService.getAllMainClasses();
    res.status(200).json(mainClasses);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching main classes",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const getMainClassById = async (req: Request, res: Response) => {
  try {
    const mainClassId = req.params.id;
    const result = await mainClassService.getMainClassById(mainClassId);
    res.status(200).json(result);
  } catch (error) {
    const status = (error as any)?.status === 404 ? 404 : 500;
    const message = (error as any)?.status === 404 ? "Main class not found" : "Error fetching main class";

    res.status(status).json({
      message,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const addStudentToMainClass = async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== "Admin") {
      return res.status(403).json({ message: "Access denied. Admin privileges required." });
    }

    const { mainClassId, studentId, studentEmail, admissionDate } = req.body;

    if (!mainClassId || (!studentId && !studentEmail) || !admissionDate) {
      return res.status(400).json({ message: "mainClassId, studentId/studentEmail, and admissionDate are required" });
    }

    const result = await mainClassService.addStudentToMainClass(
      mainClassId,
      { studentId, studentEmail },
      new Date(admissionDate)
    );

    res.status(200).json({
      message: "Student added to main class successfully",
      data: result,
    });
  } catch (error) {
    const status = (error as any)?.status === 404 ? 404 : (error as any)?.status === 400 ? 400 : 500;
    const message =
      (error as any)?.status === 404
        ? "Main class or student not found"
        : (error as any)?.status === 400
        ? "Invalid request"
        : "Error adding student to main class";

    res.status(status).json({
      message,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const updateStudentBatch = async (req: Request, res: Response) => {
  try {
    if (!req.user || !["Admin", "Teacher"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied. Admin or Teacher privileges required." });
    }

    const { studentBatchId } = req.params;
    const updateData = req.body;

    if (!studentBatchId) {
      return res.status(400).json({ message: "studentBatchId is required" });
    }

    const updatedStudentBatch = await mainClassService.updateStudentBatch(
      studentBatchId,
      updateData
    );

    res.status(200).json({
      message: "Student batch updated successfully",
      data: updatedStudentBatch,
    });
  } catch (error) {
    const status = (error as any)?.status === 404 ? 404 : 500;
    const message = (error as any)?.status === 404 ? "Student batch not found" : "Error updating student batch";

    res.status(status).json({
      message,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const removeStudentFromMainClass = async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== "Admin") {
      return res.status(403).json({ message: "Access denied. Admin privileges required." });
    }

    const { mainClassId, studentId, studentEmail } = req.body;

    if (!mainClassId) {
      return res.status(400).json({ message: "mainClassId is required" });
    }

    if (!studentId && !studentEmail) {
      return res.status(400).json({ message: "studentId or studentEmail is required" });
    }

    const result = await mainClassService.removeStudentFromMainClass(mainClassId, {
      studentId,
      studentEmail,
    });

    return res.status(200).json({
      message: "Student removed from main class successfully",
      data: result,
    });
  } catch (error) {
    const status = (error as any)?.status === 404 ? 404 : (error as any)?.status === 400 ? 400 : 500;
    const message =
      (error as any)?.status === 404
        ? "Main class or student not found"
        : (error as any)?.status === 400
        ? "Invalid request"
        : "Error removing student from main class";

    return res.status(status).json({
      message,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const deleteMainClass = async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== "Admin") {
      return res.status(403).json({ message: "Access denied. Admin privileges required." });
    }

    const mainClassId = req.params.id;

    if (!mainClassId) {
      return res.status(400).json({ message: "mainClassId is required" });
    }

    await mainClassService.deleteMainClass(mainClassId);

    return res.status(200).json({ message: "Main class deleted successfully" });
  } catch (error) {
    const status = (error as any)?.status === 404 ? 404 : 500;
    const message = (error as any)?.status === 404 ? "Main class not found" : "Error deleting main class";

    return res.status(status).json({
      message,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
