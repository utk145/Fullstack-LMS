import { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import jwt from "jsonwebtoken";
import { redis } from "../db/redis";


/**
 * Middleware function to verify the validity of a JWT access token.
 * 
 * Algorithm:
 * 1. Get the access token from cookies or headers.
 * 2. If the token is not present, throw an unauthorized error.
 * 3. Verify the access token.
 * 4. If the token is invalid, throw an error.
 * 5. Retrieve the user from Redis based on the decoded token info.
 * 6. If the user is not found or the token is invalid, throw an unauthorized error.
 * 7. Attach the user information to the request object.
 * 
 * @param req Express Request object.
 * @param res Express Response object.
 * @param next Express NextFunction object.
 * @returns Unauthorized error or proceeds to the next middleware.
 */
export const verifyJWT = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {

        // Get the access token from cookies or headers
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
        if (!token) {
            throw new ApiError(401, "Unauthorized request");
        }

        // Verify the access token
        const decodedTokenInfo: any = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET! as string);

        if (!decodedTokenInfo) {
            throw new ApiError(400, "Invalid access token info");
        }


        // Retrieve the user from Redis based on the decoded token info
        const user = await redis.get(decodedTokenInfo?._id);

        if (!user) {
            throw new ApiError(401, "Invalid user access or invalid token");
        }


        // Attach the user information to the request object
        req.user = JSON.parse(user);


        next();
    } catch (error: any) {
        throw new ApiError(401, error?.message || "Invalid access token")
    }
})