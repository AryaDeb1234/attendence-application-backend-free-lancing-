import MainClass, { ICreateMainClassInput, IMainClass } from "../models/MainClass";
import User, { IUser } from "../models/User";
import Student_Batch, { I_S_Batch } from "../models/Student_Batch";

export const createMainClass = async (mainClassData: ICreateMainClassInput): Promise<IMainClass> => {
  const startDate = new Date(mainClassData.startDate);
  if (Number.isNaN(startDate.getTime())) {
    const err = new Error("Invalid startDate");
    (err as any).status = 400;
    throw err;
  }

  if (!Number.isInteger(mainClassData.duration) || mainClassData.duration <= 0) {
    const err = new Error("duration must be a positive integer (months)");
    (err as any).status = 400;
    throw err;
  }

  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + mainClassData.duration);

  const teacherUser = await User.findOne({
    email: mainClassData.teacherEmail.toLowerCase(),
    role: { $in: ["Teacher", "Admin"] },
  }).select("name email role");

  if (!teacherUser) {
    const err = new Error("Teacher/Admin not found with this email");
    (err as any).status = 404;
    throw err;
  }

  const newMainClass = new MainClass({
    ...mainClassData,
    startDate,
    endDate,
    teacherName: teacherUser.name,
    teacherEmail: teacherUser.email.toLowerCase(),
    students: mainClassData.students ?? [],
    batches: mainClassData.batches ?? [],
    isActive: mainClassData.isActive ?? true,
  });

  return await newMainClass.save();
};

export const getAllMainClasses = async (): Promise<IMainClass[]> => {
  return await MainClass.find().sort({ createdAt: -1 });
};

export const getMainClassById = async (mainClassId: string) => {
  const mainClassData = await MainClass.findById(mainClassId)
    .populate("students", "name email phone")
    .populate("batches", "name startDate endDate");

  if (!mainClassData) {
    const err = new Error("Main class not found");
    (err as any).status = 404;
    throw err;
  }

  
  const studentBatches = await Student_Batch.find({ mainClass: mainClassId })
    .populate("student", "name email phone")
    .sort({ rollno: 1 });

  return {
    mainClass: mainClassData,
    studentsProgress: studentBatches,
  };
};

export const addStudentToMainClass = async (
  mainClassId: string,
  studentEmail: string,
  admissionDate: Date
): Promise<{ mainClass: IMainClass; studentBatch: I_S_Batch }> => {
  
  const mainClass = await MainClass.findById(mainClassId);
  if (!mainClass) {
    const err = new Error("Main class not found");
    (err as any).status = 404;
    throw err;
  }

  
  const student = await User.findOne({ email: studentEmail.toLowerCase() });
  if (!student) {
    const err = new Error("Student not found with this email");
    (err as any).status = 404;
    throw err;
  }

  
  const isAlreadyInMainClass = mainClass.students.some(
    (id) => id.toString() === student._id.toString(),
  );

  if (isAlreadyInMainClass) {
    const err = new Error("Student is already added to this main class");
    (err as any).status = 400;
    throw err;
  }

  
  const mainClassDuration = mainClass.endDate.getTime() - mainClass.startDate.getTime();
  const studentStartDate = new Date(admissionDate);
  const studentEndDate = new Date(studentStartDate.getTime() + mainClassDuration);

  
  const lastStudentBatch = await Student_Batch.findOne({ mainClass: mainClassId })
    .sort({ rollno: -1 })
    .select("rollno");
  const nextRollno = (lastStudentBatch?.rollno ?? 0) + 1;

  
  const studentBatch = await Student_Batch.create({
    rollno: nextRollno,
    student: student._id,
    mainClass: mainClassId,
    joinDate: studentStartDate,
    startDate: studentStartDate,
    endDate: studentEndDate,
    batchcompletion: false,
    examcompletion: false,
    certificateIssued: false,
  });

  
  mainClass.students.push(student._id);
  const hasMainClassInUser = (student.mainClasses ?? []).some(
    (id) => id.toString() === mainClass._id.toString(),
  );
  if (!hasMainClassInUser) {
    student.mainClasses = [...(student.mainClasses ?? []), mainClass._id];
  }

  await Promise.all([mainClass.save(), student.save()]);

  
  const updatedMainClass = await MainClass.findById(mainClassId)
    .populate("students", "name email")
    .populate("batches", "name startDate endDate");

  return {
    mainClass: updatedMainClass as IMainClass,
    studentBatch: studentBatch,
  };
};

export const removeStudentFromMainClass = async (
  mainClassId: string,
  studentIdentifier: { studentId?: string; studentEmail?: string },
): Promise<{ mainClass: IMainClass; removedStudentId: string; deletedStudentBatchCount: number }> => {
  const mainClass = await MainClass.findById(mainClassId);
  if (!mainClass) {
    const err = new Error("Main class not found");
    (err as any).status = 404;
    throw err;
  }

  let student: IUser | null = null;
  if (studentIdentifier.studentId) {
    student = (await User.findById(studentIdentifier.studentId)) as IUser | null;
  } else if (studentIdentifier.studentEmail) {
    student = (await User.findOne({
      email: studentIdentifier.studentEmail.toLowerCase(),
    })) as IUser | null;
  }

  if (!student) {
    const err = new Error("Student not found");
    (err as any).status = 404;
    throw err;
  }

  const studentDoc = student as any;

  const isInMainClass = mainClass.students.some(
    (id) => id.toString() === studentDoc._id.toString(),
  );

  if (!isInMainClass) {
    const err = new Error("Student is not assigned to this main class");
    (err as any).status = 400;
    throw err;
  }

  mainClass.students = mainClass.students.filter(
    (id) => id.toString() !== studentDoc._id.toString(),
  );

  studentDoc.mainClasses = (studentDoc.mainClasses ?? []).filter(
    (id: any) => id.toString() !== mainClass._id.toString(),
  );

  const [, , deleteResult] = await Promise.all([
    mainClass.save(),
    studentDoc.save(),
    Student_Batch.deleteMany({ mainClass: mainClass._id, student: studentDoc._id }),
  ]);

  const updatedMainClass = await MainClass.findById(mainClassId)
    .populate("students", "name email")
    .populate("batches", "name startDate endDate");

  return {
    mainClass: updatedMainClass as IMainClass,
    removedStudentId: studentDoc._id.toString(),
    deletedStudentBatchCount: deleteResult.deletedCount ?? 0,
  };
};

export const updateStudentBatch = async (
  studentBatchId: string,
  updateData: Partial<I_S_Batch>
): Promise<I_S_Batch> => {
  const studentBatch = await Student_Batch.findByIdAndUpdate(
    studentBatchId,
    updateData,
    { new: true }
  ).populate("student", "name email phone");

  if (!studentBatch) {
    const err = new Error("Student batch not found");
    (err as any).status = 404;
    throw err;
  }

  return studentBatch;
};
