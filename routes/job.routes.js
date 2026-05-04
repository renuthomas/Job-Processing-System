import { Router } from "express";
import { postJob,postDelayedJob } from "../controllers/job.controllers.js";
const jobRoute=Router();

jobRoute.post("/jobs", postJob);
jobRoute.post("/jobs/delayed",postDelayedJob);

export {jobRoute};
