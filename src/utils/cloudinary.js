import {v2 as cloudinary} from 'cloudinary';
import fs from 'fs';
import { ApiError } from './ApiError.js';

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret:  process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) return null

        //upload file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
          resource_type: "auto"
        })

        //file has been uploaded successfully
        fs.unlinkSync(localFilePath)
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath) //fs stands for filesystem. It removes the locally saved temporary file as the upload operation got failed.
        return null
    }
}

const deleteFromCloudinary = async(publicId) => {
  try {
    if(!publicId){
      throw new ApiError(400, "PublicId dosen't exist")
    }
    const response = await cloudinary.uploader.destroy(publicId);
    return response;
  } catch (error) {
    throw new ApiError(500, "Error while deleting")
  }
}

export {uploadOnCloudinary, deleteFromCloudinary}