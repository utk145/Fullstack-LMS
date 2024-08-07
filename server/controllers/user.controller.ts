import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { IUser, User } from "../models/user.models";
import { ApiError } from "../utils/ApiError";
import jwt, { JwtPayload, Secret } from "jsonwebtoken";
import ejs from "ejs";
import path from "path";
import sendMail from "../utils/sendMail";
import { ApiResponse } from "../utils/ApiResponse";
import { accessTokenExpiry, accessTokenOptions, refreshTokenExpiry, refreshTokenOptions, sendTokens } from "../utils/jwt";
import { redis } from "../db/redis";
import { getUserDetailsById } from "../services/user.service";
import { sanitizeInput } from "../utils/sanitizeAuthInput";
import { v2 as cloudinary } from "cloudinary";
import logger from "../utils/logging/logger";

interface IRegistrationUser {
    name: string;
    email: string;
    password: string;
    avatar?: string;
}

const registerUser = asyncHandler(async (req: Request, res: Response) => {

    try {

        // Step 1: Get user details from the request body
        const { name, email, password } = req.body as IRegistrationUser;
        console.table([name, password, email]);

        // Step 2: Validation - Check if fields are not empty
        if ([name, email, password].some((entry) => entry?.trim() === "")) {
            throw new ApiError(400, 'All fields are compulsory');
        }

        // Step 3: Check if user already exists
        const existedUser = await User.findOne({
            email
        });

        if (existedUser) {
            throw new ApiError(409, "User with email already exists..")
        }

        // Step 4: Create user object
        const user: IRegistrationUser = {
            email,
            name,
            password
        };

        // Step 5-7: Generate activation token and prepare email data
        const activationToken = createActivationToken(user);
        const activationCode = activationToken.activationCode;
        console.log("activationCode generated is", activationCode);


        // Step 8: Prepare email template
        const data = {
            user: {
                name: user?.name,
                email: user?.email
            },
            activationCode: activationCode
        };

        // https://ejs.co/
        const html = await ejs.renderFile(path.join(__dirname, "../mails/activation-mail.ejs"), data);


        // Step 9: Send activation email
        await sendMail({
            email: user?.email,
            subject: "Activate your account",
            template: "activation-mail.ejs",
            data: data
        });

        // Step 10: Send success response
        return res
            .status(201)
            .json(new ApiResponse(200, { activationToken: activationToken.token }, `Please check your email : ${user?.email} to activate your account.`))


    } catch (error: any) {
        throw new ApiError(400, `Something went wrong while registering the user. ${error?.message}`);
    }
});

/**
 * Interface representing the activation token.
 */
interface IActivationToken {
    token: string;
    activationCode: string;
}


/**
 * Function to create an activation token.
 * @param user The user object.
 * @returns The activation token.
 */
const createActivationToken = (user: any): IActivationToken => {
    const activationCode = Math.floor(1000 + Math.random() * 9000).toString();

    const token = jwt.sign(
        {
            user,
            activationCode
        },
        process.env.ACTIVATION_TOKEN_SECRET as Secret,
        {
            expiresIn: process.env.ACTIVATION_TOKEN_EXPIRY
        }
    );

    return { token, activationCode };

}


/**
 * Interface representing the request body for user activation.
 */
interface IActivationRequest {
    activation_token: string;
    activation_code: string;
}

/**
 * Controller function to activate a user account.
 */
