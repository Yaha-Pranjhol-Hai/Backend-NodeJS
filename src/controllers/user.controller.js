import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

const registerUser = asyncHandler( async(req, res) => {
    // Step 1 - get user details from frontend
    const {fullName, email, username, password } = req.body
    // 2nd Step - validation
    if(
        // Here some method returns the boolean value
        [fullName, username, email, password].some((fields) => fields?.trim() === "") 
    ){
        throw new ApiError(400, "All fields are required")
    }

    // Step 3 - check if the user exists already
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if(existedUser){
        throw new ApiError(409, "User with email or username already exists")
    }

    // Step 4 - check for avatar
    const avatarLocalPath = req.files?.avatar[0]?.path; // localPath because it is on the Server not on cloudinary as of now.
    // also here we did avatar[0] because it access's the first property of it which gives it the object which has path.

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is required")
    }

    // Step 5 - Upload on cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath); // If there is no coverImage ten cloudinary will give you empty string.

    if(!avatar){
        throw new ApiError(400,"Avatar file is required!")
    }

    // Step 6 - Create User Object
    const user = await User.create({ //create method is used to make an entry the database.
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase(),
    })

    // Step 7 - removing password and referenceToken field from response
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500, "Something went wrong while registering the user.")
    }

    // Step 8 - response of user registration
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )
})

export {registerUser}