import User, { IUser } from '../models/User';
import MainClass from '../models/MainClass';
import Otp from '../models/Otp';
import { generateToken } from '../utilis/jwt_utilis';
import { requestOTP,verfiyOTP } from './Auth_Service';

interface CreateInstituteUserInput {
    name?: string;
    email?: string;
    phone?: string;
    adhar?: string;
    fatherName?: string;
    dob?: string | Date;
    address?: string;
    nationality?: string;
    gender?: 'Male' | 'Female' | 'Other';
    pin?: string;
    schoolCollegeName?: string;
    stream?: string;
    className?: string;
    'class'?: string;
    yearOfPassing?: string | number;
    marksObtained?: string | number;
    grade?: string;
    role?: string;
    mainClasses?: string[];
    profilePic?: string;
    documents?: string[];
}

interface UpdateInstituteUserInput {
    name?: string;
    email?: string;
    phone?: string;
    adhar?: string;
    fatherName?: string;
    dob?: string | Date;
    address?: string;
    nationality?: string;
    gender?: 'Male' | 'Female' | 'Other';
    pin?: string;
    schoolCollegeName?: string;
    stream?: string;
    className?: string;
    'class'?: string;
    yearOfPassing?: string | number;
    marksObtained?: string | number;
    grade?: string;
    role?: string;
    mainClasses?: string[];
    profilePic?: string;
    documents?: string[];
}

const parseOptionalDate = (value: string | Date | undefined) => {
    if (value === undefined || value === null || value === "") {
        return undefined;
    }

    return value instanceof Date ? value : new Date(value);
};

const parseOptionalNumber = (value: string | number | undefined) => {
    if (value === undefined || value === null || value === "") {
        return undefined;
    }

    return typeof value === "number" ? value : Number(value);
};

const validateParsedDate = (value: Date | undefined, fieldName: string) => {
    if (value && Number.isNaN(value.getTime())) {
        const err = new Error(`${fieldName} must be a valid date`);
        (err as any).status = 400;
        throw err;
    }
};

const validateParsedNumber = (value: number | undefined, fieldName: string) => {
    if (value !== undefined && Number.isNaN(value)) {
        const err = new Error(`${fieldName} must be a valid number`);
        (err as any).status = 400;
        throw err;
    }
};

const buildUserProfileData = <T extends CreateInstituteUserInput | UpdateInstituteUserInput>(userData: T) => ({
    fatherName: userData.fatherName,
    dob: parseOptionalDate(userData.dob),
    address: userData.address,
    nationality: userData.nationality,
    gender: userData.gender,
    pin: userData.pin,
    schoolCollegeName: userData.schoolCollegeName,
    stream: userData.stream,
    className: userData.className ?? userData["class"],
    yearOfPassing: parseOptionalNumber(userData.yearOfPassing),
    marksObtained: parseOptionalNumber(userData.marksObtained),
    grade: userData.grade,
});

const validateUserProfileData = <T extends CreateInstituteUserInput | UpdateInstituteUserInput>(userData: T) => {
    const dob = parseOptionalDate(userData.dob);
    const yearOfPassing = parseOptionalNumber(userData.yearOfPassing);
    const marksObtained = parseOptionalNumber(userData.marksObtained);

    validateParsedDate(dob, "dob");
    validateParsedNumber(yearOfPassing, "yearOfPassing");
    validateParsedNumber(marksObtained, "marksObtained");
};


export const loginUser = async (email: string) => {
  const user = await User.findOne({ email });
    if (!user) {
        throw new Error("User does not exist");
    }
    await requestOTP(email);
    return { message: "OTP sent to email" };
};

export const verifyUserOTP = async (email: string, otp: string) => {
    const user = await verfiyOTP(email, otp);
    const token = generateToken(user._id.toString(), user.role);
    return { user, token };
}

export const createInstituteUser = async (userData: CreateInstituteUserInput): Promise<IUser> => {
    const role = userData.role as IUser["role"] | undefined;

    if (!role || !["Student", "Teacher"].includes(role)) {
        const err = new Error("role must be either Student or Teacher");
        (err as any).status = 400;
        throw err;
    }

    if (!userData.name || !userData.email || !userData.phone) {
        const err = new Error("name, email, phone and role are required");
        (err as any).status = 400;
        throw err;
    }

    if (role === "Student" && !userData.adhar) {
        const err = new Error("adhar is required for Student role");
        (err as any).status = 400;
        throw err;
    }

    if (userData.documents && userData.documents.length > 3) {
        const err = new Error("documents can contain at most 3 images");
        (err as any).status = 400;
        throw err;
    }

    if (role === "Student") {
        validateUserProfileData(userData);
    }

    const existingUser = await User.findOne({ email: userData.email.toLowerCase() });
    if (existingUser) {
        const err = new Error("User already exists with this email");
        (err as any).status = 400;
        throw err;
    }

    const newUser = await User.create({
        name: userData.name,
        email: userData.email.toLowerCase(),
        phone: userData.phone,
        adhar: role === "Student" ? userData.adhar : undefined,
        profilePic: userData.profilePic,
        documents: userData.documents ?? [],
        role,
        batches: [],
        mainClasses: userData.mainClasses ?? [],
        ...(role === "Student" ? buildUserProfileData(userData) : {}),
    });

    return newUser;
};

