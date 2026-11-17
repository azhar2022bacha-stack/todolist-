# Daymark

A full-stack task dashboard built with Next.js, NestJS, Prisma, and PostgreSQL. Tasks are stored in PostgreSQL; the browser never uses local storage as a database.

## Requirements

- Node.js 20+
- PostgreSQL 14+

## Getting started

1. Create a PostgreSQL database (for example, `daymark`).
2. Copy `backend/.env.example` to `backend/.env` and set `DATABASE_URL`.
3. Copy `frontend/.env.example` to `frontend/.env.local` if the API is not running at `http://localhost:4000`.
4. From the repository root, install dependencies and initialize the database:

   ```sh
   npm install
   npm run db:generate
   npm run db:migrate
   ```

5. Start both applications:

   ```sh
   npm run dev
   ```

- Web app: http://localhost:3000
- REST API: http://localhost:4000/api

For production, build with `npm run build`, apply migrations with `npm run db:deploy`, then start with `npm start`.

To apply committed migrations in a deployed environment, use `npm run db:deploy`.

## API

All endpoints are prefixed with `/api`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/tasks` | Create a task |
| `GET` | `/tasks` | Paginated, searchable, filterable task list |
| `GET` | `/tasks/stats` | Live dashboard counts |
| `GET` | `/tasks/:id` | Retrieve task details |
| `PATCH` | `/tasks/:id` | Update a task |
| `DELETE` | `/tasks/:id` | Delete a task |

`GET /tasks` accepts `page`, `limit` (maximum 100), `search`, `status`, `priority`, `due`, and `sort` query parameters. Status values are `PENDING`, `IN_PROGRESS`, `COMPLETED`; priorities are `LOW`, `MEDIUM`, `HIGH`. Due-date filters are `ALL`, `OVERDUE`, `TODAY`, and `UPCOMING`; sort values are `NEWEST`, `OLDEST`, and `PRIORITY`.

## Database

The Prisma schema is in `backend/prisma/schema.prisma`. The initial SQL migration is committed in `backend/prisma/migrations/20261117000000_init/`. Configure `DATABASE_URL` before running Prisma commands. Database credentials are only used by the backend.
