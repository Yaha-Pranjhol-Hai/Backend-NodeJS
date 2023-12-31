import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);

    const accessToken = await user.generateAccessToken(); // don't forget to put brackets since it is a method.
    const refreshToken = await user.generateRefreshToken();

    user.refreshToken = refreshToken; //added the token in the user object
    await user.save({ validateBeforeSave: false }); // whenever we try save it the mongoose model will kick in so for that we wrote validateBeforeSave parameter.

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating access and refresh tokens."
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  // Step 1 - get user details from frontend
  const { fullName, email, username, password } = req.body;
  // 2nd Step - validation
  if (
    // Here some method returns the boolean value
    [fullName, username, email, password].some(
      (fields) => fields?.trim() === ""
    )
  ) {
    throw new ApiError(400, "All fields are required");
  }

  // Step 3 - check if the user exists already
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists");
  }

  // Step 4 - check for avatar
  const avatarLocalPath = req.files?.avatar[0]?.path; // localPath because it is on the Server not on cloudinary as of now.
  // also here we did avatar[0] because it access's the first property of it which gives it the object which has path.

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  // Step 5 - Upload on cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath); // If there is no coverImage ten cloudinary will give you empty string.

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required!");
  }

  // Step 6 - Create User Object
  const user = await User.create({
    //create method is used to make an entry the database.
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  // Step 7 - removing password and referenceToken field from response
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user.");
  }

  // Step 8 - response of user registration
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered Successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  // Step 1 - get username and all other fields for verification
  const { username, email, password } = req.body;

  if (!(username || email)) {
    throw new ApiError(300, "Username or Email is required");
  }

  // Step 2 - find User
  const user = await User.findOne({
    // This User with capital U is available through mongoose, and user is the instance of the database that we have gathered.
    $or: [{ username }, { email }], // remember this syntax
  });

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  // Step 3 - password check
  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  // Step 4 - create access and refresh tokens
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  // Step 5 - send cookies
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // We need options object becuse by delfault anybody can change the token from the frontend, by making both the parameters true now you can only modify them from the server.
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options) // don't forget to send here options as an argument.
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User Logged In Successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  // Step 1 - Find the user from the database and delete the user's refreshToken.
  await User.findByIdAndUpdate(
    req.user._id, // we got to acces req.user because of the auth.middleware.js which gives us the verified user, and now we have the data of the loggedInUser.
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true, // It gives us the updated value in the response.
    }
  );
  // Step 2 - Clear the cookies of the user.
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accesToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User LoggedOut Successfully"));
});

export { registerUser, loginUser, logoutUser };
