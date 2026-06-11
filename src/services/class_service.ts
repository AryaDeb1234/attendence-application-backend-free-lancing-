import Batch,{ IBatch, ICreateBatchInput, IMainClassStudentPair } from "../models/Batch";
import MainClass from "../models/MainClass";
import User from "../models/User";
import Student_Batch from "../models/Student_Batch";
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

// const validateBatchCoreData = async (batchData: {
//     startTime: string;
//     endTime: string;
//     teachers?: Types.ObjectId[];
//     teacherEmail?: string;
//     mainClasses: Types.ObjectId[];
// }): Promise<void> => {
//     if (parseTimeToMinutes(batchData.startTime) >= parseTimeToMinutes(batchData.endTime)) {
//         const err = new Error("startTime must be before endTime");
//         (err as any).status = 400;
//         throw err;
//     }

//     // Validate teacher(s): prefer `teachers` array of ids, else `teacherEmail` fallback
//     if (Array.isArray(batchData.teachers) && batchData.teachers.length > 0) {
//         const teachersFound = await User.find({ _id: { $in: batchData.teachers }, role: { $in: ["Teacher", "Admin"] } }).select("_id");
//         if (!teachersFound || teachersFound.length === 0) {
//             const err = new Error("One or more teachers not found or not Teacher/Admin");
//             (err as any).status = 400;
//             throw err;
//         }
//     } else {
//         const teacherEmail = batchData.teacherEmail;
//         if (!teacherEmail) {
//             const err = new Error("teachers or teacherEmail is required");
//             (err as any).status = 400;
//             throw err;
//         }
//         const teacher = await User.findOne({
//             email: teacherEmail,
//             role: { $in: ["Teacher", "Admin"] },
//         }).select("_id");
//         if (!teacher) {
//             const err = new Error("Teacher/Admin not found for teacherEmail");
//             (err as any).status = 400;
//             throw err;
//         }
//     }

//     const mainClassIds = [...new Set(batchData.mainClasses.map((id) => id.toString()))];
//     if (mainClassIds.length === 0) {
//         const err = new Error("At least one mainClass is required");
//         (err as any).status = 400;
//         throw err;
//     }

// };
const validateBatchCoreData = async (batchData: {
    startTime: string;
    endTime: string;
    teachers?: Types.ObjectId[];
    teacherEmail?: string;
    mainClasses?: Types.ObjectId[];
}): Promise<void> => {
    if (
        parseTimeToMinutes(batchData.startTime) >=
        parseTimeToMinutes(batchData.endTime)
    ) {
        const err = new Error("startTime must be before endTime");
        (err as any).status = 400;
        throw err;
    }

    // Validate teachers only if provided
    if (Array.isArray(batchData.teachers) && batchData.teachers.length > 0) {
        const teachersFound = await User.find({
            _id: { $in: batchData.teachers },
            role: { $in: ["Teacher", "Admin"] },
        }).select("_id");

        if (teachersFound.length !== batchData.teachers.length) {
            const err = new Error(
                "One or more teachers not found or not Teacher/Admin"
            );
            (err as any).status = 400;
            throw err;
        }
    }

    // Validate mainClasses only if provided
    if (Array.isArray(batchData.mainClasses) && batchData.mainClasses.length > 0) {
        const mainClassIds = [
            ...new Set(batchData.mainClasses.map((id) => id.toString())),
        ];

        const mainClassesFound = await MainClass.find({
            _id: { $in: mainClassIds },
        }).select("_id");

        if (mainClassesFound.length !== mainClassIds.length) {
            const err = new Error("One or more mainClasses not found");
            (err as any).status = 400;
            throw err;
        }
    }
};