export const getUserDetailsById = async (userId: string): Promise<IUser> => {
    const user = await User.findById(userId);
    if (!user) {
        const err = new Error("User not found");
        (err as any).status = 404;
        throw err;
    }

    // Backfill teacher/admin `mainClasses` from MainClass documents keyed by teacherEmail
    try {
        if (user.role === "Teacher" || user.role === "Admin") {
            const mainClassDocs = await MainClass.find({ teacherEmail: user.email.toLowerCase() }).select("_id");
            const mainClassIds = mainClassDocs.map((m) => m._id.toString());

            const existingIds = (user.mainClasses ?? []).map((id: any) => id.toString());
            const missing = mainClassIds.filter((id) => !existingIds.includes(id));

            if (missing.length > 0) {
                user.mainClasses = Array.from(new Set([...existingIds, ...mainClassIds]));
                await user.save();
            }
        }
    } catch (e) {
        // non-fatal: continue to return user details even if backfill fails
    }

    const populated = await User.findById(userId)
        .populate("batches", "name weekday startTime endTime")
        .populate("mainClasses", "name startDate endDate duration fees");

    return populated as IUser;
};

export const updateInstituteUserById = async (userId: string, updateData: UpdateInstituteUserInput): Promise<IUser> => {
    const user = await User.findById(userId);
    if (!user) {
        const err = new Error("User not found");
        (err as any).status = 404;
        throw err;
    }

    const nextRole = (updateData.role as IUser["role"] | undefined) ?? user.role;
    if (!["Student", "Teacher", "Admin", "TempAdmin"].includes(nextRole)) {
        const err = new Error("Invalid role");
        (err as any).status = 400;
        throw err;
    }

    if (updateData.email && updateData.email.toLowerCase() !== user.email.toLowerCase()) {
        const exists = await User.findOne({ email: updateData.email.toLowerCase() }).select("_id");
        if (exists) {
            const err = new Error("User already exists with this email");
            (err as any).status = 400;
            throw err;
        }
        user.email = updateData.email.toLowerCase();
    }

    if (updateData.documents && updateData.documents.length > 3) {
        const err = new Error("documents can contain at most 3 images");
        (err as any).status = 400;
        throw err;
    }

    if (updateData.documents !== undefined && updateData.documents.length > 3) {
        const err = new Error("documents can contain at most 3 images");
        (err as any).status = 400;
        throw err;
    }

    if (nextRole === "Student" && !((updateData.adhar ?? user.adhar)?.toString().trim())) {
        const err = new Error("adhar is required for Student role");
        (err as any).status = 400;
        throw err;
    }

    if (updateData.name !== undefined) user.name = updateData.name;
    if (updateData.phone !== undefined) user.phone = updateData.phone;
    if (updateData.adhar !== undefined) user.adhar = updateData.adhar;
    if (updateData.mainClasses !== undefined) user.mainClasses = updateData.mainClasses as any;
    if (updateData.profilePic !== undefined) user.profilePic = updateData.profilePic;
    if (updateData.role !== undefined) user.role = nextRole;
    if (updateData.fatherName !== undefined) user.fatherName = updateData.fatherName;
    if (updateData.dob !== undefined) user.dob = parseOptionalDate(updateData.dob) as any;
    if (updateData.address !== undefined) user.address = updateData.address;
    if (updateData.nationality !== undefined) user.nationality = updateData.nationality;
    if (updateData.gender !== undefined) user.gender = updateData.gender;
    if (updateData.pin !== undefined) user.pin = updateData.pin;
    if (updateData.schoolCollegeName !== undefined) user.schoolCollegeName = updateData.schoolCollegeName;
    if (updateData.stream !== undefined) user.stream = updateData.stream;
    if (updateData.className !== undefined || updateData["class"] !== undefined) user.className = updateData.className ?? updateData["class"];
    if (updateData.yearOfPassing !== undefined) user.yearOfPassing = parseOptionalNumber(updateData.yearOfPassing) as any;
    if (updateData.marksObtained !== undefined) user.marksObtained = parseOptionalNumber(updateData.marksObtained) as any;
    if (updateData.grade !== undefined) user.grade = updateData.grade;

    if (nextRole === "Student") {
        validateUserProfileData(updateData);
    }

    if (updateData.documents !== undefined) {
        if (nextRole === "Student" || nextRole === "Teacher") {
            user.documents = updateData.documents;
        } else {
            const err = new Error("documents are only allowed for Student or Teacher role");
            (err as any).status = 400;
            throw err;
        }
    } else if (nextRole !== "Student" && nextRole !== "Teacher") {
        user.documents = [];
    }

    if (nextRole !== "Student" && nextRole !== "Teacher") {
        // remove the adhar field so the sparse unique index won't treat it as a duplicate
        (user as any).adhar = undefined;
        user.fatherName = undefined;
        user.dob = undefined;
        user.address = undefined;
        user.nationality = undefined;
        user.gender = undefined;
        user.pin = undefined;
        user.schoolCollegeName = undefined;
        user.stream = undefined;
        user.className = undefined;
        user.yearOfPassing = undefined;
        user.marksObtained = undefined;
        user.grade = undefined;
    }

    await user.save();
    return user;
};

export const deleteInstituteUserById = async (userId: string): Promise<IUser> => {
    const deletedUser = await User.findByIdAndDelete(userId);
    if (!deletedUser) {
        const err = new Error("User not found");
        (err as any).status = 404;
        throw err;
    }

    return deletedUser;
};

export const getAllStudents = async (): Promise<IUser[]> => {
    return await User.find({ role: "Student" })
        .populate("batches", "name weekday startTime endTime")
    .populate("mainClasses", "name startDate endDate duration fees")
        .sort({ createdAt: -1 });
};

export const getAllTeachers = async (): Promise<IUser[]> => {
    return await User.find({ role: "Teacher" })
        .populate("batches", "name weekday startTime endTime")
    .populate("mainClasses", "name startDate endDate duration fees")
        .sort({ createdAt: -1 });
};