const activateUser = asyncHandler(async (req: Request, res: Response) => {
    try {

        // Step 1: Extract activation token and activation code from request body
        const {
            activation_code,
            activation_token
        } = req.body as IActivationRequest;

        // Step 2: Verify the activation token
        const newUser: {
            user: IUser; activationCode: string
        } = jwt
            .verify(
                activation_token,
                process.env.ACTIVATION_TOKEN_SECRET! as string
            ) as {
                user: IUser; activationCode: string
            };

        // Step 3: Check if activation code matches
        if (newUser.activationCode !== activation_code) {
            throw new ApiError(400, "Invalid activation code");
        }

        // Step 4: Check if user with the same email already exists
        const {
            name,
            email,
            password
        } = newUser.user;
        const existedUser = await User.findOne({
            email
        });
        if (existedUser) {
            throw new ApiError(409, "User with username or email already exists..")
        }

        // Step 5: Create user with verified details
        const user = await User.create({
            name,
            email,
            password
        });

        // Step 6: Check if user is successfully created
        const userCreated = await User.findById(user._id).select("-password");
        if (!userCreated) {
            throw new ApiError(500, "Something went wrong while registering the user..")
        }

        // Step 7: Respond with success message and user details
        return res
            .status(201)
            .json(
                new ApiResponse(200, userCreated, "User registered successfully..")
            );

    } catch (error: any) {
        // Step 8: Handle errors
        if (error instanceof jwt.TokenExpiredError) {
            throw new ApiError(400, "Activation token has expired");
        }
        if (error instanceof jwt.JsonWebTokenError) {
            throw new ApiError(400, "Invalid activation token");
        }
        throw new ApiError(400, `Something went wrong while registering the user. ${error?.message}`);
    }
});



interface ILoginUser {
    email: string;
    password: string;
}


/**
 * Controller function to handle user login.
 */
const loginUser = asyncHandler(async (req: Request, res: Response) => {
    /* Algorithm:
        1. get data from req.body
        2. login using email
        3. find the user
        4. if user exists, password check
        5. if password correct then generate both access and refresh token
        6. send them in secure cookies
        7. success response 
  */

    const { email, password } = req.body as ILoginUser;
    // console.log(email);

    if (!email || !password) {
        throw new ApiError(400, "Email and password are mandatory");
    }

    const existedUser = await User.findOne({ email });
    if (!existedUser) {
        throw new ApiError(400, "User doesn't exist");
    }

    const isPasswordCorrect = await existedUser.comparePassword(password);
    if (!isPasswordCorrect) {
        throw new ApiError(401, "Entered password isn't a valid credential");
    }

    await sendTokens(existedUser, 200, res);
});


/**
 * Controller function to handle user logout.
 * 
 * Algorithm:
 * 1. Clear the access and refresh tokens in cookies.
 * 2. Delete the user's session from Redis.
 * 3. Respond with success message.
 * 
 * @param req Express Request object.
 * @param res Express Response object.
 * @returns Success response or error.
 */
const logoutUser = asyncHandler(async (req: Request, res: Response) => {
    try {
        res.cookie("accessToken", "", { maxAge: 1 });
        res.cookie("refreshToken", "", { maxAge: 1 });

        await redis.del(req.user?._id || "")

        return res.status(200).json({ success: true, message: "User logged out successfully" });

    } catch (error: any) {
        throw new ApiError(400, error?.message);
    }

});



/**
 * Controller function to update the access token using a refresh token.
 * 
 * Algorithm:
 * 1. Extract the refresh token from cookies.
 * 2. Verify the refresh token and decode the payload.
 * 3. If the decoded payload or user ID is missing, throw an error.
 * 4. Retrieve the user session from Redis based on the user ID.
 * 5. If the session is not found, throw an error.
 * 6. Generate a new access token and refresh token.
 * 7. Set the new tokens in response cookies.
 * 8. Update the access token in the Redis session.
 * 9. Send a success response with the new access token.
 * 
 * @param req Express Request object.
 * @param res Express Response object.
 * @returns Success response with the new access token or error response.
 */
