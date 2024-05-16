import { Request, Response } from "express";
import cloudinary from "cloudinary";
import { Course } from "../models/course.models";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { redis } from "../db/redis";
import mongoose from "mongoose";

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


interface IAddQuestion {
    question: string;
    courseId: string;
    contentId: string;
}

const addQuestion = asyncHandler(async (req: Request, res: Response) => {
    try {
        const { contentId, courseId, question } = req.body as IAddQuestion;
        // console.log("contentId", contentId, "courseId", courseId, "question", question);

        const courseExists = await Course.findById(courseId);
        // console.log(courseExists); // debug-purpose
        

        if (!courseExists) {
            throw new ApiError(404, "Course not found");
        }

        if (!mongoose.Types.ObjectId.isValid(contentId)) {
            throw new ApiError(400, "Invalid contentId");
        }

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

export { uploadCourse, editCourse, getSingleCourse, getAllCourses, getCourseAccessibleByUser, addQuestion };