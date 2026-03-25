import { Request, Response, NextFunction } from "express";
import * as UserService from "../services/User_service";
import { uploadOnCloudinary } from "../utilis/cloudinary";
  
export const sendotp= async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    const result = await UserService.loginUser(email);
    return res.status(200).json(
      {
        success: true,
        message :"Otp send successfully",
        data: result
       }
    );
  } catch (error) {
    next(error);
  }
};

export const verifyotp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, otp } = req.body;  
    const result = await UserService.verifyUserOTP(email, otp);
    return res.status(200).json(
      {
        success: true,
        message :"OTP verified successfully",
        data: result
       }
    );
  } catch (error) {
    next(error);
  }
};

export const addInstituteUser = async (req: Request, res: Response) => {
  try {
    if (!req.user || (req.user.role !== "Admin" && req.user.role !== "Teacher")) {
      return res.status(403).json({ message: "Access denied. Admin or Teacher privileges required." });
    }

    const payload: any = { ...req.body };
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

    const profilePicFile = files?.profilePic?.[0];
    if (profilePicFile?.path) {
      const uploadedProfilePic = await uploadOnCloudinary(profilePicFile.path);
      if (!uploadedProfilePic) {
        return res.status(500).json({
          success: false,
          message: "Failed to upload profile picture",
        });
      }
      payload.profilePic = uploadedProfilePic.secure_url;
    }

    const studentImageFiles = files?.documents ?? [];
    if (studentImageFiles.length > 0) {
      const uploadedImages = await Promise.all(
        studentImageFiles.map(async (file) => {
          const uploaded = await uploadOnCloudinary(file.path);
          return uploaded?.secure_url ?? null;
        }),
      );

      const validUrls = uploadedImages.filter((url): url is string => Boolean(url));
      if (validUrls.length !== studentImageFiles.length) {
        return res.status(500).json({
          success: false,
          message: "Failed to upload one or more student images",
        });
      }

      payload.documents = validUrls;
    }

    const createdUser = await UserService.createInstituteUser(payload);
    return res.status(201).json({
      success: true,
      message: "User added successfully",
      data: createdUser,
    });
  } catch (error) {
    const status = (error as any)?.status || 500;
    return res.status(status).json({
      success: false,
      message: error instanceof Error ? error.message : "Error adding user",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const userDetails = async (req: Request, res: Response) => {
  try {
    if (!req.user || (req.user.role !== "Admin" && req.user.role !== "Teacher" && req.user.role !== "Student")) {
      return res.status(403).json({ message: "Access denied. Admin, Teacher, or Student privileges required." });
    }

    const userId = req.params.userId;
    const user = await UserService.getUserDetailsById(userId);
    return res.status(200).json({
      success: true,
      message: "User details fetched successfully",
      data: user,
    });
  } catch (error) {
    const status = (error as any)?.status || 500;
    return res.status(status).json({
      success: false,
      message: error instanceof Error ? error.message : "Error fetching user details",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const editInstituteUser = async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== "Admin") {
      return res.status(403).json({ message: "Access denied. Admin privileges required." });
    }

    const userId = req.params.userId;
    const payload: any = { ...req.body };
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

    const profilePicFile = files?.profilePic?.[0];
    if (profilePicFile?.path) {
      const uploadedProfilePic = await uploadOnCloudinary(profilePicFile.path);
      if (!uploadedProfilePic) {
        return res.status(500).json({
          success: false,
          message: "Failed to upload profile picture",
        });
      }
      payload.profilePic = uploadedProfilePic.secure_url;
    }

    const studentImageFiles = files?.documents ?? [];
    if (studentImageFiles.length > 0) {
      const uploadedImages = await Promise.all(
        studentImageFiles.map(async (file) => {
          const uploaded = await uploadOnCloudinary(file.path);
          return uploaded?.secure_url ?? null;
        }),
      );

      const validUrls = uploadedImages.filter((url): url is string => Boolean(url));
      if (validUrls.length !== studentImageFiles.length) {
        return res.status(500).json({
          success: false,
          message: "Failed to upload one or more student images",
        });
      }

      payload.documents = validUrls;
    }

    const updatedUser = await UserService.updateInstituteUserById(userId, payload);
    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    const status = (error as any)?.status || 500;
    return res.status(status).json({
      success: false,
      message: error instanceof Error ? error.message : "Error updating user",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const getAllStudents = async (req: Request, res: Response) => {
  try {
    if (!req.user || (req.user.role !== "Admin" && req.user.role !== "Teacher")) {
      return res.status(403).json({ message: "Access denied. Admin or Teacher privileges required." });
    }

    const students = await UserService.getAllStudents();
    return res.status(200).json({
      success: true,
      message: "Students fetched successfully",
      count: students.length,
      data: students,
    });
  } catch (error) {
    const status = (error as any)?.status || 500;
    return res.status(status).json({
      success: false,
      message: "Error fetching students",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const getAllTeachers = async (req: Request, res: Response) => {
  try {
    if (!req.user || (req.user.role !== "Admin" && req.user.role !== "Teacher")) {
      return res.status(403).json({ message: "Access denied. Admin or Teacher privileges required." });
    }

    const teachers = await UserService.getAllTeachers();
    return res.status(200).json({
      success: true,
      message: "Teachers fetched successfully",
      count: teachers.length,
      data: teachers,
    });
  } catch (error) {
    const status = (error as any)?.status || 500;
    return res.status(status).json({
      success: false,
      message: "Error fetching teachers",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};