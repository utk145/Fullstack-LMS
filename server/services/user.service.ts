import { User } from "../models/user.models";
import { ApiError } from "../utils/ApiError";


/**
 * Function to fetch user details by user ID.
 * 
 * Algorithm:
 * 1. Find the user by user ID using the User model.
 * 2. Select user details excluding password and refresh token.
 * 3. If user details are not found, throw a not found error.
 * 4. Return the user details.
 * 
 * @param id User ID.
 * @returns User details excluding password and refresh token.
 */
const getUserDetailsById = async (id: string) => {
    console.log("id from getUserDetailsById", id);
    
    const userDetails = await User.findById(id).select("-password -refreshToken");
    console.log("userDetails from getUserDetailsById", userDetails);

    if (!userDetails) {
        throw new ApiError(404, `User credentials not found for given userId:- ${id}`);
    }

    return userDetails;
}


export { getUserDetailsById };