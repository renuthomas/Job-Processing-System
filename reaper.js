import { pool } from "./utils/database.utils.js";
import { redisClient } from "./utils/redis.utils.js";
const reaper=async()=>{
    const client=await pool.connect();
    console.log("Reaper running at", new Date().toISOString());
    try {
        const result=await client.query("Select id from job_details where status='active' and heartbeat_at<now()-interval '30 seconds'");
        const staleJobs=result.rows;
        for(const job of staleJobs){
            console.log(`Reaping stale job ${job.id}`);
            try {
                await client.query("update job_details set status='pending' where id=$1",[job.id]);
                try {
                    await redisClient.lPush("queue:pending",job.id.toString());
                } catch (redisError) {
                    await client.query("update job_details set status='active' where id=$1",[job.id]);
                    console.error('Redis error:', redisError.message);
                }
            } catch (error) {
                console.error('Reaper error:', error.message);
            }
        }

        const orphanResult=await client.query("select id from job_details where status='pending' and heartbeat_at is null and created_at<now()-interval '5 minutes'");
        const orphanJobs=orphanResult.rows;
        for(const job of orphanJobs){
            console.log(`Re-queuing orphan job ${job.id}`);
            try {
                await redisClient.lPush("queue:pending",job.id.toString());
            } catch (redisError) {
                console.error('Failed to re-queue orphan job:', job.id, redisError.message);
            }
        }


    } catch (error) {
        console.error('Reaper error:', error.message);
    }finally{
        client.release();
    }
}

setInterval(async () => {
    await reaper();
},30000);