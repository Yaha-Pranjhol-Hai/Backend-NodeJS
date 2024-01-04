import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

const registerUser = asyncHandler( async(req, res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and referenceToken field from response
    // check for user creation
    // return res

    // 2nd Step - validation
    if(
        // Here some method returns the boolean value
        [fullName, username, email, password].some((fields) => fields?.trim() === "") 
    ){
        throw new ApiError(400, "All fields are required")
    }

    // Step 3 - check if the user exists already
    const existedUser = User.findOne({
        $or: [{ username }, { email }]
    })

    if(!existedUser){
        throw new ApiError(409, "User with email or username already exists")
    }

    // Step 4 - check for avatar
    const avatarLocalPath = req.files?.avatar[0]?.path // localPath because it is on the Server not on cloudinary as of now.
    // also here we did avatar[0] because it access's the first property of it which gives it the object which has path.
    const coverImageLocalPath = req.files?.coverImage[0]?.path

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is required")
    }

    // Step 5 - Upload on cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400,"Avatar file is required")
    }

    // Step 6 - Create User Object
    const user = await User.create({ //create method is used to make an entry the database.
        username: username.toLowerCase(),
        fullName,
        avatar: avatar.url,
        email,
        password,
        coverImage: coverImage?.url || "",
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