import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { IUser, User } from "../models/user.models";
import { ApiError } from "../utils/ApiError";
import jwt, { Secret } from "jsonwebtoken";
import ejs from "ejs";
import path from "path";
import sendMail from "../utils/sendMail";
import { ApiResponse } from "../utils/ApiResponse";

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

    if (!email) {
        throw new ApiError(400, "Email is mandatory to proceed");
    }

    const existedUser = await User.findOne({ email });
    if (!existedUser) {
        throw new ApiError(400, "User doesn't exist");
    }

    const isPasswordCorrect = await existedUser.comparePassword(password);
    if (!isPasswordCorrect) {
        throw new ApiError(401, "Entered password isn't a valid credential");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(existedUser?.id)

    const loggedInUser = await User.findById(existedUser.id).select("-password -refreshToken");

    const httpsOptions = {
        httpOnly: true,
        secure: true
    }; // these options so that cookies could be modified only from the server, because they are by default modifiable by client


    return res.status(200)
        .cookie("accessToken", accessToken, httpsOptions)
        .cookie("refreshToken", refreshToken, httpsOptions)
        .json(new ApiResponse(200, { user: loggedInUser, accessToken, refreshToken }, "User logged in successfully!"));

});


/**
 * Function to generate access and refresh tokens for a user.
 * @param userId The ID of the user.
 * @returns Object containing the access token and refresh token.
 */
const generateAccessAndRefreshToken = async (userId: any) => {
    try {
        const user = await User.findById(userId);

        // Step 1: Check if user exists
        if (!user) {
            throw new ApiError(404, "User not found");
        }

        // Step 2: Generate tokens
        const accessToken = user.generateAccessToken() as string;
        const refreshToken = user.generateRefreshToken() as string;

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error: any) {
        throw new ApiError(500, "Something went wrong while generating access and refresh tokens.. ")
    }
}

export { registerUser, activateUser, loginUser };