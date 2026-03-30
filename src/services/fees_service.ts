import mongoose from "mongoose";
import Fees, { IFees } from "../models/Fees";
import MainClass from "../models/MainClass";
import User from "../models/User";
import Student_Batch from "../models/Student_Batch";

interface RecordFeesInput {
    mainClassId: string;
    studentId: string;
    month?: string;
    amountPaid?: number;
    paidAt?: Date;
}

interface UpdateFeesInput {
    mainClassId?: string;
    studentId?: string;
    month?: string;
    baseAmount?: number;
    totalAmount?: number;
    paidAt?: Date;
}

const getMonthString = (date: Date): string => {
    const months = ["January", "February", "March", "April", "May", "June",
                    "July", "August", "September", "October", "November", "December"];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
};

const calculateDueMonths = (joinDate: Date, courseStartDate: Date, durationInMonths: number): string[] => {
    const dueMonths: string[] = [];
    const startMonth = new Date(Math.max(joinDate.getTime(), courseStartDate.getTime()));
    let currentMonth = new Date(startMonth);
    currentMonth.setDate(1);

    for (let i = 0; i < durationInMonths; i += 1) {
        dueMonths.push(getMonthString(currentMonth));
        currentMonth.setMonth(currentMonth.getMonth() + 1);
    }

    return dueMonths;
};

const reconcilePaidMonthsWithDueMonths = (
    dueMonths: string[],
    paidMonthLabels: string[],
): { paidMonths: string[]; pendingMonths: string[] } => {
    const remainingDueMonths = [...dueMonths];
    const normalizedPaidMonths: string[] = [];

    for (const rawLabel of paidMonthLabels) {
        const label = (rawLabel ?? "").trim().toLowerCase();
        if (!label) continue;
        let matchedIndex = remainingDueMonths.findIndex(
            (due) => due.toLowerCase() === label,
        );
        if (matchedIndex === -1) {
            const monthName = label.split(/\s+/)[0];
            matchedIndex = remainingDueMonths.findIndex((due) =>
                due.toLowerCase().startsWith(`${monthName} `),
            );
        }

        if (matchedIndex !== -1) {
            normalizedPaidMonths.push(remainingDueMonths[matchedIndex]);
            remainingDueMonths.splice(matchedIndex, 1);
        }
    }

    return {
        paidMonths: normalizedPaidMonths,
        pendingMonths: remainingDueMonths,
    };
};

type ResolvedStudentContext = {
    student: {
        _id: mongoose.Types.ObjectId;
        name?: string;
        email?: string;
        phone?: string;
    };
    studentBatch: {
        rollno?: number;
        joinDate: Date;
        student: mongoose.Types.ObjectId;
    };
};

const resolveStudentContext = async (
    mainClassId: string,
    studentIdInput: string,
): Promise<ResolvedStudentContext> => {
    const directStudent = await User.findById(studentIdInput).select("name email phone");

    if (directStudent) {
        const studentBatch = await Student_Batch.findOne({
            mainClass: mainClassId,
            student: directStudent._id,
        }).select("rollno joinDate student");

        if (!studentBatch) {
            const err = new Error("Student is not enrolled in this main class");
            (err as any).status = 404;
            throw err;
        }

        return {
            student: directStudent,
            studentBatch,
        };
    }

    const studentBatchById = await Student_Batch.findOne({
        _id: studentIdInput,
        mainClass: mainClassId,
    }).select("rollno joinDate student");

    if (!studentBatchById) {
        const err = new Error("Student not found for this main class");
        (err as any).status = 404;
        throw err;
    }

    const mappedStudent = await User.findById(studentBatchById.student).select("name email phone");

    if (!mappedStudent) {
        const err = new Error("Student user not found for this enrollment");
        (err as any).status = 404;
        throw err;
    }

    return {
        student: mappedStudent,
        studentBatch: studentBatchById,
    };
};

