import Attendence from "../models/Attendence";
import { IAttendence } from "../models/Attendence";
import Batch from "../models/Batch";
import Class, { Iclass } from "../models/class";
import MainClass from "../models/MainClass";
import Student_Batch from "../models/Student_Batch";
import User from "../models/User";
import mongoose from "mongoose";
import { sendAttendanceCompleteEmail } from "./email_service";
import { config } from "../config/db";

const formatDateLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};


export const updateClassAttendanceRecord = async (
    classId: string,
    mainClassId: string,
    date: Date,
    studentEmail: string,
    status: 'present' | 'absent',
): Promise<Iclass> => {
    
    if (!mongoose.Types.ObjectId.isValid(classId)) {
        const err = new Error("Invalid class ID format");
        (err as any).status = 400;
        throw err;
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    if (!mongoose.Types.ObjectId.isValid(mainClassId)) {
        const err = new Error("Invalid main class ID format");
        (err as any).status = 400;
        throw err;
    }

    
    const classDocument = await Class.findOne({
        batch: new mongoose.Types.ObjectId(classId),
        mainClass: new mongoose.Types.ObjectId(mainClassId),
        date: { $gte: startOfDay, $lt: endOfDay }
    });

    if (!classDocument) {
        const err = new Error("No class record found for this date");
        (err as any).status = 404;
        throw err;
    }

    const student = await User.findOne({ email: studentEmail.toLowerCase() }).select("_id role");
    if (!student) {
        const err = new Error("Student not found with this email");
        (err as any).status = 404;
        throw err;
    }

    const studentObjectId = new mongoose.Types.ObjectId(student._id);
    const batchObjectId = new mongoose.Types.ObjectId(classId);

    const isAlreadyPresent = classDocument.Present_students.some((id) => id.equals(studentObjectId));
    const isAlreadyAbsent = classDocument.Absent_students.some((id) => id.equals(studentObjectId));

    if (status === 'present') {
        if (!isAlreadyPresent) {
            classDocument.Present_students.push(studentObjectId as any);
        }
        classDocument.Absent_students = classDocument.Absent_students.filter((id) => !id.equals(studentObjectId));
    } else {
        if (!isAlreadyAbsent) {
            classDocument.Absent_students.push(studentObjectId as any);
        }
        classDocument.Present_students = classDocument.Present_students.filter((id) => !id.equals(studentObjectId));
    }

    let attendenceRecord = await Attendence.findOne({
        student: studentObjectId,
        batch: batchObjectId,
        mainClass: new mongoose.Types.ObjectId(mainClassId),
        date: { $gte: startOfDay, $lt: endOfDay },
    });

    if (attendenceRecord) {
        attendenceRecord.status = status;
        await attendenceRecord.save();
    } else {
        attendenceRecord = new Attendence({
            batch: batchObjectId,
            mainClass: new mongoose.Types.ObjectId(mainClassId),
            student: studentObjectId,
            date: new Date(date),
            status,
        });
        await attendenceRecord.save();
    }

    await classDocument.save();
    return classDocument;
}


export const markAttendenceForClass = async (classId: string, presentStudentIds: string[], date: Date = new Date()): Promise<{ presentRecords: IAttendence[]; absentRecords: IAttendence[]; classDocument: any; completionReport: any }> => {
    
    if (!mongoose.Types.ObjectId.isValid(classId)) {
        const err = new Error("Invalid class ID format");
        (err as any).status = 400;
        throw err;
    }

    const classData = await Batch.findById(classId).select("mainClassStudentPairs");
    if (!classData) {
        const err = new Error("Class not found");
        (err as any).status = 404;
        throw err;
    }

    const allPairedStudentIds = [...new Set(
        classData.mainClassStudentPairs.map((pair) => pair.student.toString()),
    )];

    if (allPairedStudentIds.length === 0) {
        const err = new Error("No student-mainClass pairs found for this batch");
        (err as any).status = 400;
        throw err;
    }

    const invalidIds = presentStudentIds.filter((id) => !allPairedStudentIds.includes(id));
    if (invalidIds.length > 0) {
        const err = new Error(`Invalid student IDs for this batch mapping: ${invalidIds.join(", ")}`);
        (err as any).status = 400;
        throw err;
    }

    const mainClassIds = [...new Set(
        classData.mainClassStudentPairs.map((pair) => pair.mainClass.toString()),
    )];

    const presentRecords: IAttendence[] = [];
    const absentRecords: IAttendence[] = [];
    const classDocuments: any[] = [];

    for (const mainClassId of mainClassIds) {
        const mainClassStudentIds = classData.mainClassStudentPairs
            .filter((pair) => pair.mainClass.toString() === mainClassId)
            .map((pair) => pair.student.toString());

        const presentForMainClass = presentStudentIds.filter((studentId) =>
            mainClassStudentIds.includes(studentId),
        );

        const result = await markAttendenceForMainClassInBatch(
            classId,
            mainClassId,
            presentForMainClass,
            date,
        );

        presentRecords.push(...result.presentRecords);
        absentRecords.push(...result.absentRecords);
        classDocuments.push(result.classDocument);
    }

    const completionReport = await completeAttendanceAndNotifyAdmin(classId, date);

    return {
        presentRecords,
        absentRecords,
        classDocument: classDocuments,
        completionReport,
    };
};

export const markAttendenceForMainClassInBatch = async (
    classId: string,
    mainClassId: string,
    presentStudentIds: string[],
    date: Date = new Date(),
): Promise<{ presentRecords: IAttendence[]; absentRecords: IAttendence[]; classDocument: any }> => {
    if (!mongoose.Types.ObjectId.isValid(classId) || !mongoose.Types.ObjectId.isValid(mainClassId)) {
        const err = new Error("Invalid class ID or main class ID format");
        (err as any).status = 400;
        throw err;
    }
    const classData = await Batch.findById(classId).select("mainClasses mainClassStudentPairs");
    if (!classData) {
        const err = new Error("Class not found");
        (err as any).status = 404;
        throw err;
    }

    const isMainClassInBatch = classData.mainClasses.some((id) => id.toString() === mainClassId);
    if (!isMainClassInBatch) {
        const err = new Error("mainClassId is not part of this batch");
        (err as any).status = 400;
        throw err;
    }
    const classStudentIds = classData.mainClassStudentPairs
        .filter((pair) => pair.mainClass.toString() === mainClassId)
        .map((pair) => pair.student.toString());

    if (classStudentIds.length === 0) {
        const err = new Error("No students are assigned to this main class in this batch");
        (err as any).status = 400;
        throw err;
    }

    const invalidIds = presentStudentIds.filter(id => !classStudentIds.includes(id));
    if (invalidIds.length > 0) {
        const err = new Error(`Invalid student IDs for this main class: ${invalidIds.join(', ')}`);
        (err as any).status = 400;
        throw err;
    }
    const absentStudentIds = classStudentIds.filter(id => !presentStudentIds.includes(id));
    const attendenceRecords: IAttendence[] = [];
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    for (const studentId of presentStudentIds) {
        let attendenceRecord = await Attendence.findOne({
            student: new mongoose.Types.ObjectId(studentId),
            batch: new mongoose.Types.ObjectId(classId),
            mainClass: new mongoose.Types.ObjectId(mainClassId),
            date: { $gte: startOfDay, $lt: endOfDay }
        });

        if (attendenceRecord) {
            attendenceRecord.status = 'present';
            await attendenceRecord.save();
        } else {
            attendenceRecord = new Attendence({
                batch: new mongoose.Types.ObjectId(classId),
                mainClass: new mongoose.Types.ObjectId(mainClassId),
                student: new mongoose.Types.ObjectId(studentId),
                date: new Date(date),
                status: 'present'
            });
            await attendenceRecord.save();
        }

        attendenceRecords.push(attendenceRecord);
    }
    const absentRecords: IAttendence[] = [];
    for (const studentId of absentStudentIds) {
        let attendenceRecord = await Attendence.findOne({
            student: new mongoose.Types.ObjectId(studentId),
            batch: new mongoose.Types.ObjectId(classId),
            mainClass: new mongoose.Types.ObjectId(mainClassId),
            date: { $gte: startOfDay, $lt: endOfDay }
        });

        if (attendenceRecord) {
            attendenceRecord.status = 'absent';
            await attendenceRecord.save();
        } else {
            attendenceRecord = new Attendence({
                batch: new mongoose.Types.ObjectId(classId),
                mainClass: new mongoose.Types.ObjectId(mainClassId),
                student: new mongoose.Types.ObjectId(studentId),
                date: new Date(date),
                status: 'absent'
            });
            await attendenceRecord.save();
        }

        absentRecords.push(attendenceRecord);
    }
    const presentStudentObjectIds = presentStudentIds.map(id => new mongoose.Types.ObjectId(id));
    const absentStudentObjectIds = absentStudentIds.map(id => new mongoose.Types.ObjectId(id));

    const classDocument = await Class.findOneAndUpdate(
        {
            batch: new mongoose.Types.ObjectId(classId),
            mainClass: new mongoose.Types.ObjectId(mainClassId),
            date: { $gte: startOfDay, $lt: endOfDay },
        },
        {
            $set: {
                batch: new mongoose.Types.ObjectId(classId),
                mainClass: new mongoose.Types.ObjectId(mainClassId),
                Present_students: presentStudentObjectIds,
                Absent_students: absentStudentObjectIds,
                date: new Date(date),
            },
        },
        { new: true, upsert: true },
    );

    return { presentRecords: attendenceRecords, absentRecords, classDocument };

};

export const getClassAttendanceByDate = async (date: Date, batchId?: string, mainClassId?: string) => {
    if (!batchId && !mainClassId) {
        const err = new Error("Either batchId or mainClassId is required");
        (err as any).status = 400;
        throw err;
    }

    if (batchId && !mongoose.Types.ObjectId.isValid(batchId)) {
        const err = new Error("Invalid batch ID format");
        (err as any).status = 400;
        throw err;
    }

    if (batchId) {
        const classData = await Batch.findById(batchId);
        if (!classData) {
            const err = new Error("Class not found");
            (err as any).status = 404;
            throw err;
        }
    }
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    if (mainClassId && !mongoose.Types.ObjectId.isValid(mainClassId)) {
        const err = new Error("Invalid main class ID format");
        (err as any).status = 400;
        throw err;
    }

    const filter: any = { date: { $gte: startOfDay, $lt: endOfDay } };

    if (batchId) {
        filter.batch = new mongoose.Types.ObjectId(batchId);
    }

    if (mainClassId) {
        filter.mainClass = new mongoose.Types.ObjectId(mainClassId);
    }

    const classDocuments = await Class.find(filter)
        .populate('mainClass', 'name fees')
        .populate('Present_students', 'name _id')
        .populate('Absent_students', 'name _id');

    if (classDocuments.length === 0) {
        const err = new Error("No class record found for this date");
        (err as any).status = 404;
        throw err;
    }

    return classDocuments;
};

export const getClassAttendanceByDateRange = async (classId: string, startDate: Date, endDate: Date, mainClassId?: string) => {
    if (!mongoose.Types.ObjectId.isValid(classId)) {
        const err = new Error("Invalid class ID format");
        (err as any).status = 400;
        throw err;
    }
    const classData = await Batch.findById(classId);
    if (!classData) {
        const err = new Error("Class not found");
        (err as any).status = 404;
        throw err;
    }
    const dayStart = new Date(startDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(endDate);
    dayEnd.setHours(23, 59, 59, 999);

    if (mainClassId && !mongoose.Types.ObjectId.isValid(mainClassId)) {
        const err = new Error("Invalid main class ID format");
        (err as any).status = 400;
        throw err;
    }

    const filter: any = {
        batch: new mongoose.Types.ObjectId(classId),
        date: { $gte: dayStart, $lte: dayEnd }
    };

    if (mainClassId) {
        filter.mainClass = new mongoose.Types.ObjectId(mainClassId);
    }
    const classDocuments = await Class.find(filter)
        .populate('mainClass', 'name fees')
        .populate('Present_students', 'name _id')
        .populate('Absent_students', 'name _id')
        .sort({ date: -1 });

    if (classDocuments.length === 0) {
        const err = new Error("No class records found for this date range");
        (err as any).status = 404;
        throw err;
    }

    return classDocuments;
};

export const completeAttendanceAndNotifyAdmin = async (classId: string, date: Date = new Date(), mainClassId?: string) => {
    if (!mongoose.Types.ObjectId.isValid(classId)) {
        const err = new Error("Invalid class ID format");
        (err as any).status = 400;
        throw err;
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    if (mainClassId && !mongoose.Types.ObjectId.isValid(mainClassId)) {
        const err = new Error("Invalid main class ID format");
        (err as any).status = 400;
        throw err;
    }

    const filter: any = {
        batch: new mongoose.Types.ObjectId(classId),
        date: { $gte: startOfDay, $lt: endOfDay },
    };

    if (mainClassId) {
        filter.mainClass = new mongoose.Types.ObjectId(mainClassId);
    }

    const classDocuments = await Class.find(filter)
        .populate("Present_students", "name email phone")
        .populate("Absent_students", "name email phone")
        .populate("mainClass", "name")
        .populate("batch", "name");

    if (classDocuments.length === 0) {
        const err = new Error("No class attendance record found for this date");
        (err as any).status = 404;
        throw err;
    }

    const batchData = await Batch.findById(classId).select("name");
    if (!batchData) {
        const err = new Error("Class not found");
        (err as any).status = 404;
        throw err;
    }

    const adminEmails = config.attendanceAdminEmails;
    if (adminEmails.length === 0) {
        const err = new Error("ATTENDANCE_ADMIN_EMAILS is not configured in environment");
        (err as any).status = 500;
        throw err;
    }

    const presentStudents = classDocuments.flatMap((doc: any) =>
        (doc.Present_students as any[]).map((student: any) => ({
            name: student.name,
            email: student.email,
            phone: student.phone,
            mainClass: doc.mainClass?.name,
        })),
    );

    const absentStudents = classDocuments.flatMap((doc: any) =>
        (doc.Absent_students as any[]).map((student: any) => ({
            name: student.name,
            email: student.email,
            phone: student.phone,
            mainClass: doc.mainClass?.name,
        })),
    );

    const presentCount = classDocuments.reduce((sum, doc: any) => sum + doc.Present_students.length, 0);
    const absentCount = classDocuments.reduce((sum, doc: any) => sum + doc.Absent_students.length, 0);

    await sendAttendanceCompleteEmail({
        adminEmails,
        batchName: batchData.name,
        classDate: startOfDay,
        presentStudents,
        absentStudents,
        presentCount,
        absentCount,
    });

    return {
        batchId: classId,
        batchName: batchData.name,
        mainClassId: mainClassId ?? null,
        date: formatDateLocal(startOfDay),
        presentCount,
        absentCount,
        presentStudents,
        absentStudents,
        emailedTo: adminEmails,
    };
};

export const getMainClassAttendanceSummary = async (mainClassId: string) => {
    if (!mongoose.Types.ObjectId.isValid(mainClassId)) {
        const err = new Error("Invalid main class ID format");
        (err as any).status = 400;
        throw err;
    }

    const mainClass = await MainClass.findById(mainClassId).select("name");
    if (!mainClass) {
        const err = new Error("Main class not found");
        (err as any).status = 404;
        throw err;
    }

    const studentBatches = await Student_Batch.find({ mainClass: mainClassId })
        .populate("student", "name email phone")
        .sort({ joinDate: 1 });

    const summary = await Promise.all(
        studentBatches.map(async (studentBatch) => {
            const student = studentBatch.student as any;
            const admissionDate = new Date(studentBatch.joinDate);
            admissionDate.setHours(0, 0, 0, 0);

            const records = await Attendence.find({
                mainClass: new mongoose.Types.ObjectId(mainClassId),
                student: student._id,
                date: { $gte: admissionDate },
            }).select("status date batch");

            const presentDays = records.filter((record) => record.status === "present").length;
            const absentDays = records.filter((record) => record.status === "absent").length;
            const totalClasses = presentDays + absentDays;
            const attendancePercentage = totalClasses === 0
                ? 0
                : Number(((presentDays / totalClasses) * 100).toFixed(2));

            return {
                studentId: student._id,
                studentName: student.name,
                studentEmail: student.email,
                studentPhone: student.phone,
                admissionDate: studentBatch.joinDate,
                totalClasses,
                presentDays,
                absentDays,
                attendancePercentage,
            };
        }),
    );

    return {
        mainClassId,
        mainClassName: mainClass.name,
        studentsCount: summary.length,
        students: summary,
    };
};

export const getStudentMainClassAttendanceDetails = async (mainClassId: string, studentId: string) => {
    if (!mongoose.Types.ObjectId.isValid(mainClassId) || !mongoose.Types.ObjectId.isValid(studentId)) {
        const err = new Error("Invalid main class ID or student ID format");
        (err as any).status = 400;
        throw err;
    }

    const [mainClass, student, studentBatch] = await Promise.all([
        MainClass.findById(mainClassId).select("name"),
        User.findById(studentId).select("name email phone"),
        Student_Batch.findOne({ mainClass: mainClassId, student: studentId }).select("joinDate"),
    ]);

    if (!mainClass) {
        const err = new Error("Main class not found");
        (err as any).status = 404;
        throw err;
    }

    if (!student) {
        const err = new Error("Student not found");
        (err as any).status = 404;
        throw err;
    }

    if (!studentBatch) {
        const err = new Error("Student is not enrolled in this main class");
        (err as any).status = 404;
        throw err;
    }

    const admissionDate = new Date(studentBatch.joinDate);
    admissionDate.setHours(0, 0, 0, 0);

    const attendanceRecords = await Attendence.find({
        mainClass: new mongoose.Types.ObjectId(mainClassId),
        student: new mongoose.Types.ObjectId(studentId),
        date: { $gte: admissionDate },
    })
        .sort({ date: 1 })
        .select("date status batch");

    const presentDates = attendanceRecords
        .filter((record) => record.status === "present")
        .map((record) => record.date);

    const absentDates = attendanceRecords
        .filter((record) => record.status === "absent")
        .map((record) => record.date);

    const presentDays = presentDates.length;
    const absentDays = absentDates.length;
    const totalClasses = presentDays + absentDays;
    const attendancePercentage = totalClasses === 0
        ? 0
        : Number(((presentDays / totalClasses) * 100).toFixed(2));

    return {
        mainClassId,
        mainClassName: mainClass.name,
        studentId,
        studentName: student.name,
        studentEmail: student.email,
        studentPhone: student.phone,
        admissionDate: studentBatch.joinDate,
        totalClasses,
        presentDays,
        absentDays,
        attendancePercentage,
        presentDates,
        absentDates,
    };
};
