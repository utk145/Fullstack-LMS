import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import logger from "../utils/logging/logger";
import { ApiError } from "../utils/ApiError";
import { generateLast12MonthsData } from "../services/analytics/analytics.generator";
import { User } from "../models/user.models";
import { ApiResponse } from "../utils/ApiResponse";
import { Course } from "../models/course.models";
import { Order } from "../models/order.models";

/**
 * Retrieves analytics data for the last 12 months based on user data.
 * Uses the generateLast12MonthsData service function to compute monthly counts.
 * @access Protected(requires authentication) and admin-only
 */
const getUsersAnalytics = asyncHandler(async (req: Request, res: Response) => {
    try {
        const users = await generateLast12MonthsData(User);

        return res.status(200).json(new ApiResponse(200, users, "Successfully generated analytics"));
        // The result will be the count of accounts created in the previous months.

    } catch (error: any) {
        logger.error(error);
        throw new ApiError(500, error?.message)
    }
});



const getCoursesAnalytics = asyncHandler(async (req: Request, res: Response) => {
    try {
        const courses = await generateLast12MonthsData(Course);

        return res.status(200).json(new ApiResponse(200, courses, "Successfully generated analytics"));


    } catch (error: any) {
        logger.error(error);
        throw new ApiError(500, error?.message)
    }
});


const getOrdersAnalytics = asyncHandler(async (req: Request, res: Response) => {
    try {
        const orders = await generateLast12MonthsData(Order);

        return res.status(200).json(new ApiResponse(200, orders, "Successfully generated analytics"));


    } catch (error: any) {
        logger.error(error);
        throw new ApiError(500, error?.message)
    }
});



export { getUsersAnalytics, getCoursesAnalytics, getOrdersAnalytics };