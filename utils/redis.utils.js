import {createClient} from "redis";
import dotenv from "dotenv";
dotenv.config();

const client=createClient({
    url:`redis://:${process.env.REDIS_PASSWORD}@127.0.0.1:6379`
});
client.on('error',err=>console.log(`Redis Client Error:${err}`));
await client.connect();

export {client as redisClient};