const updateAccessToken = asyncHandler(async (req: Request, res: Response) => {
    try {
        const refreshToken = req.cookies?.refreshToken as string;
        console.log("refreshToken", refreshToken);

        const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET! as string) as JwtPayload;
        console.log("decoded from updateAccessToken", decoded);

        if (!decoded || !decoded?._id) {
            throw new ApiError(400, "Couldn't refresh the token");
        }

        const sessionKey = decoded._id as string;
        const session = await redis.get(sessionKey);
        if (!session) {
            throw new ApiError(400, "User session not found");
        }

        const user = JSON.parse(session);
        const newAccessToken = jwt.sign({ id: user._id }, process.env.ACCESS_TOKEN_SECRET! as string, {
            expiresIn: `${accessTokenExpiry}s`
        });

        const newRefreshToken = jwt.sign({ id: user._id }, process.env.REFRESH_TOKEN_SECRET! as string, {
            expiresIn: `${refreshTokenExpiry}s`
        });

        req.user = user;

        // Set the new access token and refresh token in the response cookies
        res.cookie("accessToken", newAccessToken, accessTokenOptions);
        res.cookie("refreshToken", newRefreshToken, refreshTokenOptions);

        // Update the access token in the Redis session
        await redis.set(sessionKey, JSON.stringify({ ...user, accessToken: newAccessToken }));

        return res.status(200).json(new ApiResponse(200, { newAccessToken }));

    } catch (error: any) {
        throw new ApiError(400, error?.message);
    }
});



/**
 * Controller function to fetch user details by user ID.
 * 
 * Algorithm:
 * 1. Extract the user ID from the request object.
 * 2. Call the getUserDetailsById function to retrieve user details.
 * 3. Send a success response with the user details.
 * 
 * @param req Express Request object.
 * @param res Express Response object.
 * @returns Success response with the user details or error response.
 */
const getUserInfo = asyncHandler(async (req: Request, res: Response) => {
    try {
        const userId = req.user?._id;
        const userDetails = await getUserDetailsById(userId);

        return res
            .status(200)
            .json(new ApiResponse(200, userDetails, "Details of the user fetched successfully"));

    } catch (error: any) {
        throw new ApiError(400, error?.message);
    }
});


interface ISocialAuthBody {
    email: string;
    name: string;
    avatar: string;
}

// Social auth. We'll take everything with frontend but in the backend we'll only take email, name, avatar. This route will only get hit after validation of NextAuth from frontend.
/**
 * Controller function to handle social authentication.
 * 
 * Algorithm:
 * 1. Extract email, name, and avatar from the request body.
 * 2. Sanitize the input data to prevent any potential security vulnerabilities.
 * 3. Check if a user with the provided email already exists in the database.
 * 4. If the user does not exist, create a new user with the provided email, name, and avatar.
 * 5. Generate and send tokens in the response to authenticate the user.
 * 6. If the user already exists, send tokens to authenticate the existing user.
 * 
 * @param req Express Request object containing email, name, and avatar in the request body.
 * @param res Express Response object.
 * @returns Tokens for user authentication or error response.
 */
const socialAuth = asyncHandler(async (req: Request, res: Response) => {
    try {
        const { email, name, avatar } = req.body as ISocialAuthBody;

        if (!email || !name) {
            throw new ApiError(400, 'All fields are compulsory');
        }

        const sanitizedEmail = sanitizeInput(email);
        const sanitizedName = sanitizeInput(name);
        const sanitizedAvatar = sanitizeInput(avatar);


        const existedUser = await User.findOne({ email: sanitizedEmail });
        if (!existedUser) {
            const newUser = await User.create({ email: sanitizedEmail, name: sanitizedName, avatar: sanitizedAvatar });
            await sendTokens(newUser, 200, res);
        } else {
            await sendTokens(existedUser, 200, res);
        }

    } catch (error: any) {
        throw new ApiError(400, error?.message);
    }


});


/**
 * Interface representing the request body for updating user information.
 */
interface IUpdateUserInfo {
    name?: string;
    email?: string;
}


/**
 * Controller function to update user account details.
 * 
 * Algorithm:
 * 1. Extract updated email and name from the request body.
 * 2. Retrieve the user ID from the request object.
 * 3. Find the user by ID in the database.
 * 4. If the email is provided and it already exists, throw an error.
 * 5. If the email is provided, update the user's email after sanitizing it.
 * 6. If the name is provided, update the user's name.
 * 7. Save the updated user details.
 * 8. Update the user's data in Redis.
 * 9. Send a success response indicating that the account details were updated successfully.
 * 
 * */
