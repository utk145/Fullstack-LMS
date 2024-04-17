import { Request } from "express";
import { IUser } from "../models/user.models";

/**
 * Extends the Express Request object to include a user property representing the authenticated user.
 */
declare global {
    namespace Express {
        interface Request {
            user?: IUser; // Define the user property
        }
    }
}