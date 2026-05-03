import { pool } from "../utils/database.utils.js";
import { redisClient } from "../utils/redis.utils.js";

const postJob=async(req,res)=>{
    const {type,payload}=req.body;
    if(!type || typeof type !=="string" || type.trim()===""){
        return res.status(400).json({message:"Type can't be empty and must be a string"});
    }
    if(typeof payload !=="object" || Array.isArray(payload) || payload===null){
        return res.status(400).json({message:"Payload must be a valid JSON object"});
    }
    const client=await pool.connect();
    try {
        
        const result=await client.query("INSERT INTO job_details (type,payload) values ($1,$2) returning id",[type,payload]);
        const jobId=result.rows[0].id;

        try {
            console.log(`Enqueuing job ${jobId} to Redis`);
            await redisClient.LPUSH("queue:pending",jobId.toString());
            const queueLength = await redisClient.lLen("queue:pending");
            console.log("Queue length after push:", queueLength);

        } catch (redisError) {
            await client.query("DELETE from job_details where id=$1",[jobId]);
            return res.status(500).json({message:"Failed to enqueue job:"+redisError.message});
            
        }
        return res.status(201).json({message:"Job created successfully",jobId});

    } catch (error) {
        return res.status(500).json({message:"Internal Server Error:"+error.message});
    }finally{
        client.release();
    }
}

export {postJob};


