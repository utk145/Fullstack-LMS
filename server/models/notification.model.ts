import mongoose, { Document, Model } from "mongoose";

/**
 * Interface for Notification document.
 */
export interface INotification extends Document {
    title: string;
    message: string;
    status: string;
    userId: string;
};

/**
 * Mongoose schema for Notification.
 */
const notificationSchema = new mongoose.Schema<INotification>({
    title: {
        type: String,
        required: true,
    },
    message: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        required: true,
        default: "unread"
    },
    userId: {
        type: String,
        required: true,
    },
}, { timestamps: true });


/**
 * Mongoose model for Notification.
 */
export const Notification: Model<INotification> = mongoose.model("Notification", notificationSchema);