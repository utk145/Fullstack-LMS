import { NextFunction, Request, Response } from "express";

/**
 * A middleware wrapper for handling asynchronous Express route handlers.
 * @param functionToPerform The asynchronous function to execute.
 * @returns Express middleware function.
 */
const asyncHandler = (functionToPerform: any) => {
    return (req: Request, res: Response, next: NextFunction) => {
        // Execute the asynchronous function and handle any errors
        Promise
            .resolve(functionToPerform(req, res, next))
            .catch((err) => next(err));
    };
};

export { asyncHandler };