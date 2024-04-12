import { app } from "./app";


const PORT_NUM = process.env.PORT;


app.listen(PORT_NUM, () => {
    console.log("Server is happily listening on Port: ", PORT_NUM);
})