import e, { Response } from "express";
import { IUser, User } from "../models/user.models";
import { ApiError } from "./ApiError";
import { redis } from "../db/redis";
import { ApiResponse } from "./ApiResponse";

interface ITokenOptions {
    expires: Date;
    maxAge: number;
    httpOnly: boolean;
    sameSite: "lax" | "strict" | "none" | undefined;
    secure?: boolean;
}


/**
 * Sends access and refresh tokens in HTTP cookies upon successful user login.
 * @param user The authenticated user object.
 * @param statusCode The HTTP status code to be returned in the response.
 * @param res The Express response object to set cookies and send the response.
 * @throws {ApiError} If the user is not found or token generation fails.
 */
const sendTokens = async (user: IUser, statusCode: number, res: Response) => {


    // Step 1: Check if user exists
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    try {
        // Step 2: Generate tokens
        const accessToken = user.generateAccessToken() as string;
        const refreshToken = user.generateRefreshToken() as string;

        // upload session to redis when user will successfully login then we'll cache the session to redis

        redis.set(user?._id, JSON.stringify(user) as any);

        // Step 3: Define token expiry options
        const accessTokenExpiry = parseInt(process.env.ACCESS_TOKEN_EXPIRY! as string || '300', 10);
        const refreshTokenExpiry = parseInt(process.env.REFRESH_TOKEN_EXPIRY! as string || '1200', 10);

        const accessExpires = new Date();
        accessExpires.setSeconds(accessExpires.getSeconds() + accessTokenExpiry);
        const refreshExpires = new Date();
        refreshExpires.setSeconds(refreshExpires.getSeconds() + refreshTokenExpiry);

        // Step 4: Define options for cookies
        const accessTokenOptions: ITokenOptions = {
            expires: accessExpires,
            maxAge: accessTokenExpiry * 1000, // Convert seconds to milliseconds
            httpOnly: true,
            sameSite: "lax",
            secure: process.env?.NODE_ENV === 'production' ? true : false // Enable secure flag in production
        }; // these options so that cookies could be modified only from the server, because they are by default modifiable by client

        const refreshTokenOptions: ITokenOptions = {
            expires: refreshExpires,
            maxAge: refreshTokenExpiry * 1000, // Convert seconds to milliseconds
            httpOnly: true,
            sameSite: "lax",
            secure: process.env?.NODE_ENV === 'production' ? true : false // Enable secure flag in production
        }; // these options so that cookies could be modified only from the server, because they are by default modifiable by client



        // Step 5: Send tokens in response cookies
        res.cookie('accessToken', accessToken, accessTokenOptions);
        res.cookie('refreshToken', refreshToken, refreshTokenOptions);



        const loggedInUser = await User.findById(user.id).select("-password -refreshToken");

        // Step 6: Send response with tokens
        return res.status(statusCode).json(new ApiResponse(statusCode, { accessToken, refreshToken, loggedInUser }, "User logged in successfully!"));

    } catch (error: any) {
        throw new ApiError(500, `Token generation failed due to ${error?.message}`);
    }


}



export { sendTokens };