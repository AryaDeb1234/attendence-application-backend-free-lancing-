import * as attendenceService from "../services/attendence_service";
import { Request, Response } from "express";



export const markAttendenceForClass = async (req: Request, res: Response) => {
    try {
        if (!req.user || (req.user.role !== 'Admin' && req.user.role !== 'Teacher')) {
            return res.status(403).json({ message: "Access denied. Admin or Teacher privileges required." });
        }

        const classId = req.params.classId;
        const { presentStudentIds, date } = req.body;

        if (!presentStudentIds || !Array.isArray(presentStudentIds)) {
            return res.status(400).json({ message: "presentStudentIds must be an array" });
        }

        const { presentRecords, absentRecords, classDocument, completionReport } = await attendenceService.markAttendenceForClass(
            classId,
            presentStudentIds,
            date ? new Date(date) : undefined,
        );
        res.status(201).json({ 
            message: "Attendance marked successfully for all students", 
            data: {
                presentStudents: presentRecords,
                absentStudents: absentRecords,
                presentCount: presentRecords.length,
                absentCount: absentRecords.length,
                classRecord: classDocument,
                completionReport,
            }
        });
    } catch (error) {
        const status = (error as any)?.status || 500;
        const message = (error as any)?.status === 400 ? (error as Error).message : (error as any)?.status === 404 ? "Class not found" : "Error marking attendance";
        res.status(status).json({ message, error: error instanceof Error ? error.message : String(error) });
    }
};

export const getClassAttendanceByDate = async (req: Request, res: Response) => {
    try {
        if (!req.user || (req.user.role !== 'Admin' && req.user.role !== 'Teacher')) {
            return res.status(403).json({ message: "Access denied. Admin or Teacher privileges required." });
        }

        const classId = req.params.classId;
        const { date, mainClassId, batchId } = req.query;
        const resolvedBatchId = (batchId as string | undefined) ?? classId;

        if (!date) {
            return res.status(400).json({ message: "Date is required (format: YYYY-MM-DD)" });
        }

        if (!resolvedBatchId && !mainClassId) {
            return res.status(400).json({ message: "Either batchId or mainClassId is required" });
        }

        const attendanceData = await attendenceService.getClassAttendanceByDate(
            new Date(date as string),
            resolvedBatchId,
            mainClassId as string | undefined,
        );
        res.status(200).json({ message: "Attendance data retrieved successfully", data: attendanceData });
    } catch (error) {
        const status = (error as any)?.status || 500;
        const message = (error as any)?.status === 400 ? (error as Error).message : (error as any)?.status === 404 ? (error as Error).message : "Error retrieving attendance";
        res.status(status).json({ message, error: error instanceof Error ? error.message : String(error) });
    }
};

export const getClassAttendanceByDateRange = async (req: Request, res: Response) => {
    try {
        if (!req.user || (req.user.role !== 'Admin' && req.user.role !== 'Teacher')) {
            return res.status(403).json({ message: "Access denied. Admin or Teacher privileges required." });
        }

        const classId = req.params.classId;
        const { startDate, endDate, mainClassId } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ message: "Both startDate and endDate are required (format: YYYY-MM-DD)" });
        }

        const attendanceData = await attendenceService.getClassAttendanceByDateRange(
            classId,
            new Date(startDate as string),
            new Date(endDate as string),
            mainClassId as string | undefined,
        );
        res.status(200).json({ message: "Attendance data retrieved successfully", data: attendanceData });
    } catch (error) {
        const status = (error as any)?.status || 500;
        const message = (error as any)?.status === 400 ? (error as Error).message : (error as any)?.status === 404 ? (error as Error).message : "Error retrieving attendance";
        res.status(status).json({ message, error: error instanceof Error ? error.message : String(error) });
    }
};

export const updateClassAttendanceRecord = async (req: Request, res: Response) => {
    try {
        if (!req.user || req.user.role !== 'Admin') {
            return res.status(403).json({ message: "Access denied. Admin privileges required." });
        }

        const classId = req.params.classId;
        const { studentEmail, mainClassId, date, status } = req.body;

        if (!studentEmail || !mainClassId || !date || !status) {
            return res.status(400).json({ message: "studentEmail, mainClassId, date, and status (present/absent) are required" });
        }

        if (!['present', 'absent'].includes(status)) {
            return res.status(400).json({ message: "status must be 'present' or 'absent'" });
        }

        const updatedClassDocument = await attendenceService.updateClassAttendanceRecord(
            classId,
            mainClassId,
            new Date(date),
            studentEmail,
            status,
        );
        res.status(200).json({ 
            message: `Student marked as ${status} successfully`,
            data: updatedClassDocument
        });
    } catch (error) {
        const status = (error as any)?.status || 500;
        const message = (error as any)?.status === 400 ? (error as Error).message : (error as any)?.status === 404 ? (error as Error).message : "Error updating attendance record";
        res.status(status).json({ message, error: error instanceof Error ? error.message : String(error) });
    }
};

export const completeAttendenceForClass = async (req: Request, res: Response) => {
    try {
        if (!req.user || (req.user.role !== 'Admin' && req.user.role !== 'Teacher')) {
            return res.status(403).json({ message: "Access denied. Admin or Teacher privileges required." });
        }

        const classId = req.params.classId;
        const { date, mainClassId } = req.body;

        const result = await attendenceService.completeAttendanceAndNotifyAdmin(
            classId,
            date ? new Date(date) : undefined,
            mainClassId,
        );

        res.status(200).json({
            message: "Attendance completed and absent student report sent to admin email",
            data: result,
        });
    } catch (error) {
        const status = (error as any)?.status || 500;
        const message = (error as any)?.status === 400
            ? (error as Error).message
            : (error as any)?.status === 404
                ? (error as Error).message
                : "Error completing attendance report";

        res.status(status).json({ message, error: error instanceof Error ? error.message : String(error) });
    }
};

export const getMainClassAttendanceSummary = async (req: Request, res: Response) => {
    try {
        if (!req.user || (req.user.role !== 'Admin' && req.user.role !== 'Teacher')) {
            return res.status(403).json({ message: "Access denied. Admin or Teacher privileges required." });
        }

        const mainClassId = req.params.mainClassId;
        const summary = await attendenceService.getMainClassAttendanceSummary(mainClassId);

        res.status(200).json({
            message: "Main class attendance summary retrieved successfully",
            data: summary,
        });
    } catch (error) {
        const status = (error as any)?.status || 500;
        const message = (error as any)?.status === 400
            ? (error as Error).message
            : (error as any)?.status === 404
                ? (error as Error).message
                : "Error retrieving main class attendance summary";

        res.status(status).json({ message, error: error instanceof Error ? error.message : String(error) });
    }
};

export const getStudentMainClassAttendanceDetails = async (req: Request, res: Response) => {
    try {
        if (!req.user || (req.user.role !== 'Admin' && req.user.role !== 'Teacher')) {
            return res.status(403).json({ message: "Access denied. Admin or Teacher privileges required." });
        }

        const mainClassId = req.params.mainClassId;
        const studentId = req.params.studentId;

        const details = await attendenceService.getStudentMainClassAttendanceDetails(mainClassId, studentId);

        res.status(200).json({
            message: "Student attendance details retrieved successfully",
            data: details,
        });
    } catch (error) {
        const status = (error as any)?.status || 500;
        const message = (error as any)?.status === 400
            ? (error as Error).message
            : (error as any)?.status === 404
                ? (error as Error).message
                : "Error retrieving student attendance details";

        res.status(status).json({ message, error: error instanceof Error ? error.message : String(error) });
    }
};