const updateUserNameEmailInfo = asyncHandler(async (req: Request, res: Response) => {
    try {
        const { email, name } = req.body as IUpdateUserInfo;

        //  Method 1

        const userId = req.user?._id;
        const user = await User.findById(userId);
        console.log("user from updateUserNameEmailInfo", user);

        if (email && user) {
            const isEmailExisting = await User.findOne({ email });
            if (isEmailExisting) {
                throw new ApiError(400, "Email already exists");
            }
            user.email = sanitizeInput(email);
        }

        if (name && user) {
            user.name = name;
        }

        await user?.save();
        await redis.set(userId, JSON.stringify(user));

        // Fetch the updated user from the database to send in the response
        const updatedUser = await User.findById(userId);

        // Method 2
        /* 
            const sanitizedEmail = email ? sanitizeInput(email) : undefined;
            const user = await User.findByIdAndUpdate(
                req.user?.id,
                {
                    $set: {
                        name,
                        sanitizedEmail
                    }
                },
                {
                    new: true
                }
            ).select("-password -refreshToken");
        */

        return res
            .status(200)
            .json(new ApiResponse(200, updatedUser, "Account details updated successfully"));


    } catch (error: any) {
        throw new ApiError(400, error?.message);
    }
});


interface IUPdatePassword {
    oldPassword: string;
    newPassword: string;
}

/**
 * Controller function to change the current password for a user.
 * 
 * Algorithm:
 * 1. Extract the old password and new password from the request body.
 * 2. Check if the user is authenticated. If not, throw an unauthorized error.
 * 3. Retrieve the logged-in user from the request object.
 * 4. If the logged-in user or their password is undefined, throw an error.
 * 5. Verify if the old password matches the user's current password. If not, throw an error.
 * 6. Validate the new password to ensure it is at least 6 characters long.
 * 7. Update the user's password with the new password.
 * 8. Save the user's updated password without validation.
 * 9. Send a success response indicating that the password has been updated successfully.
 * 
*/
const changeCurrentPassword = asyncHandler(async (req: Request, res: Response) => {
    const { oldPassword, newPassword } = req.body as IUPdatePassword;

    if (!oldPassword || !newPassword) {
        throw new ApiError(400, "Please enter both old and new passwords");
    }

    try {

        if (!req.user) {
            throw new ApiError(401, "User not authenticated");
        }

        const userLoggedIn = await User.findById(req.user?._id);
        console.log("userLoggedIn from changeCurrentPassword", userLoggedIn);
        if (userLoggedIn?.password == undefined) {
            throw new ApiError(400, "Invalid User");
        }

        // console.log(typeof userLoggedIn.comparePassword === 'function'); // Should print true if comparePassword is a function
        // console.log(User.schema.methods);
        // console.log(userLoggedIn.constructor.name);


        const isPasswordValid = await userLoggedIn?.comparePassword(oldPassword);
        if (!isPasswordValid) {
            throw new ApiError(400, "Incorrect old password");
        }

        if (newPassword.length < 6) {
            throw new ApiError(400, "New password must be at least 6 characters long");
        }

        userLoggedIn.password = newPassword;
        await userLoggedIn?.save({ validateBeforeSave: false });
        await redis.set(userLoggedIn._id, JSON.stringify(userLoggedIn));

        const data = {
            user: {
                name: userLoggedIn?.name,
                email: userLoggedIn?.email
            },
        };

        await sendMail({
            email: userLoggedIn.email,
            subject: "Password Updated",
            template: "password-update-mail.ejs",
            data: data
        });


        return res.status(200).json(new ApiResponse(200, {}, "Passowrd has been updated successfully."));

    } catch (error: any) {
        logger.error(error);
    }
});



interface IUpdateUserAvatar {
    avatar: string;
}

