import mongoose, { Document } from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { accessTokenExpiry, refreshTokenExpiry } from "../utils/jwt";

/**
 * Regular expression pattern for validating email addresses.
 */
const emailRegexPattern: RegExp = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Interface representing a user document in the database.
 */
export interface IUser extends Document {
    name: string;
    email: string;
    password: string;
    avatar: {
        public_id: string;
        url: string;
    };
    role: string;
    isVerified: boolean;
    courses: Array<{ courseId: string }>;
    refreshToken: string;
    comparePassword: (password: string) => Promise<boolean>;
    generateAccessToken: () => string;
    generateRefreshToken: () => string;
}


/**
 * Mongoose schema for the user collection.
 */
const userSchema = new mongoose.Schema<IUser>({
    name: {
        type: String,
        // required:true,
        required: [true, "Name is a mandatory field"],
    },
    email: {
        type: String,
        required: [true, "Email is mandatory field"],
        unique: true,
        match: emailRegexPattern,
        validate: {
            validator: function (value: string) {
                return emailRegexPattern.test(value);
            },
            message: "Please enter a valid email",
        }
    },
    password: {
        type: String,
        required: [true, "Password is mandatory field"],
        minlength: [6, "Length of the password must be atleast 6 characters"]
    },
    avatar: {
        public_id: {
            type: String,
            // required: true,
        },
        url: {
            type: String,
            // required: true,
        },
    },
    role: {
        type: String,
        enum: ["user", "admin"],
        default: "user",
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    courses: [
        {
            courseId: String
        },
    ],
    refreshToken: {
        type: String,
    }
}, { timestamps: true });


// encrypting the password. we use pre hook(a middleware) so that we encrpyt it just before saving 
/**
 * Middleware to encrypt the password before saving the user document.
 */
userSchema.pre<IUser>("save", async function (next) {
    if (this.isModified("password")) {
        this.password = await bcrypt.hash(this.password, 10);
        next();
    }
    next();
});

// but now we need a method to compare the original password with the encrypted one from db
/**
 * Method to compare the provided password with the stored hashed password.
 * @param password The password to compare.
 * @returns A Promise resolving to true if the passwords match, false otherwise.
 */
userSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
    return await bcrypt.compare(password, this.password);
};



// Method to generate an access token for the user
userSchema.methods.generateAccessToken = function () {
    if (!process.env.ACCESS_TOKEN_SECRET) {
        throw new Error("ACCESS_TOKEN_SECRET environment variable is not defined");
    }
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            name: this.name,
        },
        process.env.ACCESS_TOKEN_SECRET! as string,
        {
            expiresIn: `${accessTokenExpiry}s`
        }
    )
};



// Method to generate a refresh token for the user
userSchema.methods.generateRefreshToken = function () {
    if (!process.env.REFRESH_TOKEN_SECRET) {
        throw new Error("REFRESH_TOKEN_SECRET environment variable is not defined");
    }
    return jwt.sign(
        {
            _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET! as string,
        {
            expiresIn: `${refreshTokenExpiry}s`
        }
    )
};



export const User = mongoose.model<IUser>("User", userSchema);