import { Request, Response } from "express";
import cloudinary from "cloudinary";
import { Course } from "../models/course.models";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";

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

        // Check if thumbnail is provided
        if (data.thumbnail) {
            // Delete the old thumbnail from Cloudinary
            await cloudinary.v2.uploader.destroy(data.thumbnail.public_id);

            // Upload the new thumbnail to Cloudinary
            const uploadedThumbnail = await cloudinary.v2.uploader.upload(data.thumbnail.url, {
                folder: "lms_courses_thumbnails"
            });

            // Update thumbnail data in the course data
            data.thumbnail = {
                public_id: uploadedThumbnail.public_id,
                url: uploadedThumbnail.secure_url
            };
        }

        const courseId = req.params.id;

        // Update the course in the database
        const updatedCourse = await Course.findByIdAndUpdate(
            courseId,
            { $set: data },
            { new: true }
        );

        // Check if the course was found and updated
        if (!updatedCourse) {
            // If the course was not found, return a 404 error
            return res.status(404).json(new ApiResponse(404, null, "Course not found."));
        }

        // Send success response with the updated course data
        res.status(200).json(new ApiResponse(200, updatedCourse, "Course updated successfully."));
    } catch (error: any) {
        // Handle errors
        console.error("Error editing course:", error.message);
        res.status(500).json(new ApiResponse(500, null, "Failed to edit course. Please try again later."));
    }
});



export { uploadCourse, editCourse };