/**
 * Controller function to update the user's avatar.
 * 
 * Algorithm:
 * 1. Get the avatar image from the request body.
 * 2. Retrieve the user from the database based on the user ID.
 * 3. If the user has an existing avatar, delete it from Cloudinary.
 * 4. Upload the new avatar image to Cloudinary.
 * 5. Update the user's avatar URL in the database.
 * 6. Update the user's information in Redis.
 * 7. Send a success response with the updated user object.
 * 
 * @param req Express Request object containing the avatar image in the request body.
 * @param res Express Response object.
 * @returns Success response with the updated user object or error response.
 */
const updateUserAvatar = asyncHandler(async (req: Request, res: Response) => {
    try {
        const { avatar } = req.body as IUpdateUserAvatar;

        if (!avatar) {
            throw new ApiError(400, "Avatar image is required");
        }

        let uploadedAvatarURL;

        const user = await User.findById(req.user?._id).select("-password -refreshToken -accessToken");

        if (!user) {
            throw new ApiError(404, "User not found");
        }

        // If the user already has an avatar, delete it from Cloudinary
        if (user.avatar?.public_id) {
            await cloudinary.uploader.destroy(user.avatar.public_id);
        }

        // Upload the new avatar image to Cloudinary
        const uploadedAvatar = await cloudinary.uploader.upload(avatar, {
            folder: "lms_avatars",
            width: 150, // Set the desired width of the avatar
            resource_type: "auto"
        });

        uploadedAvatarURL = uploadedAvatar.secure_url;

        // Update the user's avatar URL in the database
        user.avatar = {
            public_id: uploadedAvatar.public_id,
            url: uploadedAvatar.secure_url
        };

        await user.save();

        // Update the user's information in Redis
        await redis.set(req.user?._id, JSON.stringify(user));

        // Send a success response with the updated user object
        return res.status(200).json(new ApiResponse(200, user, "User avatar updated successfully"));

    } catch (error: any) {
        logger.error(error);
        throw new ApiError(500, "Failed to update user avatar");
    }
});

/**
 * Controller function to fetch all users for admin dashboard.
 * @access Protected (requires authentication) and admin only 
 * 
 * Algorithm:
 * 1. Retrieve all users from the database.
 * 2. Sort the users by createdAt in descending order.
 * 3. Send a success response with the list of users.
 */
const getAllUsersForAdmin = asyncHandler(async (req: Request, res: Response) => {
    try {
        const users = await User.find().sort({ createdAt: -1 });
        return res.status(200).json(new ApiResponse(200, users, "All users fetched successfully"));
    } catch (error: any) {
        logger.error(error);
        throw new ApiError(500, "Failed to get all users");
    }
});



/**
 * Controller function to update user role.
 * @access Only admin can update user role.
 * 
 * Algorithm:
 * 1. Extract the user ID and role from the request body.
 * 2. Retrieve and update the user's role in the database.
 * 3. Send a success response with the updated user object.
*/

const updateUserRole = asyncHandler(async (req: Request, res: Response) => {
    try {
        const { userId, role } = req.body;
        const user = await User.findByIdAndUpdate(userId, { role }, { new: true }); // new: true to create a new document if it doesn't exist

        return res.status(200).json(new ApiResponse(200, user, "User role updated successfully"));

    } catch (error: any) {
        logger.error(error);
        throw new ApiError(500, "Failed to update user role");
    }
});


/**
 * Controller function to delete a user.
 * @access Only admin can delete a user.
 * 
 */
const deleteUser = asyncHandler(async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Check if the user exists in the database
        const user = await User.findById(id);

        if (!user) {
            throw new ApiError(404, "User not found");
        }

        await User.deleteOne({ _id: id });

        await redis.del(id);

        return res.status(200).json(new ApiResponse(200, "User deleted successfully"));

    } catch (error: any) {
        logger.error(error);
        throw new ApiError(500, "Failed to delete user");
    }
});


export { registerUser, activateUser, loginUser, logoutUser, updateAccessToken, getUserInfo, socialAuth, updateUserNameEmailInfo, changeCurrentPassword, updateUserAvatar, getAllUsersForAdmin, updateUserRole, deleteUser };