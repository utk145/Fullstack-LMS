import { Request, Response } from "express";
import cloudinary from "cloudinary";
import { Course } from "../models/course.models";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";

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
        // Find the course by its ID, excluding certain sensitive data from the response
        const course = await Course.findById(req.params.id).select("-courseData.videoUrl -courseData.suggestions -courseData.questions -courseData.links");

        // If the course is not found, return a 404 error
        if (!course) {
            return res.status(404).json(new ApiResponse(404, null, "Course not found."));
        }

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
        // Fetch all courses
        const courses = await Course.find().select("-courseData.videoUrl -courseData.suggestions -courseData.questions -courseData.links");

        // Send success response with the courses
        return res.status(200).json(new ApiResponse(200, courses));

    } catch (error: any) {
        // Handle errors
        console.error("Error fetching courses:", error.message);
        return res.status(500).json(new ApiError(500, "Failed to fetch courses. Please try again later."));
    }
});




export { uploadCourse, editCourse, getSingleCourse, getAllCourses };