import Batch,{ IBatch, ICreateBatchInput, IMainClassStudentPair } from "../models/Batch";
import MainClass from "../models/MainClass";
import User from "../models/User";
import { Types } from "mongoose";

const formatStudentLabel = (student: { name?: string; email?: string } | null | undefined): string => {
    if (!student) {
        return "Unknown student";
    }

    const name = student.name?.trim();
    const email = student.email?.trim();

    if (name && email) {
        return `${name} (${email})`;
    }

    return name || email || "Unknown student";
};

const formatMainClassLabel = (mainClass: { name?: string } | null | undefined): string => {
    return mainClass?.name?.trim() ? `main class ${mainClass.name.trim()}` : "unknown main class";
};

const parseTimeToMinutes = (value: string): number => {
    const [hours, minutes] = value.split(":").map(Number);
    return (hours * 60) + minutes;
};

const validateBatchCoreData = async (batchData: {
    startTime: string;
    endTime: string;
    teacherEmail: string;
    mainClasses: Types.ObjectId[];
}): Promise<void> => {
    if (parseTimeToMinutes(batchData.startTime) >= parseTimeToMinutes(batchData.endTime)) {
        const err = new Error("startTime must be before endTime");
        (err as any).status = 400;
        throw err;
    }

    const teacher = await User.findOne({
        email: batchData.teacherEmail,
        role: { $in: ["Teacher", "Admin"] },
    }).select("_id");
    if (!teacher) {
        const err = new Error("Teacher/Admin not found for teacherEmail");
        (err as any).status = 400;
        throw err;
    }

    const mainClassIds = [...new Set(batchData.mainClasses.map((id) => id.toString()))];
    if (mainClassIds.length === 0) {
        const err = new Error("At least one mainClass is required");
        (err as any).status = 400;
        throw err;
    }

};

const validatePairAssignments = async (
    mainClasses: Types.ObjectId[],
    students: Types.ObjectId[],
    pairs: IMainClassStudentPair[],
): Promise<void> => {
    const mainClassIds = [...new Set(mainClasses.map((id) => id.toString()))];
    const studentIds = [...new Set(students.map((id) => id.toString()))];

    if (studentIds.length === 0 && pairs.length > 0) {
        const err = new Error("Pairs cannot be added without students");
        (err as any).status = 400;
        throw err;
    }

    const validStudents = await User.find({ _id: { $in: studentIds }, role: "Student" }).select("_id name email");
    if (validStudents.length !== studentIds.length) {
        const err = new Error("One or more students are invalid or not registered as Student");
        (err as any).status = 400;
        throw err;
    }

    const mainClassDocs = await MainClass.find({ _id: { $in: mainClassIds } }).select("_id name students");
    if (mainClassDocs.length !== mainClassIds.length) {
        const err = new Error("One or more mainClasses are invalid");
        (err as any).status = 400;
        throw err;
    }

    const mainClassMap = new Map(mainClassDocs.map((doc) => [doc._id.toString(), doc]));

    for (const pair of pairs) {
        const mainClassId = pair.mainClass.toString();
        const studentId = pair.student.toString();

        if (!mainClassIds.includes(mainClassId)) {
            const err = new Error(`mainClass ${mainClassId} from pair is not part of batch mainClasses`);
            (err as any).status = 400;
            throw err;
        }

        if (!studentIds.includes(studentId)) {
            const err = new Error(`student ${studentId} from pair is not part of batch students`);
            (err as any).status = 400;
            throw err;
        }

        const mainClass = mainClassMap.get(mainClassId);
        const isStudentInMainClass = mainClass?.students.some(
            (mainClassStudent) => mainClassStudent.toString() === studentId,
        );

        if (!isStudentInMainClass) {
            const studentDoc = validStudents.find((doc) => doc._id.toString() === studentId);
            const mainClassDoc = mainClassDocs.find((doc) => doc._id.toString() === mainClassId);
            const err = new Error(
                `${formatStudentLabel(studentDoc)} is not enrolled in ${formatMainClassLabel(mainClassDoc)}; add the student to that main class first`,
            );
            (err as any).status = 400;
            throw err;
        }
    }
};

export const createClass = async (classData: ICreateBatchInput): Promise<IBatch> => {
    await validateBatchCoreData(classData);

    const normalizedClassData: IBatch = {
        ...classData,
        students: classData.students ?? [],
        mainClassStudentPairs: classData.mainClassStudentPairs ?? [],
    };

    await validatePairAssignments(
        normalizedClassData.mainClasses,
        normalizedClassData.students,
        normalizedClassData.mainClassStudentPairs,
    );

    const newClass = new Batch(normalizedClassData);
    const savedClass = await newClass.save();

    await MainClass.updateMany(
        { _id: { $in: savedClass.mainClasses } },
        { $addToSet: { batches: savedClass._id } },
    );

    return savedClass;
};

