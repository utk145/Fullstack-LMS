import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { LIMIT } from "./constant";
import { ErrorsMiddleware } from "./middleware/errors.middleware";

const app = express();

// Configurations
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}));

app.use(express.urlencoded());
app.use(express.json({ limit: LIMIT }))
app.use(cookieParser());


// connecting cloudinary
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUDNAME,
    api_key: process.env.CLOUDINARY_APIKEY,
    api_secret: process.env.CLOUDINARY_APISECRET
});


// routes
import userRouter from "./routes/user.route";
import courseRouter from "./routes/course.route";
import orderRouter from "./routes/order.route";


// routes declaration
app.use("/api/v1/users", userRouter);
app.use("/api/v1/courses", courseRouter);
app.use("/api/v1/orders", orderRouter);



// test route
app.get("/test", (req: Request, res: Response, next: NextFunction) => {
    res
        .status(200)
        .json({
            success: true,
            message: "Test api working successfully"
        })
});


//  Unknown endpoint request
app.all("*", (req: Request, res: Response, next: NextFunction) => {
    // Add other known routes as needed
    const usersGeneric = `/api/v1/users`;
    const knownRoutes = [
        `${usersGeneric}/register`,
        "/test",
    ];

    if (knownRoutes.includes(req.originalUrl)) {
        // Requested route is known, send a specific error response
        return res.status(404).json({ error: `Route ${req.originalUrl} not found` });
    }

    // Requested route is unknown, send a generic error response
    const err = new Error(`Requested route ${req.originalUrl} not found`) as any;
    err.statusCode = 404;
    next(err);
});



app.use(ErrorsMiddleware);

export { app };