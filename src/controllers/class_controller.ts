import * as classService from "../services/class_service";
import { IBatch, ICreateBatchInput } from "../models/Batch";
import { Request, Response } from "express";

declare global {
    namespace Express {
        interface Request {
            user?: { role: string; [key: string]: any };
        }
    }
}


export const createClass = async (req: Request, res: Response) => {
    try {
        if (!req.user || req.user.role!=='Admin') {
            return res.status(403).json({ message: "Access denied. Admin privileges required." });
        }
        const classData: ICreateBatchInput = req.body;
        const newClass = await classService.createClass(classData);
        res.status(201).json(newClass);
    } catch (error) {
        const status = (error as any)?.status === 400 ? 400 : 500;
        const message = (error as any)?.status === 400 ? "Invalid class data" : "Error creating class";
        res.status(status).json({ message,  error: error instanceof Error ? error.message : String(error) });
    }
};

export const deleteClass = async (req: Request, res: Response) => {
    try {
        if (!req.user || req.user.role!=='Admin') {
            return res.status(403).json({ message: "Access denied. Admin privileges required." });
        }
        const classId = req.params.id;
        await classService.deleteClass(classId);
        res.status(200).json({ message: "Class deleted successfully" });
    }catch (error) {
        const status = (error as any)?.status === 404 ? 404 : 500;
        const message = (error as any)?.status === 404 ? "Class not found" : "Error deleting class";
        res.status(status).json({ message, error: error instanceof Error ? error.message : String(error) });
    }
};

export const editClass = async (req: Request, res: Response) => {
    try {
        if (!req.user || req.user.role!=='Admin') { 
            return res.status(403).json({ message: "Access denied. Admin privileges required." });
        }
        const classId = req.params.id;
        const updateData: Partial<IBatch> = req.body;
        const updatedClass = await classService.editClass(classId, updateData);
        res.status(200).json(updatedClass);
    }catch (error) {
        const status = (error as any)?.status === 404 ? 404 : (error as any)?.status === 400 ? 400 : 500;
        const message = (error as any)?.status === 404 ? "Class not found" : (error as any)?.status === 400 ? "Invalid class data" : "Error updating class";
        res.status(status).json({ message, error: error instanceof Error ? error.message : String(error) });
    }
};

export const getClassById = async (req: Request, res: Response) => {
    try {
        const classId = req.params.id;
        const classData = await classService.getClassById(classId);
        res.status(200).json(classData);
    }catch (error) {
        const status = (error as any)?.status === 404 ? 404 : 500;
        const message = (error as any)?.status === 404 ? "Class not found" : "Error fetching class";
        res.status(status).json({ message, error: error instanceof Error ? error.message : String(error) });
    }
};

export const getAllClasses = async (req: Request, res: Response) => {
    try {
        const classes = await classService.getAllClasses();
        res.status(200).json(classes);
    }catch (error) {
        res.status(500).json({ message: "Error fetching classes", error: error instanceof Error ? error.message : String(error) });
    }
};

export const showStudentsInClass = async (req: Request, res: Response) => {
    try {
        const classId = req.params.id;
        const students = await classService.showStudentsInClass(classId);
        res.status(200).json(students);
    }catch (error) {
        const status = (error as any)?.status === 404 ? 404 : 500;
        const message = (error as any)?.status === 404 ? "Class not found" : "Error fetching students";
        res.status(status).json({ message, error: error instanceof Error ? error.message : String(error) });
    }
};

export const addStudentToClass = async (req: Request, res: Response) => {
    try {
        if (!req.user || !["Admin", "Teacher"].includes(req.user.role)) {
            return res.status(403).json({ message: "Access denied. Admin or Teacher privileges required." });
        }

        const classId = req.params.id;
        const { mainClassId, studentEmail } = req.body;

        if (!mainClassId || !studentEmail) {
            return res.status(400).json({ message: "mainClassId and studentEmail are required" });
        }

        const updatedClass = await classService.addStudentToClass(
            classId,
            mainClassId,
            studentEmail,
            req.user.id,
            req.user.role,
        );

        res.status(200).json({
            message: "Student added to batch successfully",
            data: updatedClass,
        });
    } catch (error) {
        const status = [400, 403, 404].includes((error as any)?.status) ? (error as any).status : 500;
        const message = status === 400
            ? "Invalid request data"
            : status === 403
                ? "Access denied"
                : status === 404
                    ? "Class, main class, or student not found"
                    : "Error adding student to class";

        res.status(status).json({ message, error: error instanceof Error ? error.message : String(error) });
    }
};