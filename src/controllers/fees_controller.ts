import { Request, Response } from "express";
import * as feesService from "../services/fees_service";
import { triggerFeesReminderManually } from "../services/fees_cron_service";
import { IFees } from "../models/Fees";

type RecordStudentFeesBody = Partial<Pick<IFees, "student" | "totalAmount" | "PaidAt" | "month">> & {
    mainClassId?: string;
    studentId?: string;
    mainClass?: string;
};

type EditFeesBody = Partial<Pick<IFees, "month" | "baseamount" | "totalAmount" | "PaidAt">> & {
    mainClassId?: string;
    studentId?: string;
    mainClass?: string;
    student?: string;
};

export const getFeesByMainClassAndStudent = async (req: Request, res: Response) => {
    try {
        const studentId = req.params.studentId;
        const mainClassId = req.params.mainClassId;

        if (!studentId || !mainClassId) {
            return res.status(400).json({ message: "studentId and mainClassId are required" });
        }

        const fees = await feesService.getFeesByMainClassStudent(mainClassId, studentId);
        res.status(200).json(fees);
    } catch (error) {
        const status = (error as any)?.status || 500;
        res.status(status).json({
            message: status === 404 ? (error as Error).message : status === 400 ? (error as Error).message : "Error fetching fees details",
            error: error instanceof Error ? error.message : String(error),
        });
    }
};

export const recordStudentFeesPaid = async (req: Request, res: Response) => {
    try {
        if (!req.user || (req.user.role !== "Admin" && req.user.role !== "Teacher")) {
            return res.status(403).json({ message: "Access denied. Admin or Teacher privileges required." });
        }

        const body: RecordStudentFeesBody = req.body;
        const studentId = req.params.studentId ?? body.studentId ?? body.student?.toString();
        const mainClassId = req.params.mainClassId ?? body.mainClassId ?? body.mainClass?.toString();
        const amountPaid = body.totalAmount;
        const paidAt = body.PaidAt;
        const month = body.month;
        
        if (!studentId || !mainClassId) {
            return res.status(400).json({ message: "mainClassId and studentId are required" });
        }

        const savedFees = await feesService.recordStudentFeesPaid({
            mainClassId,
            studentId,
            month,
            amountPaid,
            paidAt,
        });

        res.status(201).json({ message: "Student fees paid record saved successfully", fees: savedFees });
    } catch (error) {
        const status = (error as any)?.status || 500;
        res.status(status).json({
            message: status === 404 ? (error as Error).message : status === 400 ? (error as Error).message : "Error saving fees payment",
            error: error instanceof Error ? error.message : String(error),
        });
    }
};

export const getStudentFeesHistory = async (req: Request, res: Response) => {
    try {
        if (!req.user || (req.user.role !== "Admin" && req.user.role !== "Teacher" && req.user.role !== "Student")) {
            return res.status(403).json({ message: "Access denied. Admin, Teacher, or Student privileges required." });
        }

        const studentId = req.params.studentId;
        const mainClassId = req.params.mainClassId;

        if (!studentId || !mainClassId) {
            return res.status(400).json({ message: "studentId and mainClassId are required" });
        }

        const feesHistory = await feesService.getStudentFeesHistory(mainClassId, studentId);

        res.status(200).json({
            mainClassId,
            studentId,
            count: feesHistory.length,
            history: feesHistory,
        });
    } catch (error) {
        const status = (error as any)?.status || 500;
        res.status(status).json({
            message: status === 404 ? (error as Error).message : status === 400 ? (error as Error).message : "Error fetching student fees history",
            error: error instanceof Error ? error.message : String(error),
        });
    }
};

export const editFeesById = async (req: Request, res: Response) => {
    try {
        if (!req.user || req.user.role !== "Admin") {
            return res.status(403).json({ message: "Access denied. Admin privileges required." });
        }

        const feesId = req.params.feesId;
        const body: EditFeesBody = req.body;

        const updatedFees = await feesService.updateFeesById(feesId, {
            mainClassId: body.mainClassId ?? body.mainClass?.toString(),
            studentId: body.studentId ?? body.student?.toString(),
            month: body.month,
            baseAmount: body.baseamount,
            totalAmount: body.totalAmount,
            paidAt: body.PaidAt,
        });

        return res.status(200).json({
            message: "Fees record updated successfully",
            fees: updatedFees,
        });
    } catch (error) {
        const status = (error as any)?.status || 500;
        return res.status(status).json({
            message:
                status === 404
                    ? (error as Error).message
                    : status === 400
                        ? (error as Error).message
                        : "Error updating fees record",
            error: error instanceof Error ? error.message : String(error),
        });
    }
};

export const triggerFeesReminder = async (req: Request, res: Response) => {
    try {
        // Only allow Admin to trigger manual fee reminders
        if (!req.user || req.user.role !== "Admin") {
            return res.status(403).json({ message: "Access denied. Admin privileges required." });
        }

        const result = await triggerFeesReminderManually();

        if (result.success) {
            return res.status(200).json({
                message: "Fee reminders triggered successfully",
                result,
            });
        } else {
            return res.status(500).json({
                message: "Error triggering fee reminders",
                result,
            });
        }
    } catch (error) {
        const status = (error as any)?.status || 500;
        return res.status(status).json({
            message: "Error triggering fee reminders",
            error: error instanceof Error ? error.message : String(error),
        });
    }
};
