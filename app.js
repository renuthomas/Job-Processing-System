import express from "express";
import { jobRoute } from "./routes/job.routes.js";

const app=express();
const PORT=process.env.PORT || 3000;

app.use(express.json());


app.use("/api", jobRoute);

app.listen(PORT,()=>{
    console.log(`Server is running on port ${PORT}`);
});