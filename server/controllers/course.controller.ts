import { Request, Response } from "express";
import cloudinary from "cloudinary";
import { Course } from "../models/course.models";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { redis } from "../db/redis";
import mongoose from "mongoose";
import sendMail from "../utils/sendMail";

/**
 * Function to handle the upload of a course.
 * 
 * @param req Express Request object.
 * @param res Express Response object.
 * @returns Response with the uploaded course data or error response.
 */
const uploadCourse = asyncHandler(async (req: Request, res: Response) => {

    try {
        const data = req.body;

        // console.log("thumbnail data is  :", data.thumbnail, "\n full data is: ", data);
        // Check if thumbnail is provided

        if (data.thumbnail) {
            // // Ensure thumbnail is a string (path)
            // if (typeof data.thumbnail !== 'string') {
            //     throw new Error("Thumbnail must be a string representing the file path.");
            // }            

            // Upload thumbnail to Cloudinary
            const uploadedThumbnail = await cloudinary.v2.uploader.upload(data.thumbnail.url, {
                folder: "lms_courses_thumbnails"
            });

            // Update thumbnail data in the course data
            data.thumbnail = {
                public_id: uploadedThumbnail.public_id,
                url: uploadedThumbnail.secure_url
            };
        }

        // Create the course
        const course = await createCourse(data);

        res.status(201).json(new ApiResponse(201, course, "Course created successfully."));

    } catch (error: any) {
        console.error("Error uploading course:", error.message);
        res.status(500).json(new ApiResponse(500, "Failed to upload course. Please try again later."));
    }

});

/**
 * Function to create a new course in the database.
 * 
 * @param data Course data to be saved.
 * @returns Newly created course object.
 */
const createCourse = async (data: any) => {
    // Create the course in the database
    return await Course.create(data);
};



/**
 * Controller function to handle the editing of a course.
 * 
 * @param req Express Request object.
 * @param res Express Response object.
 * @returns Response with the updated course data or error response.
 */
const editCourse = asyncHandler(async (req: Request, res: Response) => {
    try {
        const data = req.body;

        // Get the course ID from the request parameters
        const courseId = req.params.id;

        // Find the existing course in the database
        const existingCourse = await Course.findById(courseId);

        // Check if the course exists
        if (!existingCourse) {
            return res.status(404).json(new ApiResponse(404, null, "Course not found."));
        }

        // Check if the thumbnail data is provided and different from the existing thumbnail
        // @ts-ignore
        if (data.thumbnail && data.thumbnail.public_id !== existingCourse.thumbnail.public_id) {
            // Destroy the old thumbnail from Cloudinary
            // @ts-ignore
            await cloudinary.v2.uploader.destroy(existingCourse.thumbnail.public_id);

            // Upload the new thumbnail to Cloudinary
            const uploadedThumbnail = await cloudinary.v2.uploader.upload(data.thumbnail.url, {
                folder: "lms_courses_thumbnails"
            });

            // Update the thumbnail data in the course data
            data.thumbnail = {
                public_id: uploadedThumbnail.public_id,
                url: uploadedThumbnail.secure_url
            };
        }

        // Update the course data in the database
        const updatedCourse = await Course.findByIdAndUpdate(
            courseId,
            { $set: data },
            { new: true }
        );

        // Send success response with the updated course data
        res.status(200).json(new ApiResponse(200, updatedCourse, "Course updated successfully."));
    } catch (error: any) {
        // Handle errors
        console.error("Error editing course:", error.message);
        res.status(500).json(new ApiResponse(500, null, "Failed to edit course. Please try again later."));
    }
});



/**
 * Controller function to fetch details of a single course without requiring purchase.
 * Everyone should be able to access this route
 * @returns Response with the details of the requested course or error response.
 */
