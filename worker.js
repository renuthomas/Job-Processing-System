import { redisClient } from "./utils/redis.utils.js"
import { pool } from "./utils/database.utils.js";
const worker=async()=>{
    while(true){
        const redisData=await redisClient.BRPOP("queue:pending",5);
        if(redisData==null){
            continue;
        }

        const client=await pool.connect();
        const jobId=redisData.element;
        const result=await client.query("Select * from job_details where id=$1",[jobId]);
        const jobResult=result?.rows[0];
        const updateStatusActive=await client.query("Update job_details set status='active',started_at=now() where id=$1",[jobId]);
        

        const heartbeat=setInterval(async()=>{
            await updateHeartBeat(client, jobId);
        },10000);


        console.log(`Processing job ${jobId} with payload ${JSON.stringify(jobResult?.payload)}`);
        try {
            await processJob(jobResult.payload);
            await client.query("UPDATE job_details SET status='completed' WHERE id=$1", [jobId]);
        } catch (error) {
            // increment attempts atomically, get new value
            console.log(`Error processing job ${jobId}:`, error.message);
            const updateResult = await client.query("UPDATE job_details SET attempts = attempts + 1 WHERE id=$1 RETURNING attempts, max_attempts",[jobId]);
            const { attempts, max_attempts } = updateResult.rows[0];
            
            if (attempts >= max_attempts) {
                await client.query("UPDATE job_details SET status='failed' WHERE id=$1", [jobId]);
                await client.query("INSERT INTO dlq (job_id, type, payload, attempts, error) VALUES ($1,$2,$3,$4,$5)",[jobId, jobResult.type, jobResult.payload, attempts, error.message]);
            } else {
                await redisClient.lPush("queue:pending", jobId.toString());
            }
        } finally {
            clearInterval(heartbeat);
            client.release();
        }
    }
}

const processJob=async(payload)=>{
    await new Promise((resolve)=>setTimeout(resolve,2000));
    return "success";
}

const updateHeartBeat=async(client,jobId)=>{
    await client.query("update job_details set heartbeat_at=now() where id=$1",[jobId]);
}

worker();