export const getFeesByMainClassStudent = async (mainClassId: string, studentId: string) => {
    if (!mongoose.Types.ObjectId.isValid(mainClassId) || !mongoose.Types.ObjectId.isValid(studentId)) {
        const err = new Error("Invalid mainClass id or student id");
        (err as any).status = 400;
        throw err;
    }

    const [mainClass, resolvedStudent] = await Promise.all([
        MainClass.findById(mainClassId).select("name fees startDate endDate duration"),
        resolveStudentContext(mainClassId, studentId),
    ]);

    if (!mainClass) {
        const err = new Error("Main class not found");
        (err as any).status = 404;
        throw err;
    }

    const studentObjectId = resolvedStudent.student._id;
    const feeHistory = await Fees.find({ mainClass: mainClassId, student: studentObjectId })
        .select("month totalAmount PaidAt")
        .sort({ PaidAt: -1 });

    const durationInMonths = Number(mainClass.duration) || 0;
    if (durationInMonths <= 0) {
        const err = new Error("Main class duration must be greater than 0");
        (err as any).status = 400;
        throw err;
    }

    const admissionMonth = getMonthString(resolvedStudent.studentBatch.joinDate);
    const dueMonths = calculateDueMonths(
        resolvedStudent.studentBatch.joinDate,
        mainClass.startDate,
        durationInMonths,
    );
    const calculatedCourseEndDate = new Date(mainClass.startDate);
    calculatedCourseEndDate.setMonth(calculatedCourseEndDate.getMonth() + durationInMonths);
    const paidFeesHistory = feeHistory.filter((record) => Boolean(record.PaidAt));
    const paidMonthLabels = [...paidFeesHistory]
        .sort((a, b) => new Date(a.PaidAt as Date).getTime() - new Date(b.PaidAt as Date).getTime())
        .map((record) => record.month);
    const { paidMonths, pendingMonths } = reconcilePaidMonthsWithDueMonths(dueMonths, paidMonthLabels);
    const nextDueMonth = pendingMonths.length > 0 ? pendingMonths[0] : null;
    const totalPaidAmount = paidFeesHistory.reduce((sum, record) => sum + (record.totalAmount || 0), 0);
    const totalDueAmount = mainClass.fees * dueMonths.length;
    const pendingAmount = Math.max(totalDueAmount - totalPaidAmount, 0);
    const overpaidAmount = Math.max(totalPaidAmount - totalDueAmount, 0);

    return {
        mainClassId: mainClass._id,
        studentId: studentObjectId,
        studentName: resolvedStudent.student.name,
        studentEmail: resolvedStudent.student.email,
        studentPhone: resolvedStudent.student.phone,
        rollNo: resolvedStudent.studentBatch.rollno,
        mainClassName: mainClass.name,
        durationInMonths,
        monthlyFees: mainClass.fees,
        admissionDate: resolvedStudent.studentBatch.joinDate,
        admissionMonth,
        courseStartDate: mainClass.startDate,
        courseEndDate: calculatedCourseEndDate,
        dueMonths,
        paidMonths,
        pendingMonths,
        nextDueMonth,
        feeHistory: feeHistory.map((record) => ({
            month: record.month,
            amount: record.totalAmount,
            paidAt: record.PaidAt,
        })),
        totalDueAmount,
        totalPaidAmount,
        pendingAmount,
        overpaidAmount,
        paymentStatus: pendingAmount > 0 ? "Pending" : "Fully Paid",
    };
};

export const recordStudentFeesPaid = async (input: RecordFeesInput): Promise<IFees> => {
    const { mainClassId, studentId, month, amountPaid, paidAt } = input;

    if (!mongoose.Types.ObjectId.isValid(mainClassId) || !mongoose.Types.ObjectId.isValid(studentId)) {
        const err = new Error("Invalid mainClass id or student id");
        (err as any).status = 400;
        throw err;
    }

    const [mainClass, resolvedStudent] = await Promise.all([
        MainClass.findById(mainClassId).select("fees"),
        resolveStudentContext(mainClassId, studentId),
    ]);

    if (!mainClass) {
        const err = new Error("Main class not found");
        (err as any).status = 404;
        throw err;
    }

    const safeAmount = amountPaid ?? mainClass.fees;
    const monthString = month ?? getMonthString(new Date());
    
    const feesRecord = await Fees.findOneAndUpdate(
        {
            mainClass: mainClass._id,
            student: resolvedStudent.student._id,
            month: monthString,
        },
        {
            $set: {
                baseamount: mainClass.fees,
                totalAmount: safeAmount,
                PaidAt: paidAt ?? new Date(),
            },
        },
        {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true,
        },
    );

    return feesRecord as IFees;
};