const getSingleCourse = asyncHandler(async (req: Request, res: Response) => {
    try {

        const courseId = req.params.id;
        const isRedisCached = await redis.get(courseId);
        if (isRedisCached) {
            const course = JSON.parse(isRedisCached);
            return res.status(200).json(new ApiResponse(200, course));
        }

        // Find the course by its ID, excluding certain sensitive data from the response
        const course = await Course.findById(req.params.id).select("-courseData.videoUrl -courseData.suggestions -courseData.questions -courseData.links");

        // If the course is not found, return a 404 error
        if (!course) {
            return res.status(404).json(new ApiResponse(404, null, "Course not found."));
        }
        await redis.set(courseId, JSON.stringify(course));
        // Send success response with the course details
        return res.status(200).json(new ApiResponse(200, course));

    } catch (error: any) {
        // Handle errors
        console.error("Error fetching course:", error.message);
        return res.status(500).json(new ApiError(500, "Failed to fetch course. Please try again later."));
    }
});



/**
 * Controller function to fetch details of all courses without requiring purchase.
 * Everyone should be able to access this route.
 * @returns Response with the details of all courses or error response.
 */
const getAllCourses = asyncHandler(async (req: Request, res: Response) => {
    try {
        // Check if courses are cached in Redis
        const isRedisCached = await redis.get("allCourses");
        if (isRedisCached) {
            const courses = JSON.parse(isRedisCached);
            // console.log("hitting redis");
            return res.status(200).json(new ApiResponse(200, courses));
        }

        // console.log("hitting mongo");

        // If not cached, fetch all courses from the database
        const courses = await Course.find().select("-courseData.videoUrl -courseData.suggestions -courseData.questions -courseData.links");

        // Cache the fetched courses in Redis
        await redis.set("allCourses", JSON.stringify(courses));

        // Send success response with the courses
        return res.status(200).json(new ApiResponse(200, courses));

    } catch (error: any) {
        // Handle errors
        console.error("Error fetching courses:", error.message);
        return res.status(500).json(new ApiError(500, "Failed to fetch courses. Please try again later."));
    }
});


/**
 * Controller function to fetch the content of a course accessible by a user.
 * 
 * @param req Express Request object.
 * @param res Express Response object.
 * @returns Response with the content of the accessible course or error response.
 */
const getCourseAccessibleByUser = asyncHandler(async (req: Request, res: Response) => {
    try {
        // Get the list of courses accessible by the user from the request object
        const userCoursesList = req.user?.courses;

        // Extract the course ID from the request parameters
        const courseId = req.params.id;

        // Check if the course exists in the user's list of accessible courses
        const isCourseExists = userCoursesList?.find((course: any) => course?._id.toString() === courseId);

        // If the course is not found in the user's accessible courses, throw a 404 error
        if (!isCourseExists) {
            throw new ApiError(404, "Dear user, you aren't eligible to access this course.")
        }

        // Find the course by its ID and Extract the course content
        const course = await Course.findById(courseId);
        const courseContent = course?.courseData;

        // Send success response with the course content
        return res
            .status(200)
            .json(new ApiResponse(200, courseContent, "Course content fetched successfully"));

    } catch (error: any) {
        console.error("Error checking course accessibility:", error.message);
        return res.status(500).json(new ApiError(500, "Failed to check course accessibility. Please try again later."));
    }
});

/**
 * Interface representing the structure of the add question request body.
 */
interface IAddQuestion {
    question: string;
    courseId: string;
    contentId: string;
}

/**
 * Controller function to add a question to a course's content.
 * */
