import { describe, jest } from '@jest/globals';

jest.unstable_mockModule("../utils/database.utils.js",()=>({
    pool:{
        connect:jest.fn()
    }
}));

jest.unstable_mockModule("../utils/redis.utils.js",()=>({
    redisClient:{
        lPush:jest.fn(),
        zAdd:jest.fn(),
        connect:jest.fn().mockResolvedValue(),
        on:jest.fn(),
    }
}));

const { pool } = await import("../utils/database.utils.js");
const { redisClient } = await import("../utils/redis.utils.js");
const { postJob,postDelayedJob } = await import("../controllers/job.controllers.js");


let res;
beforeEach(() => {
    res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
    };
});

describe("Test Job Creation",()=>{
    test("should create a job",async()=>{
        const mockClient={
            query:jest.fn(),
            release:jest.fn()
        };

        pool.connect.mockResolvedValue(mockClient);
        mockClient.query.mockResolvedValue({rows:[{id:1}]});
        redisClient.lPush.mockResolvedValue(1);

        const req={
            body:{
                type:"email",
                payload:{
                    "to":"example@example.com"
                }
            }
        }

        await postJob(req,res);
        
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({
            message: "Job created successfully",
            jobId: 1
        });

        expect(pool.connect).toHaveBeenCalled();
        expect(redisClient.lPush).toHaveBeenCalled();
        expect(mockClient.release).toHaveBeenCalled();
    })

    test("should return 400 for invalid type",async()=>{
        const req={
            body:{
                type:""
            }
        }

        await postJob(req,res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({message:"Type can't be empty and must be a string"});
    })

    test("should return 400 for invalid payload",async()=>{
        const req={
            body:{
                type:"email",
                payload:"invalid"
            }
        }

        await postJob(req,res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({message:"Payload must be a valid JSON object"});
    })

    test("should handle if redis enqueue fails",async () => {
        const mockClient={
            query:jest.fn(),
            release:jest.fn(),
        }

        pool.connect.mockResolvedValue(mockClient);
        mockClient.query.mockResolvedValue({rows:[{id:1}]});
        redisClient.lPush.mockRejectedValue(new Error("Redis error"));

        const req={
            body:{
                type:"email",
                payload:{
                    "to":"example@example.com"
                }
            }
        }

        await postJob(req,res);
        expect(res.json).toHaveBeenCalledWith({message:"Failed to enqueue job: Redis error"});
        expect(res.status).toHaveBeenCalledWith(500);
        expect(mockClient.query).toHaveBeenCalledWith("DELETE from job_details where id=$1",[1]);
        
    })

    test("should handle database errors",async()=>{
         const mockClient={
            query:jest.fn(), 
            release:jest.fn(),
        }

        pool.connect.mockResolvedValue(mockClient);
        mockClient.query.mockRejectedValue(new Error("Database error"));
        redisClient.lPush.mockResolvedValue(1);

        const req={
            body:{
                type:"email",
                payload:{
                    "to":"example@example.com"
                }
            }
        }

        await postJob(req,res);
        expect(res.json).toHaveBeenCalledWith({message:"Internal Server Error: Database error"});
        expect(res.status).toHaveBeenCalledWith(500);
        expect(mockClient.release).toHaveBeenCalled();
        
    })
})

describe("Test Delayed Job Creation",()=>{
    
    test("should create a delayed job",async()=>{
        const mockClient={
            query:jest.fn(),
            release:jest.fn()
        }

        pool.connect.mockResolvedValue(mockClient);
        mockClient.query.mockResolvedValue({rows:[{id:1}]});
        redisClient.zAdd.mockResolvedValue(1);

        const req={
            body:{
                "type": "email",
                "payload":{ "to": "user@example.com" },
                "delay":{
                    "value":2,
                    "unit":"m"
                }
            }
        }

        await postDelayedJob(req,res);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({
            message: "Delayed job created successfully",
            jobId: 1
        })

    })

    test("should return 400 for invalid type",async()=>{
        const req={
            body:{
                type:""
            }
        }

        await postDelayedJob(req,res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({message:"Type can't be empty and must be a string"});
    })

    test("should return 400 for invalid payload",async()=>{
        const req={
            body:{
                type:"email",
                payload:"invalid"
            }
        }

        await postDelayedJob(req,res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({message:"Payload must be a valid JSON object"});
    })

    test("should return 400 for invalid time",async()=>{
        const req={
            body:{
                "type": "email",
                "payload":{ "to": "user@example.com" },
                "delay":"2hr"
            }
        }

        await postDelayedJob(req,res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({message:"Invalid delay format"});
    })

    test("should handle if redis enqueue fails",async () => {
        const mockClient={
            query:jest.fn(),
            release:jest.fn(),
        }

        pool.connect.mockResolvedValue(mockClient);
        mockClient.query.mockResolvedValue({rows:[{id:1}]});
        redisClient.zAdd.mockRejectedValue(new Error("Redis error"));

        const req={
            body:{
                "type": "email",
                "payload":{ "to": "user@example.com" },
                "delay":{
                    "value":2,
                    "unit":"m"
                }
            }
        }

        await postDelayedJob(req,res);
        expect(res.json).toHaveBeenCalledWith({message:"Failed to enqueue job: Redis error"});
        expect(res.status).toHaveBeenCalledWith(500);
        expect(mockClient.query).toHaveBeenCalledWith("DELETE from job_details where id=$1",[1]);
        
    })

    test("should handle database errors",async()=>{
         const mockClient={
            query:jest.fn(), 
            release:jest.fn(),
        }

        pool.connect.mockResolvedValue(mockClient);
        mockClient.query.mockRejectedValue(new Error("Database error"));
        redisClient.zAdd.mockResolvedValue(1);

        const req={
            body:{
                "type": "email",
                "payload":{ "to": "user@example.com" },
                "delay":{
                    "value":2,
                    "unit":"m"
                }
            }
        }

        await postDelayedJob(req,res);
        expect(res.json).toHaveBeenCalledWith({message:"Internal Server Error: Database error"});
        expect(res.status).toHaveBeenCalledWith(500);
        expect(mockClient.release).toHaveBeenCalled();
        
    })
})