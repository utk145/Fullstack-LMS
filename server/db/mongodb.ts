import mongoose from "mongoose";
import { DB_NANE } from "../constant";

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NANE}`)
        // console.log(`\n MongoDB connected !! DB HOST: ${connectionInstance}`);
        console.log(`\nMongoDB connected !! DB HOST: ${connectionInstance.connection.host}`);
    } catch (error: any) {
        console.log("MONGODB ERROR CONNECTION - FAILED: ", error);
        setTimeout(connectDB, 5000);
        process.exit(1);
    }
}


export default connectDB;