const addQuestion = asyncHandler(async (req: Request, res: Response) => {
    try {
        const { contentId, courseId, question } = req.body as IAddQuestion;
        // console.log("contentId", contentId, "courseId", courseId, "question", question);

        // Check if the course exists
        const courseExists = await Course.findById(courseId);
        // console.log(courseExists); // debug-purpose


        if (!courseExists) {
            throw new ApiError(404, "Course not found");
        }

        // Ensure the content ID is a valid MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(contentId)) {
            throw new ApiError(400, "Invalid contentId");
        }

        //   Locate the course content within the course's data array that matches the provided content ID
        const courseContent = courseExists?.courseData?.find((course: any) => course._id.equals(contentId));
        if (!courseContent) {
            throw new ApiError(400, "Invalid contentId");
        }
        // console.log("\n\n courseContent:\n",courseContent); // debug-purpose

        // create  a new question object
        const newQuestion: any = {
            comment: question,
            user: req.user,
            commentReplies: [],
        }

        // add this question to courseContent
        courseContent.questions.push(newQuestion);

        await courseExists.save();
        // console.log(courseContent);

        // const upodatedcourseExists = await Course.findById(courseId); // debug-purpose
        // console.log("\n\n upodatedcourseExists:\n",upodatedcourseExists); // debug-purpose


        return res.status(201).json(new ApiResponse(201, newQuestion, "Question added successfully"));


    } catch (error: any) {
        throw new ApiError(500, error?.message);
    }
});



/**
 * Interface representing the structure of the add answer request body.
 */
interface IAddAnswer {
    courseId: string;
    contentId: string;
    questionId: string;
    answer: string;

}

/**
 * Controller function to add an answer/reply to a specific question in a course's content.
 * @route POST /api/v1/courses/reply-to-question
 * @access Protected (requires authentication)
 * 
*/
const replyToQuestion = asyncHandler(async (req: Request, res: Response) => {
    try {
        const { courseId, contentId, questionId, answer } = req.body as IAddAnswer;

        // Step 1: Validate the input fields
        // Check if any of the required fields are empty or contain only whitespace
        if ([courseId, contentId, questionId, answer].some((item) => item?.trim() === "")) {
            throw new ApiError(400, "All fields are compulsory..");
        }

        // Step 2: Check if the course exists
        // Retrieve the course document from the database using the provided course ID
        const courseExists = await Course.findById(courseId);

        if (!courseExists) {
            throw new ApiError(404, "Course not found");
        }

        // Step 3: Validate the content ID
        // Ensure the content ID is a valid MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(contentId)) {
            throw new ApiError(400, "Invalid contentId");
        }

        // Step 4: Find the specific course content by its ID
        // Locate the course content within the course's data array that matches the provided content ID
        const courseContent = courseExists?.courseData?.find((course: any) => course._id.equals(contentId));
        if (!courseContent) {
            throw new ApiError(400, "Invalid contentId");
        }

        // Step 5: Find the specific question by its ID
        const questionToReply = courseContent?.questions?.find((item: any) => item?._id.equals(questionId));
        if (!questionToReply) {
            throw new ApiError(400, "Invalid questionId");
        }

        //  // Step 6: Create a new answer object
        const newAnswer: any = {
            user: req.user,
            answer,
        }

        // Step 7: Add the new answer to the question's replies
        // Append the new answer to the commentReplies array of the located question
        questionToReply.commentReplies?.push(newAnswer);

        // Step 8: Save the updated course document
        // Persist the changes to the course document in the database
        await courseExists.save();

        // Step 9: Send notifications if applicable
        const user = req?.user;
        if (user && user?._id === questionToReply.user?._id) {
            // TODO: create a notification
            // If the user replying is the same as the user who asked the question, create a notification (TODO)
        } else {
            // If an admin or another user is replying, send an email notification to the original question asker

            const data = {
                name: questionToReply.user.name,
                email: questionToReply.user.email,
                postTitle: questionToReply.comment,
            };

            try {
                user && await sendMail({
                    data,
                    // email: user?.email,
                    email: questionToReply?.user?.email,
                    subject: "You've received replies",
                    template: "question-reply.ejs"
                })
                    .then(() => console.log("mail sennt"))
                    .catch(() => console.log("mail not sennt"))

            } catch (error: any) {
                console.error('Failed to send email because:', error);
            }
        }


        // Step 10: Send a success response with the updated course data
        const course = await Course.findById(courseId);

        return res.status(200).json(new ApiResponse(200, course, "New replies received"));

    } catch (error: any) {
        throw new ApiError(500, error?.message);
    }
});



