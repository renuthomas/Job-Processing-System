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
            await redisClient.lPush("queue:pending",jobId.toString());
        } catch (redisError) {
            await client.query("DELETE from job_details where id=$1",[jobId]);
            return res.status(500).json({message:"Failed to enqueue job: "+redisError.message});
            
        }
        return res.status(201).json({message:"Job created successfully",jobId});

    } catch (error) {
        return res.status(500).json({message:"Internal Server Error: "+error.message});
    }finally{
        client.release();
    }
}

const postDelayedJob=async(req,res)=>{
    const {type,payload,delay}=req.body;
    if(!type || typeof type !=="string" || type.trim()===""){
        return res.status(400).json({message:"Type can't be empty and must be a string"});
    }
    if(typeof payload !=="object" || Array.isArray(payload) || payload===null){
        return res.status(400).json({message:"Payload must be a valid JSON object"});
    }

    // Check if delay is a valid string/Date or a valid relative object
    const isValidDate = !isNaN(Date.parse(delay));
    const isValidRelative = delay?.value && delay?.unit;

    if (!isValidDate && !isValidRelative) {
        return res.status(400).json({ message: "Invalid delay format" });
    }

    const client=await pool.connect();
     try {
        const scheduledAtMs=convertToMs(delay.value || delay,delay.unit);
        const scheduledAtDate = new Date(scheduledAtMs);
        const result=await client.query("INSERT INTO job_details (type,payload,scheduled_at) values ($1,$2,$3) returning id",[type,payload,scheduledAtDate]);
        const jobId=result.rows[0].id;

        try {
            console.log(`Enqueuing delayed job ${jobId} to Redis`);
            await redisClient.zAdd("queue:delayed",{
                score:scheduledAtMs,
                value:jobId.toString()
            });
        } catch (redisError) {
            await client.query("DELETE from job_details where id=$1",[jobId]);
            return res.status(500).json({message:"Failed to enqueue job: "+redisError.message});
            
        }
        return res.status(201).json({message:"Delayed job created successfully",jobId});

    } catch (error) {
        return res.status(500).json({message:"Internal Server Error: "+error.message});
    }finally{
        client.release();
    }
}

const convertToMs=(value,unit="ms")=>{

    if(value instanceof Date) return value.getTime();
    
    if (typeof value === 'string' && isNaN(value)) {
        const parsed = new Date(value).getTime();
        if (isNaN(parsed)) throw new Error("Invalid Date string");
        return parsed;
    }

    const unitsInMs={
        ms:1,
        s:1000,
        m:60*1000,
        h:60*60*1000,
        d:24*60*60*1000
    }
    
    const unitLower = unit.toLowerCase();
    const shortUnit = unitLower.charAt(0);
    
    // Check for 'ms' so it doesn't match 'm' (minutes)
    const multiplier = unitLower === 'ms' ? unitsInMs.ms : (unitsInMs[unitLower] || unitsInMs[shortUnit] || 0);

    if (multiplier === 0 && unitLower !== 'ms') throw new Error("Invalid Unit");

    return Date.now() + (value * multiplier);
}

export {postJob,postDelayedJob};


