import dotenv from "dotenv";
import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import fs from "fs";

dotenv.config();

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

cloudinary.config({
  cloud_name: cloudName as string,
  api_key: apiKey as string,
  api_secret: apiSecret as string,
});

const uploadOnCloudinary = async (
  localFilePath: string
): Promise<UploadApiResponse | null> => {
  if (!localFilePath) return null;

  if (!cloudName || !apiKey || !apiSecret) {
    console.error("Cloudinary upload failed: missing CLOUDINARY_* environment variables");
    return null;
  }

  try {
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    console.log("File is uploaded on Cloudinary:", response.url);

    return response;
  } catch (err: any) {
    const errorMessage =
      err?.message ||
      err?.error?.message ||
      err?.http_code?.toString() ||
      JSON.stringify(err);
    console.error("Cloudinary upload failed:", errorMessage);
    return null;
  } finally {
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    } else {
      console.warn("Temp file not found for deletion:", localFilePath);
    }
  }
};

export { uploadOnCloudinary };