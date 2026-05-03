# Job Processing System

A robust, scalable background job processing system built with **Node.js**, **Express**, **PostgreSQL**, and **Redis**.

##  Features

- REST API for submitting jobs
- Redis-based queue for reliable job distribution
- Multiple worker support (horizontal scaling)
- Automatic retry logic with configurable max attempts
- Dead Letter Table (DLT) for failed jobs
- Heartbeat monitoring to detect stuck jobs
- Reaper service that automatically recovers stale and orphaned jobs
- Persistent job storage in PostgreSQL

## Architecture

```
API Layer (Express)
      ↓
Job Details → PostgreSQL
      ↓
Queue (Redis List: "queue:pending")
      ↓
Worker(s) → Process Job → Update Status
      ↓
Reaper (every 30s) → Recovers stale jobs
```

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Queue**: Redis

## Project Structure

```
├── app.js                    # Main Express server
├── worker.js                 # Background job processor
├── reaper.js                 # Stale job recovery service
├── controllers/
│   └── job.controllers.js    # Job creation logic
├── routes/
│   └── job.routes.js         # API routes
├── utils/
│   ├── database.utils.js     # PostgreSQL pool
│   └── redis.utils.js        # Redis client
├── package.json
├── .env.example
└── README.md
```

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL
- Redis

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/renuthomas/Job-Processing-System.git
   cd Job-Processing-System
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```

   Edit the `.env` file with your credentials.

4. **Database Setup**

   Create a database named `job` and execute the following SQL:

   ```sql
   CREATE TABLE job_details (
       id SERIAL PRIMARY KEY,
       type VARCHAR(100) NOT NULL,
       payload JSONB NOT NULL,
       status VARCHAR(20) DEFAULT 'pending',
       attempts INTEGER DEFAULT 0,
       max_attempts INTEGER DEFAULT 3,
       created_at TIMESTAMP DEFAULT NOW(),
       started_at TIMESTAMP,
       completed_at TIMESTAMP,
       heartbeat_at TIMESTAMP
   );

   CREATE TABLE dlq (
       id SERIAL PRIMARY KEY,
       job_id INTEGER,
       type VARCHAR(100),
       payload JSONB,
       attempts INTEGER,
       error TEXT,
       created_at TIMESTAMP DEFAULT NOW()
   );
   ```

## Running the Application

**Terminal 1 - API Server**
```bash
npm start
```

**Terminal 2 - Worker**
```bash
npm run worker
```

**Terminal 3 - Reaper**
```bash
npm run reaper
```

## API Endpoints

### Create Job

**POST** `/api/jobs`

**Request:**
```json
{
  "type": "email.send",
  "payload": {
    "to": "user@example.com",
    "subject": "Welcome",
    "body": "Hello there!"
  }
}
```

**Response:**
```json
{
  "message": "Job created successfully",
  "jobId": 42
}
```

## Monitoring & Logging

- Workers log job processing and errors
- Reaper logs recovered jobs
- Check `job_details` table for status (`pending`, `active`, `completed`, `failed`)
- Failed jobs with max attempts are moved to the `dlq` table

## Future Improvements

- [ ] Delayed & scheduled jobs
- [ ] Job priorities
- [ ] Admin dashboard
- [ ] Docker & Docker Compose setup
- [ ] Unit & integration tests
- [ ] Better rate limiting & security

---
