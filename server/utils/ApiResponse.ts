/**
 * Represents a standardized API response object.
 */
class ApiResponse {
    /**
     * HTTP status code of the response.
     */
    statusCode: number;

    /**
     * Data payload of the response.
     */
    data: any;

    /**
     * Message associated with the response. Default is "Success".
     */
    message: string;

    /**
     * Indicates whether the request was successful based on the status code.
     */
    success: boolean;

    /**
     * Constructs a new ApiResponse instance.
     * @param statusCode The HTTP status code of the response.
     * @param data The data payload of the response.
     * @param message The message associated with the response. Default is "Success".
     */
    constructor(statusCode: number, data: any, message: string = "Success") {
        this.statusCode = statusCode;
        this.data = data;
        this.message = message;
        this.success = statusCode < 400; // Determine success based on status code
        // Resource: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status
    }
}

export { ApiResponse };