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


export { registerUser };