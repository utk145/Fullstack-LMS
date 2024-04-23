// import { User } from "../models/user.models";
// import { ApiError } from "../utils/ApiError";


// /**
//  * Function to fetch user details by user ID.
//  * 
//  * Algorithm:
//  * 1. Find the user by user ID using the User model.
//  * 2. Select user details excluding password and refresh token.
//  * 3. If user details are not found, throw a not found error.
//  * 4. Return the user details.
//  * 
//  * @param id User ID.
//  * @returns User details excluding password and refresh token.
//  */
// const getUserDetailsById = async (id: string) => {
//     console.log("id from getUserDetailsById", id);

//     const userDetails = await User.findById(id).select("-password -refreshToken");
//     console.log("userDetails from getUserDetailsById", userDetails);

//     if (!userDetails) {
//         throw new ApiError(404, `User credentials not found for given userId:- ${id}`);
//     }

//     return userDetails;
// }


// export { getUserDetailsById };






import { redis } from "../db/redis";
import { User } from "../models/user.models";
import { ApiError } from "../utils/ApiError";


/**
 * Function to fetch user details by user ID.
 * 
 * Algorithm:
 * 1. Check if user details exist in Redis cache.
 * 2. If user details are found in the cache, return them directly.
 * 3. If user details are not found in the cache, fetch them from the database.
 * 4. Save the fetched user details to the Redis cache.
 * 5. Return the user details.
 * 
 * @param id User ID.
 * @returns User details excluding password and refresh token.
 */
const getUserDetailsById = async (id: string) => {
    console.log("id from getUserDetailsById", id);

    // Check if user details exist in Redis cache
    const cachedUserDetails = await redis.get(id);
    if (cachedUserDetails) {
        console.log("User details found in Redis cache");
        return JSON.parse(cachedUserDetails);
    }

    // If user details are not found in Redis cache, fetch them from the database
    const userDetails = await User.findById(id).select("-password -refreshToken");
    console.log("userDetails from getUserDetailsById", userDetails);

    if (!userDetails) {
        throw new ApiError(404, `User credentials not found for given userId:- ${id}`);
    }

    // Save the fetched user details to the Redis cache
    await redis.set(id, JSON.stringify(userDetails));

    return userDetails;
};


export { getUserDetailsById };