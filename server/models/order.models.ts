import mongoose, { Model } from "mongoose";

/**
 * Interface for Order document.
 */
export interface IOrder extends Document {
    courseId: string;
    userId: string;
    payment_info?: object;
}


/**
 * Mongoose schema for Order.
 */
const orderSchema = new mongoose.Schema<IOrder>({
    courseId: {
        type: String,
        required: true,
    },
    userId: {
        type: String,
        required: true,
    },
    payment_info: {
        type: Object,
        // required:true,
    },
}, { timestamps: true });


/**
 * Mongoose model for Order.
 */
export const Order: Model<IOrder> = mongoose.model("Order", orderSchema);