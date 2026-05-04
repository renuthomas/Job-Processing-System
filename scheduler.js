import { redisClient } from "./utils/redis.utils.js";


const scheduler=async()=>{

    // ZRANGEBYSCORE is used to fetch all jobs where the score (scheduled time) is less than or equal to the current time
    // ZREMRANGEBYSCORE is used to remove those jobs from the queue

    const luaScript=`
        local delayedJobs=redis.call('ZRANGEBYSCORE',KEYS[1],0,ARGV[1],'LIMIT',0,ARGV[2])
        if #delayedJobs>0 then
            for i,jobId in ipairs(delayedJobs) do
                redis.call('ZREM',KEYS[1],jobId)
                redis.call('RPUSH',KEYS[2],jobId)
            end
        end
        return delayedJobs`

        while(true){
            try {
                const now=Date.now();
                const jobs=await redisClient.EVAL(luaScript,{
                    keys:["queue:delayed","queue:pending"],
                    arguments:[now.toString(),"100"] // process max 100 delayed jobs at a time to prevent overwhelming the system
                });
                console.log(`Processed ${jobs.length} delayed jobs at ${new Date()}`);
            } catch (error) {
                console.error("Scheduler Error:", error);
            }

            // Sleep for a short duration before checking again to prevent tight loop and spamming redis with requests
            await new Promise(res => setTimeout(res, 1000));
        }
}

scheduler();