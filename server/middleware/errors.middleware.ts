import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError";

/**
 * Error handling middleware for Express applications.
 * @param err The error object.
 * @param req The Express request object.
 * @param res The Express response object.
 * @param next The next middleware function.
 */

// Reference:  https://nodejs.org/api/errors.html

export const ErrorsMiddleware = (err: any, req: Request, res: Response, next: NextFunction) => {
    // Set default status code and message for the error
    err.statusCode = err.statusCode || 500;
    err.message = err.message || "Internal Server Error";

    // Handle specific error cases

    // Incorrect MongoDB request id
    if (err.name === "CastError") {
        const message = `Resource not found. Invalid ${err.path}`;
        err = new ApiError(400, message);
    }

    // Duplicate key error
    if (err.code === 11000) {
        const message = `Duplicate ${Object.keys(err.keyValue)} entered`;
        err = new ApiError(400, message);
    }

    // JsonWebTokenError handling
    if (err.name === "JsonWebTokenError") {
        const message = "Your JSON Web Token is invalid. Please try again later.";
        err = new ApiError(400, message);
    }

    // TokenExpiredError handling
    if (err.name === "TokenExpiredError") {
        const message = "Your JSON Web Token has expired. Please try again later.";
        err = new ApiError(400, message);
    }

    // Send the error response
    res.status(err.statusCode).json({
        success: false,
        error: {
            statusCode: err.statusCode,
            message: err.message
        }
    });
}
