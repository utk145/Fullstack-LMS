import mongoose, { Document } from "mongoose";

/**
 * Interface representing a comment within a course.
 */
interface IComment extends Document {
    user: object;
    comment: string;
    commentReplies?: IComment[];
}

/**
 * Interface representing a review within a course.
 */
interface IReview extends Document {
    user: object;
    rating: number;
    comment: string;
    commentReplies: IComment[]; // Only admin can reply. Need to validate from frontend
}

/**
 * Interface representing a link related to a course.
 */
interface ILink extends Document {
    title: string;
    url: string;
}

/**
 * Interface representing the data associated with a course.
 */
interface ICourseData extends Document {
    title: string;
    description: string;
    videoUrl: string;
    // videoThumbnail: object;
    videoSection: string;
    videoDuration: number;
    videoPlayer: string;
    links: ILink[];
    suggestions: string;
    questions: IComment[];
}

/**
 * Interface representing a course.
 */
export interface ICourse extends Document {
    name: string;
    description: string;
    price: number;
    estimatedPrice?: number;
    thumbnail: object;
    tags: string;
    level: string;
    demoUrl: string;
    benefits: { title: string }[];
    prerequisites: { title: string }[];
    reviews: IReview[];
    courseData: ICourseData[];
    ratings?: number;
    purchases?: number;
}

// Define the schema for reviews
const reviewSchema = new mongoose.Schema<IReview>({
    user: Object,
    rating: {
        type: Number,
        default: 0,
    },
    comment: String,
});

// Define the schema for links
const linkSchema = new mongoose.Schema<ILink>({
    title: String,
    url: String,
});

// Define the schema for comments
const commentSchema = new mongoose.Schema<IComment>({
    user: Object,
    comment: String,
    commentReplies: [Object],
});

// Define the schema for course data
const courseDataSchema = new mongoose.Schema<ICourseData>({
    videoUrl: String,
    // videoThumbnail: Object,
    title: String,
    videoSection: String,
    description: String,
    videoPlayer: String,
    videoDuration: Number,
    links: [linkSchema],
    suggestions: String,
    questions: [commentSchema],
});

// Define the schema for courses
const courseSchema = new mongoose.Schema<ICourse>({
    name: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
    estimatedPrice: Number,
    thumbnail: {
        public_id: {
            type: String,
            // required: true,
        },
        url: {
            type: String,
            // required: true,
        },
    },
    tags: {
        type: String,
        required: true,
    },
    level: {
        type: String,
        required: true,
    },
    demoUrl: {
        type: String,
        required: true,
    },
    benefits: [{ title: String }],
    prerequisites: [{ title: String }],
    reviews: [reviewSchema],
    courseData: [courseDataSchema],
    ratings: {
        type: Number,
        default: 0,
    },
    purchases: {
        type: Number,
        default: 0,
    },
});

// Export the Course model
export const Course = mongoose.model<ICourse>("Course", courseSchema);
