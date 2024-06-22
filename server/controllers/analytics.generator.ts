import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import logger from "../utils/logging/logger";
import { ApiError } from "../utils/ApiError";
import { generateLast12MonthsData } from "../services/analytics/analytics.generator";
import { ApiResponse } from "../utils/ApiResponse";


/**
 * Retrieves analytics data for the last 12 months based on the specified model.
 * Uses the generateLast12MonthsData service function to compute monthly counts.
 * @param model The Mongoose model to query.
 */
const getAnalytics = (model: any) => asyncHandler(async (req: Request, res: Response) => {
    try {
        const data = await generateLast12MonthsData(model);

        return res.status(200).json(new ApiResponse(200, data, "Successfully generated analytics"));

    } catch (error: any) {
        logger.error(error);
        throw new ApiError(500, error?.message);
    }
});

export { getAnalytics };