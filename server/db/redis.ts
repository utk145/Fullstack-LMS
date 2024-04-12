// https://www.npmjs.com/package/ioredis#quick-start

import { Redis } from "ioredis";

const redisClient = () => {
    if (process.env.REDIS_URL) {
        console.log("Reddis connected successfully");
        return process.env.REDIS_URL;
    }
    throw new Error("Reddis connection failed");
}

export const redis = new Redis(redisClient());