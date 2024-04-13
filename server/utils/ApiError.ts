import { ErrorsMiddleware } from "../middleware/errors.middleware";

/**
 * @description Common Error class to throw an error from anywhere.
 * The {@link ErrorsMiddleware} middleware will catch this error at the central place and it will return an appropriate response to the client
 * Represents an API error with a specific status code, message, and optional errors array.
 */

class ApiError extends Error {
    /**
     * HTTP status code of the error response.
     */
    statusCode: number;

    /**
     * Array of additional error details.
     */
    errors: any[];

    /**
     * Indicates whether the request was successful.
     */
    success: boolean;

    /**
     * Additional data associated with the error, if any.
     */
    data: any | null;

    /**
     * Message describing the error.
     */
    message: string;

    /**
     * Constructs a new ApiError instance.
     * @param statusCode The HTTP status code of the error response.
     * @param message The error message. Default is "Something went wrong...".
     * @param errors An optional array of additional error details. Default is an empty array.
     * @param stack An optional stack trace string. Default is empty.
     */
    constructor(
        statusCode: number,
        message: string = "Something went wrong...",
        errors: any[] = [],
        stack: string = ""
    ) {
        super(message);
        this.statusCode = statusCode;
        this.message = message;
        this.errors = errors;
        this.success = false;
        this.data = null;

        if (stack) {
            // To keep track of the stack trace of errors
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

export { ApiError };