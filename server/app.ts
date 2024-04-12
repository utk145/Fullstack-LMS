import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { LIMIT } from "./constant";

const app = express();

// Configurations
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}));

app.use(express.urlencoded());
app.use(express.json({ limit: LIMIT }))
app.use(cookieParser());


// routes

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
    const err = new Error(`Requested route ${req.originalUrl} not found`) as any;
    err.statusCode = 404;
    next(err);
});

export { app };