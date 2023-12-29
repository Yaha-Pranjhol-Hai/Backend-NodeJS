import dotenv from "dotenv";
import connectDB from "./db/index.js";

dotenv.config({
    path: './env'
})

// const express = require("express");
// const app = express();

// const port = process.env.PORT || 3000;

// app.get('/', (req,res) => {
//     res.send('Hello World');
// })

// app.listen(port, () => {
//     console.log(`App listening on port: ${port}`);
// })
 
connectDB()