/**
 * @description Adds a review to a course by a user who has enrolled in the course.
 * @route POST /api/v1/courses/add-review/:id
 * @access Protected (requires authentication)
 */
const addReviewInCourse = asyncHandler(async (req: Request, res: Response) => {
    try {
        const userCoursesList = req.user?.courses;
        const courseId = req.params.id;

        /* Theres no point in checking if the course is valid, rather it should be valid or accessible from the user's enrolled courses.
                const courseExists = await Course.findById(courseId);
                if (!courseExists) {
                    throw new ApiError(400, "Course not found!");
                }
        */

        // check if courseId exists in userCoursesList based on _id
        const courseExists = userCoursesList?.some((item: any) => item._id.toString() === courseId.toString());
        if (!courseExists) {
            throw new ApiError(400, `Dear user, you aren't eligible to make a review on this course.`);
        }

        // Fetch the course from the database
        const course = await Course.findById(courseId);

        const { review, rating } = req.body;

        // Validate the review and rating
        if (!review || typeof review !== 'string') {
            throw new ApiError(400, "Review must be a valid string");
        }

        if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
            throw new ApiError(400, "Rating must be a number between 1 and 5");
        }

        // Create a new review object
        const newReview: any = {
            user: req.user,
            comment: review,
            rating: rating,
        };

        // Add the new review to the course's reviews
        course?.reviews.push(newReview);

        let total = 0;
        course?.reviews.forEach((rev: any) => {
            total += rev.rating;
        });

        // console.log("before", course?.ratings);

        if (course) {
            course.ratings = total / course?.reviews.length;
            // example: we've two reviews, one is 5 and other 4, then the rating calculates to be 5 + 4  / 2 = 4.5  
        }

        // Save the updated course document
        await course?.save();

        // console.log("after", course?.ratings);

        // Prepare a notification object (to be implemented)
        const notification = {
            title: "New review received",
            message: `${req.user?.name} has given a review in course ${course?.name} }`,
        };

        // TODO: create a notification

        // Return a success response with the updated course data
        return res.status(200).json(new ApiResponse(200, course));


    } catch (error: any) {
        // Handle errors and return a 500 Internal Server Error response
        throw new ApiError(500, error?.message);
    }
});



/**
 * Interface for adding a reply to a review.
 */
interface IAddReplyReview {
    comment: string;
    courseId: string;
    reviewId: string;
}

/**
 * @description Adds a reply to a review in a course.
 * @access Protected (requires authentication)
 */
const addReplyToReviews = asyncHandler(async (req: Request, res: Response) => {

    try {
        const { comment, courseId, reviewId } = req.body as IAddReplyReview;

        // Validate request data
        if (!comment || !courseId || !reviewId) {
            throw new ApiError(400, "All fields (comment, courseId, reviewId) are required");
        }

        // Ensure the courseId is a valid MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(courseId)) {
            throw new ApiError(400, "Invalid courseId");
        }

        // Ensure the reviewId is a valid MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(reviewId)) {
            throw new ApiError(400, "Invalid reviewId");
        }


        const course = await Course.findById(courseId);
        if (!course) {
            throw new ApiError(404, "Course not found");
        }

        const review = course?.reviews?.find((item: any) => item._id.toString() === reviewId);
        if (!review) {
            throw new ApiError(404, "Review not found");
        }

        // Create a new comment reply object
        const newCommentReply: any = {
            user: req.user,
            comment,
        };

        // Initialize the commentReplies array if it doesn't exist
        if (!review?.commentReplies) {
            review.commentReplies = [];
        }

        // Add the new comment reply to the review's commentReplies array
        review?.commentReplies?.push(newCommentReply);

        await course.save()

        return res.status(200).json(new ApiResponse(200, "Replied successfully!"));

    } catch (error: any) {
        // Handle errors and return a 500 Internal Server Error response
        throw new ApiError(500, error?.message);
    }

});

export { uploadCourse, editCourse, getSingleCourse, getAllCourses, getCourseAccessibleByUser, addQuestion, replyToQuestion, addReviewInCourse, addReplyToReviews };