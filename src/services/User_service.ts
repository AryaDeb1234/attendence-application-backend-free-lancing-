import User, { IUser } from '../models/User';
import Otp from '../models/Otp';
import { generateToken } from '../utilis/jwt_utilis';
import { requestOTP,verfiyOTP } from './Auth_Service';

interface CreateInstituteUserInput {
    name?: string;
    email?: string;
    phone?: string;
    adhar?: string;
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
    role?: string;
    mainClasses?: string[];
    profilePic?: string;
    documents?: string[];
}


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

    if (role === "Student" && userData.documents && userData.documents.length > 3) {
        const err = new Error("documents can contain at most 3 images");
        (err as any).status = 400;
        throw err;
    }

    if (role === "Teacher" && userData.documents && userData.documents.length > 0) {
        const err = new Error("documents are only allowed for Student role");
        (err as any).status = 400;
        throw err;
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
        documents: role === "Student" ? (userData.documents ?? []) : [],
        role,
        batches: [],
        mainClasses: userData.mainClasses ?? [],
    });

    return newUser;
};

export const getUserDetailsById = async (userId: string): Promise<IUser> => {
    const user = await User.findById(userId)
        .populate("batches", "name weekday startTime endTime")
        .populate("mainClasses", "name startDate endDate duration fees");
    if (!user) {
        const err = new Error("User not found");
        (err as any).status = 404;
        throw err;
    }

    return user;
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

    if (nextRole !== "Student" && updateData.documents && updateData.documents.length > 0) {
        const err = new Error("documents are only allowed for Student role");
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

    if (nextRole === "Student") {
        if (updateData.documents !== undefined) {
            user.documents = updateData.documents;
        }
    } else {
        user.documents = [];
        user.adhar = "";
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