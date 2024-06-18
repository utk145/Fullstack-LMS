import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { Notification } from "../models/notification.model";
import { ApiError } from "../utils/ApiError";
import logger from "../utils/logging/logger";
import { ApiResponse } from "../utils/ApiResponse";


/**
 * Controller function to fetch all notifications.
 * @access Protected (requires authentication) - only for admins
 * @returns Response with the list of notifications or error response.
 */
const getAllNotifications = asyncHandler(async (req: Request, res: Response) => {
    try {
        const notifications = await Notification.find().sort({ createdAt: -1 }); // sort by createdAt in descending order
        return res
            .status(200)
            .json(new ApiResponse(200, notifications, "Notifications fetched successfully"));

    } catch (error: any) {
        logger.error(error);
        throw new ApiError(500, error?.message);
    }
});


/**
 * Controller function to update the status of a notification.
 * @access Protected (requires authentication) - only for admins
 * @returns Response with the updated notification or error response.
 */
const updateNotificationStatus = asyncHandler(async (req: Request, res: Response) => {
    try {
        const notificationId = req.params.id;
        if (!notificationId || typeof notificationId !== "string") {
            throw new ApiError(400, "Notification ID is required");
        }

        const notification = await Notification.findById(notificationId);
        if (!notification) {
            throw new ApiError(404, "Notification not found");
        } else {
            notification?.status ? notification.status = "read" : notification.status;
        }

        await notification.save();

        const notifications = await Notification.find().sort({ createdAt: -1 }); // sort by createdAt in descending order

        return res
            .status(200)
            .json(new ApiResponse(200, notifications));
        // we are returning the updated notifications because we have to update the frontend state also 

    } catch (error: any) {
        logger.error(error);
        throw new ApiError(500, error?.message);
    }
});


export { getAllNotifications, updateNotificationStatus };