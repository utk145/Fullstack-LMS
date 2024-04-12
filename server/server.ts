import { app } from "./app";
import connectDB from "./db/mongodb";


const PORT_NUM = process.env.PORT;

connectDB()
    .then(() => {
        app.listen(PORT_NUM, () => {
            console.log("Server is happily listening on Port: ", PORT_NUM);
        })
    })
    .catch((err) => {
        console.log("MONGODB ERROR CONNECTION Failed !!! ", err);
    })

