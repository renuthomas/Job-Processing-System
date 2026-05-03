import { Router } from "express";
import { postJob } from "../controllers/job.controllers.js";
const jobRoute=Router();

jobRoute.post("/jobs", postJob);

export {jobRoute};
