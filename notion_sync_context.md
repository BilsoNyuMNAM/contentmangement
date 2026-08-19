# Notion Auto-Sync Feature Context

## Goal
We are building an automated sync feature for a course/notes CMS. 
The goal is to automatically fetch course and chapter metadata from a Notion Database (which acts as the source of truth) and save it into a PostgreSQL database. This eliminates the need to manually copy-paste Notion page IDs into the database.

## Tech Stack
- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL accessed via Prisma ORM
- **Notion SDK:** Using the official `@notionhq/client` (v5) to query the database.

## Database Schema (Prisma)
The database has three main tables. We recently added `@unique` constraints to specific fields so we can safely `upsert` (update or insert) data without creating duplicates.
1. `Tag` — has `tagName @unique`
2. `Course` — has `title @unique` (belongs to Tag)
3. `Chapter` — has `pageId @unique` (belongs to Course)

## Current Progress
We are currently working inside `backend/src/service/syncFromNotion.ts`.
1. **Done:** Configured the Notion client with API key and Database ID.
2. **Done:** Successfully queried the Notion database (`notion.dataSources.query`).
3. **Done:** Wrote the mapping logic to extract the raw Notion properties into a clean TypeScript array of objects.

The extracted data structure looks like this:
```typescript
type Chapter = { 
  PageId: string; 
  ChapterName: string | null; 
  CourseName: string | null; 
  Tag: string | null; 
  Order: number | null; 
}
```

## Next Immediate Steps to Build
We are ready to write the database logic. The next steps are:
1. **Filter Data:** Remove any empty rows from the extracted array (e.g., rows where `ChapterName` or `CourseName` are `null`).
2. **Prisma Upserts:** Loop through the clean data and use Prisma to save it to PostgreSQL.
3. **Insert Order:** The database operations must happen in this exact order due to foreign key constraints: **Tag → Course → Chapter**.
