import {Pool} from "pg";
import { config } from "dotenv";
config();

const pool=new Pool({
    user:"postgres",
    host:"localhost",
    database:"job",
    password:process.env.DB_PASSWORD,
    port:5432
})

export {pool};