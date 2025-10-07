# Flash Sale Platform

A high-throughput flash sale backend using Redis for hot-path inventory and locks, and PostgreSQL for durable orders.

## System Diagram
```mermaid
flowchart LR
  C[Client Web/Mobile] -->|GET /sale/status| S(SaleService)
  C -->|POST /sale/purchase| S
  A[Admin] -->|POST /admin/products| S

  S -->|ioredis| R[(Redis)]
  S -->|TypeORM Txn| DB[(PostgreSQL)]

  %% Queue for post-commit updates
  S -- enqueue incrementSold --> Q((Bull Queue))
  Q -- consume --> P[SalesProcessor]
  P -- update soldQuantity --> DB
```

## Setup
- Prereqs: Node.js 16+, Docker, Docker Compose
- Infra:
  ```bash
  docker-compose up -d
  ```
- Backend:
  ```bash
  cd backend
  npm install
  cp .env.example .env
  npm run start:dev
  ```
- API:
  - Base: http://localhost:3000
  - Docs: http://localhost:3000/api/docs

## System Flow
- Client calls POST `/api/v1/sale/purchase`
- API acquires per-user-per-product Redis lock (SET NX PX)
- Reads Redis inventory, validates sale window and prior purchase
- Atomically `DECRBY` inventory
- Creates order in PostgreSQL within a transaction and commits
- Asynchronously increments `soldQuantity`
- Releases lock

## Tradeoffs
  1. Performance vs Consistency

  Redis as the primary fast path for inventory

  Pros: Ultra-low latency (O(1) atomic operations), supports thousands of concurrent requests per second, minimal database contention.

  Cons: Introduces eventual consistency — Redis and PostgreSQL may temporarily diverge, requiring background reconciliation or compensation jobs.

  2. Latency vs Reliability

  Asynchronous writes to PostgreSQL

  Pros: Users receive instant feedback after Redis confirmation; the database write can happen asynchronously or batched in the background.

  Cons: Adds complexity — needs retry logic, deduplication, and idempotent transaction handling to prevent data loss in case of worker or queue failures.

  3. Simplicity vs Scalability

  Redis + PostgreSQL hybrid design

  Pros: Enables horizontal scalability and handles high traffic with low latency.

  Cons: Increases system complexity — requires queue management, worker processes, and monitoring for sync drift or rollback failures.

  4. Strong vs Eventual Consistency

  Eventual consistency on soldQuantity

  Pros: Faster checkout experience; Redis handles real-time decrements while PostgreSQL confirms asynchronously.

  Cons: Temporary mismatch possible between Redis cache and persistent database state until synchronization completes.

  5. Cost vs Reliability

  Distributed caching and background processing

  Pros: Offloads expensive write operations from PostgreSQL, improving throughput and stability under heavy load.

  Cons: Higher operational cost — additional Redis cluster, message queue, and worker infrastructure to maintain.

- **Run k6**
  ```bash
  # Default BASE_URL is http://localhost:3000/api/v1.0
  k6 run load-test/flash-sale-k6.js

  # Optional: specify BASE_URL explicitly
  BASE_URL=http://localhost:3000/api/v1.0 k6 run load-test/flash-sale-k6.js
  ```

  The k6 script automatically discovers the latest product ID via `GET /sale/first`, so you do not need to manually set a productId.

- **Adjusting load**
  Edit `options.scenarios` in `load-test/flash-sale-k6.js` to change virtual users and durations.

- **Interpreting results**
  - `http_req_failed` threshold should stay low (< 5%). If high, the system is failing requests under load.
  - `http_req_duration p(95)` shows latency; keep within your SLO (e.g., < 800ms).
  - Purchase checks accept 200/201 (success) and 400/403 (expected business rejections). The controller logs errors and returns `{ success: false, error: "..." }` for graceful failures, avoiding 5xx.