export const getStudentFeesHistory = async (mainClassId: string, studentId: string): Promise<IFees[]> => {
    if (!mongoose.Types.ObjectId.isValid(mainClassId) || !mongoose.Types.ObjectId.isValid(studentId)) {
        const err = new Error("Invalid mainClass id or student id");
        (err as any).status = 400;
        throw err;
    }

    const [mainClass, resolvedStudent] = await Promise.all([
        MainClass.findById(mainClassId).select("name"),
        resolveStudentContext(mainClassId, studentId),
    ]);

    if (!mainClass) {
        const err = new Error("Main class not found");
        (err as any).status = 404;
        throw err;
    }

    const feesHistory = await Fees.find({ mainClass: mainClassId, student: resolvedStudent.student._id })
        .sort({ PaidAt: -1 })
        .populate("mainClass", "name")
        .populate("student", "name phone adhar");

    return feesHistory;
};

export const updateFeesById = async (feesId: string, input: UpdateFeesInput): Promise<IFees> => {
    if (!mongoose.Types.ObjectId.isValid(feesId)) {
        const err = new Error("Invalid fees id");
        (err as any).status = 400;
        throw err;
    }

    const fees = await Fees.findById(feesId);
    if (!fees) {
        const err = new Error("Fees record not found");
        (err as any).status = 404;
        throw err;
    }

    const nextMainClassId = input.mainClassId ?? fees.mainClass.toString();

    if (!mongoose.Types.ObjectId.isValid(nextMainClassId)) {
        const err = new Error("Invalid mainClass id");
        (err as any).status = 400;
        throw err;
    }

    const mainClass = await MainClass.findById(nextMainClassId).select("_id");
    if (!mainClass) {
        const err = new Error("Main class not found");
        (err as any).status = 404;
        throw err;
    }

    if (input.studentId) {
        if (!mongoose.Types.ObjectId.isValid(input.studentId)) {
            const err = new Error("Invalid student id");
            (err as any).status = 400;
            throw err;
        }

        const resolvedStudent = await resolveStudentContext(nextMainClassId, input.studentId);
        fees.student = resolvedStudent.student._id;
    }

    if (input.mainClassId) {
        fees.mainClass = mainClass._id;
        const currentStudentId = (input.studentId ?? fees.student.toString());
        const resolvedStudent = await resolveStudentContext(nextMainClassId, currentStudentId);
        fees.student = resolvedStudent.student._id;
    }

    if (input.month !== undefined) {
        const normalizedMonth = input.month.trim();
        if (!normalizedMonth) {
            const err = new Error("month cannot be empty");
            (err as any).status = 400;
            throw err;
        }
        fees.month = normalizedMonth;
    }

    if (input.baseAmount !== undefined) {
        if (Number.isNaN(input.baseAmount) || input.baseAmount < 0) {
            const err = new Error("baseAmount must be a non-negative number");
            (err as any).status = 400;
            throw err;
        }
        fees.baseamount = input.baseAmount;
    }

    if (input.totalAmount !== undefined) {
        if (Number.isNaN(input.totalAmount) || input.totalAmount < 0) {
            const err = new Error("totalAmount must be a non-negative number");
            (err as any).status = 400;
            throw err;
        }
        fees.totalAmount = input.totalAmount;
    }

    if (input.paidAt !== undefined) {
        const parsedPaidAt = new Date(input.paidAt);
        if (Number.isNaN(parsedPaidAt.getTime())) {
            const err = new Error("Invalid PaidAt date");
            (err as any).status = 400;
            throw err;
        }
        fees.PaidAt = parsedPaidAt;
    }

    await fees.save();
    return fees;
};
