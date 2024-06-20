import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";
import { IOrder, Order } from "../models/order.models";
import { User } from "../models/user.models";
import { Course } from "../models/course.models";
import sendMail from "../utils/sendMail";
import { Notification } from "../models/notification.model";
import logger from "../utils/logging/logger";


/**
 * Creates a new order for a course.
 * @access Protected (requires authentication)
 */
const createOrder = asyncHandler(async (req: Request, res: Response) => {
    try {
        const { courseId, payment_info } = req.body as IOrder;

        // Retrieve the user by ID
        const user = await User.findById(req.user?._id);

        // Check if the user has already purchased the course
        const coursePurchaseExists = user?.courses.some((course: any) => course._id.toString() === courseId);
        if (coursePurchaseExists) {
            throw new ApiError(400, "Dear user, you've already purchased this course.")
        }
        // console.log(coursePurchaseExists); // debug purpose

        // Find the course by ID
        const course = await Course.findById(courseId);
        if (!course) {
            throw new ApiError(400, "Course does not exist.")
        }

        // Create order data
        const data: any = {
            courseId: course?._id,
            userId: user?._id,
            payment_info
        };

        // Create the order
        const order = await Order.create(data);

        // to send a confirmation mail to the user regarding order creation
        const mailData = {
            order: {
                _id: course._id.toString().slice(0, 6),
                name: course.name,
                price: course.price,
                date: new Date().toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                }),
            },
        };

        try {
            user && await sendMail({
                data: mailData,
                subject: "Order Confirmation",
                template: "order-confirmation.ejs",
                email: user?.email,
            })
                .then(() => console.log("mail sennt for order confirmation."))
                .catch(() => console.log("mail not sennt for order confirmation."))
        } catch (error: any) {
            console.error('Failed to send email because:', error);
        }


        // Add the purchased course to the user's courses list
        user?.courses.push(course?._id);
        await user?.save();

        // Create a notification for the user
        await Notification.create({
            userId: user?._id,
            title: "New Order Confirmation",
            message: `You've obtained a new order from ${user?.name} for the course ${course?.name} `,
        });

        // Increment the purchases count for the course
        if (course.purchases) {
            course.purchases += 1;
        } else {
            course.purchases = 1;
        }
        await course?.save();

        // Send success response with the order details
        return res.status(201).json(new ApiResponse(201, { order: course }, "Order created"))

    } catch (error: any) {
        throw new ApiError(500, error?.message);
    }
});

/**
 * Controller function to fetch all orders for admin dashboard.
 * @access Protected (requires authentication) and admin only
 */
const getAllOrdersForAdmin = asyncHandler(async (req: Request, res: Response) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        return res.status(200).json(new ApiResponse(200, orders));
    } catch (error: any) {
        logger.error(error);
        throw new ApiError(500, error?.message);
    }
});

export { createOrder, getAllOrdersForAdmin };