const validatePairAssignments = async (
    mainClasses: Types.ObjectId[] = [],
    students: Types.ObjectId[] = [],
    pairs: IMainClassStudentPair[] = []
) => {
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
    const mainClassDoc = await MainClass.findById(mainClassId).select("name");

    const studentDoc = validStudents.find(
        (doc) => doc._id.toString() === studentId
    );

    const err = new Error(
        `Cannot remove "${mainClassDoc?.name ?? mainClassId}" because ${formatStudentLabel(studentDoc)} is assigned to this course in the batch. Remove the student from the batch first.`
    );

    (err as any).status = 400;
    throw err;
}

        if (!studentIds.includes(studentId)) {
    const studentDoc = validStudents.find(
        (doc) => doc._id.toString() === studentId
    );

    const err = new Error(
       `${formatStudentLabel(studentDoc)} is still assigned to a course in this batch.`
    );

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
    await validateBatchCoreData(classData as any);

    const normalizedClassData: IBatch = {
    ...classData,
    teachers: classData.teachers ?? [],
    mainClasses: classData.mainClasses ?? [],
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

// export const deleteClass = async (classId: string): Promise<void> => {
//     const deletedClass = await Batch.findByIdAndDelete(classId);
//     if (!deletedClass) {
//         const err = new Error("Class not found");
//         (err as any).status = 404;
//         throw err;
//     }
// };

export const deleteClass = async (classId: string): Promise<IBatch> => {
    const deletedClass = await Batch.findById(classId);

    if (!deletedClass) {
        const err = new Error("Class not found");
        (err as any).status = 404;
        throw err;
    }

    const userIds = [
        ...new Set([
            ...deletedClass.teachers.map(id => id.toString()),
            ...deletedClass.students.map(id => id.toString()),
        ]),
    ];

    if (userIds.length > 0) {
        await User.updateMany(
            { _id: { $in: userIds } },
            { $pull: { batches: deletedClass._id } }
        );
    }

    await MainClass.updateMany(
        { _id: { $in: deletedClass.mainClasses } },
        { $pull: { batches: deletedClass._id } }
    );

    await Batch.findByIdAndDelete(classId);

    return deletedClass;
};

// export const editClass = async (classId: string, updateData: Partial<IBatch>): Promise<IBatch> => {
//     const existingClass = await Batch.findById(classId);
    
//     if (!existingClass) {
//         const err = new Error("Class not found");
//         (err as any).status = 404;
//         throw err;
//     }

//     const payload = updateData as Partial<IBatch> & {
//         mainClassId?: string;
//     };

//     let mergedMainClasses = payload.mainClasses ? [...payload.mainClasses] : [...existingClass.mainClasses];

//     if (payload.mainClassId) {
//         const mainClass = await MainClass.findById(payload.mainClassId).select("_id");
//         if (!mainClass) {
//             const err = new Error("Main class not found");
//             (err as any).status = 404;
//             throw err;
//         }

//         const alreadyIncluded = mergedMainClasses.some(
//             (id) => id.toString() === mainClass._id.toString(),
//         );

//         if (!alreadyIncluded) {
//             mergedMainClasses.push(mainClass._id);
//         }
//     }

//     const mergedClassData: IBatch = {
//         name: payload.name ?? existingClass.name,
//         weekday: payload.weekday ?? existingClass.weekday,
//         startTime: payload.startTime ?? existingClass.startTime,
//         endTime: payload.endTime ?? existingClass.endTime,
//         teachers: payload.teachers ?? existingClass.teachers,
//         mainClasses: mergedMainClasses,
//         students: payload.students ?? existingClass.students,
//         mainClassStudentPairs: payload.mainClassStudentPairs ?? existingClass.mainClassStudentPairs,
//     };

//     await validateBatchCoreData(mergedClassData);
//     await validatePairAssignments(
//         mergedClassData.mainClasses,
//         mergedClassData.students,
//         mergedClassData.mainClassStudentPairs,
//     );
//     Object.assign(existingClass, payload, { mainClasses: mergedMainClasses });
//     return await existingClass.save();
// };
export const editClass = async (
    classId: string,
    updateData: Partial<IBatch>
): Promise<IBatch> => {
    const existingClass = await Batch.findById(classId);

    if (!existingClass) {
        const err = new Error("Class not found");
        (err as any).status = 404;
        throw err;
    }

    const payload = updateData as Partial<IBatch> & {
        mainClassId?: string;
    };

    let mergedMainClasses = payload.mainClasses
        ? [...payload.mainClasses]
        : [...existingClass.mainClasses];

    if (payload.mainClassId) {
        const mainClass = await MainClass.findById(payload.mainClassId).select("_id");

        if (!mainClass) {
            const err = new Error("Main class not found");
            (err as any).status = 404;
            throw err;
        }

        const alreadyIncluded = mergedMainClasses.some(
            (id) => id.toString() === mainClass._id.toString()
        );

        if (!alreadyIncluded) {
            mergedMainClasses.push(mainClass._id);
        }
    }

    const mergedClassData: IBatch = {
        name: payload.name ?? existingClass.name,
        weekday: payload.weekday ?? existingClass.weekday,
        startTime: payload.startTime ?? existingClass.startTime,
        endTime: payload.endTime ?? existingClass.endTime,
        teachers: payload.teachers ?? existingClass.teachers,
        mainClasses: mergedMainClasses,
        students: payload.students ?? existingClass.students,
        mainClassStudentPairs:
            payload.mainClassStudentPairs ?? existingClass.mainClassStudentPairs,
    };

    await validateBatchCoreData(mergedClassData);

    await validatePairAssignments(
        mergedClassData.mainClasses,
        mergedClassData.students,
        mergedClassData.mainClassStudentPairs
    );

    // -------------------------
    // Sync User.batches
    // -------------------------

    const oldTeacherIds = existingClass.teachers.map((id) => id.toString());
    const newTeacherIds = mergedClassData.teachers.map((id) => id.toString());

    const addedTeachers = newTeacherIds.filter(
        (id) => !oldTeacherIds.includes(id)
    );

    const removedTeachers = oldTeacherIds.filter(
        (id) => !newTeacherIds.includes(id)
    );

    const oldStudentIds = existingClass.students.map((id) => id.toString());
    const newStudentIds = mergedClassData.students.map((id) => id.toString());

    const addedStudents = newStudentIds.filter(
        (id) => !oldStudentIds.includes(id)
    );

    const removedStudents = oldStudentIds.filter(
        (id) => !newStudentIds.includes(id)
    );

    if (addedTeachers.length) {
        await User.updateMany(
            { _id: { $in: addedTeachers } },
            { $addToSet: { batches: existingClass._id } }
        );
    }

    if (removedTeachers.length) {
        await User.updateMany(
            { _id: { $in: removedTeachers } },
            { $pull: { batches: existingClass._id } }
        );
    }

    if (addedStudents.length) {
        await User.updateMany(
            { _id: { $in: addedStudents } },
            { $addToSet: { batches: existingClass._id } }
        );
    }

    if (removedStudents.length) {
        await User.updateMany(
            { _id: { $in: removedStudents } },
            { $pull: { batches: existingClass._id } }
        );
    }

    // -------------------------
// Sync MainClass.batches
// -------------------------

const oldMainClassIds = existingClass.mainClasses.map((id) => id.toString());

const newMainClassIds = mergedMainClasses.map((id) => id.toString());

const addedMainClasses = newMainClassIds.filter(
    (id) => !oldMainClassIds.includes(id)
);

const removedMainClasses = oldMainClassIds.filter(
    (id) => !newMainClassIds.includes(id)
);

if (addedMainClasses.length) {
    await MainClass.updateMany(
        { _id: { $in: addedMainClasses } },
        { $addToSet: { batches: existingClass._id } }
    );
}

if (removedMainClasses.length) {
    await MainClass.updateMany(
        { _id: { $in: removedMainClasses } },
        { $pull: { batches: existingClass._id } }
    );
}

    Object.assign(existingClass, payload, {
        mainClasses: mergedMainClasses,
    });

    return await existingClass.save();
};

export const addStudentToClass = async (
    classId: string,
    mainClassId: string,
    studentIdentifier: { studentId?: string; studentEmail?: string },
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

    let student: any = null;
    if (studentIdentifier.studentId) {
        student = await User.findById(studentIdentifier.studentId).select("_id");
    } else if (studentIdentifier.studentEmail) {
        student = await User.findOne({ email: studentIdentifier.studentEmail.toLowerCase(), role: "Student" }).select("_id");
    }

    if (!student) {
        const err = new Error("Student not found");
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
        .populate("mainClasses", "name fees startDate endDate isActive")
        .populate("teachers", "name email")
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
    return await Batch.find().populate('teachers', 'name email');
};

export const showStudentsInClass = async (classId: string): Promise<Array<{ id: string; name: string }>> => {
    const classData = await Batch.findById(classId).populate('students', 'name');
    if (!classData) {
        const err = new Error("Class not found");
        (err as any).status = 404;
        throw err;
    }

    const activeStudentIds = new Set<string>();
    const studentBatches = await Student_Batch.find({
        mainClass: { $in: classData.mainClasses },
        student: { $in: classData.students },
    }).select("student batchcompletion examcompletion certificateIssued");

    for (const studentBatch of studentBatches) {
        const isIncomplete =
            !studentBatch.batchcompletion ||
            !studentBatch.examcompletion ||
            !studentBatch.certificateIssued;

        if (isIncomplete) {
            activeStudentIds.add(studentBatch.student.toString());
        }
    }

    return classData.students
        .filter((student: any) => activeStudentIds.has(student._id.toString()))
        .map((student: any) => ({ id: student._id.toString(), name: student.name }));
};

export const removeStudentFromClass = async (
    classId: string,
    mainClassId: string,
    studentId: string,
): Promise<IBatch> => {
    const batch = await Batch.findById(classId);
    if (!batch) {
        const err = new Error("Class not found");
        (err as any).status = 404;
        throw err;
    }

    batch.mainClassStudentPairs = batch.mainClassStudentPairs.filter(
        (pair) => !(pair.mainClass.toString() === mainClassId && pair.student.toString() === studentId),
    );
    batch.students = batch.students.filter((id) => id.toString() !== studentId);
    
    await User.findByIdAndUpdate(studentId, { $pull: { batches: batch._id } });

    return await batch.save();
};