export const deleteClass = async (classId: string): Promise<void> => {
    const deletedClass = await Batch.findByIdAndDelete(classId);
    if (!deletedClass) {
        const err = new Error("Class not found");
        (err as any).status = 404;
        throw err;
    }
};

export const editClass = async (classId: string, updateData: Partial<IBatch>): Promise<IBatch> => {
    const existingClass = await Batch.findById(classId);
    if (!existingClass) {
        const err = new Error("Class not found");
        (err as any).status = 404;
        throw err;
    }

    const mergedClassData: IBatch = {
        name: updateData.name ?? existingClass.name,
        weekday: updateData.weekday ?? existingClass.weekday,
        startTime: updateData.startTime ?? existingClass.startTime,
        endTime: updateData.endTime ?? existingClass.endTime,
        teacherEmail: updateData.teacherEmail ?? existingClass.teacherEmail,
        mainClasses: updateData.mainClasses ?? existingClass.mainClasses,
        students: updateData.students ?? existingClass.students,
        mainClassStudentPairs: updateData.mainClassStudentPairs ?? existingClass.mainClassStudentPairs,
    };

    await validateBatchCoreData(mergedClassData);
    await validatePairAssignments(
        mergedClassData.mainClasses,
        mergedClassData.students,
        mergedClassData.mainClassStudentPairs,
    );
    Object.assign(existingClass, updateData);
    return await existingClass.save();
};

export const addStudentToClass = async (
    classId: string,
    mainClassId: string,
    studentEmail: string,
    requesterUserId: string,
    requesterRole?: string,
): Promise<IBatch> => {
    const batch = await Batch.findById(classId);
    if (!batch) {
        const err = new Error("Class not found");
        (err as any).status = 404;
        throw err;
    }

    if (requesterRole === "Teacher") {
        const requester = await User.findById(requesterUserId).select("role");
        if (requester?.role !== "Teacher") {
            const err = new Error("Access denied");
            (err as any).status = 403;
            throw err;
        }
    }

    const isMainClassInBatch = batch.mainClasses.some((id) => id.toString() === mainClassId);
    if (!isMainClassInBatch) {
        const err = new Error("Provided mainClassId is not part of this batch");
        (err as any).status = 400;
        throw err;
    }

    const student = await User.findOne({ email: studentEmail.toLowerCase(), role: "Student" }).select("_id");
    if (!student) {
        const err = new Error("Student not found with this email");
        (err as any).status = 404;
        throw err;
    }

    const mainClass = await MainClass.findById(mainClassId).select("students");
    if (!mainClass) {
        const err = new Error("Main class not found");
        (err as any).status = 404;
        throw err;
    }

    const isStudentEnrolledInMainClass = mainClass.students.some(
        (studentId) => studentId.toString() === student._id.toString(),
    );
    if (!isStudentEnrolledInMainClass) {
        const err = new Error("Student is not enrolled in this main class");
        (err as any).status = 400;
        throw err;
    }

    const alreadyPaired = batch.mainClassStudentPairs.some(
        (pair) => pair.mainClass.toString() === mainClassId && pair.student.toString() === student._id.toString(),
    );
    if (alreadyPaired) {
        const err = new Error("Student is already added in this batch for the selected main class");
        (err as any).status = 400;
        throw err;
    }

    const isStudentInBatch = batch.students.some((id) => id.toString() === student._id.toString());
    if (!isStudentInBatch) {
        batch.students.push(student._id);
    }

    batch.mainClassStudentPairs.push({
        mainClass: mainClass._id,
        student: student._id,
    });

    await User.findByIdAndUpdate(student._id, { $addToSet: { batches: batch._id } });

    return await batch.save();
};

export const getClassById = async (classId: string): Promise<IBatch> => {
    const classData = await Batch.findById(classId)
        .populate("mainClasses", "name fees startDate endDate teacherName teacherEmail isActive")
        .populate("students", "name email phone role")
        .populate("mainClassStudentPairs.mainClass", "name fees")
        .populate("mainClassStudentPairs.student", "name email phone role");
    if (!classData) {
        const err = new Error("Class not found");
        (err as any).status = 404;
        throw err;
    }
    return classData;
};

export const getAllClasses = async (): Promise<IBatch[]> => {
    return await Batch.find();
};

export const showStudentsInClass = async (classId: string): Promise<Array<{ id: string; name: string }>> => {
    const classData = await Batch.findById(classId).populate('students', 'name');
    if (!classData) {
        const err = new Error("Class not found");
        (err as any).status = 404;
        throw err;
    }
    return classData.students.map((student: any) => ({ id: student._id.toString(), name: student.name }));
};