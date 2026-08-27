import express from "express";
import { prisma } from "../../lib/Prisma.js";
import { generateSearchSnippet } from "../service/textExtractor.js";

const searchRouter = express.Router();

searchRouter.get("/search", async (req, res) => {
    try {
        const query = (req.query.q as string || "").trim();
        if (!query) {
            return res.json({ courses: [], chapters: [], total: 0 });
        }

        const adminSecret = process.env.ADMIN_SECRET || "admin123";
        const headerKey = req.headers["x-admin-key"] as string | undefined;
        const isAdmin = Boolean(headerKey && headerKey === adminSecret);

        // Course filter
        const courseStatusFilter = isAdmin ? {} : { status: "PUBLISHED" as const };

        // 1. Search Courses
        const matchedCourses = await prisma.course.findMany({
            where: {
                ...courseStatusFilter,
                OR: [
                    { title: { contains: query, mode: "insensitive" } },
                    { description: { contains: query, mode: "insensitive" } },
                ]
            },
            include: {
                tags: true,
                _count: {
                    select: { chapters: true }
                }
            },
            take: 10
        });

        // 2. Search Chapters (Full-text in plainText + chapterName)
        const matchedChapters = await prisma.chapter.findMany({
            where: {
                course: courseStatusFilter,
                OR: [
                    { chapterName: { contains: query, mode: "insensitive" } },
                    { plainText: { contains: query, mode: "insensitive" } },
                    { contentSnippet: { contains: query, mode: "insensitive" } }
                ]
            },
            include: {
                course: {
                    include: {
                        tags: true
                    }
                }
            },
            take: 25
        });

        const formattedChapters = matchedChapters.map((ch) => {
            const snippet = generateSearchSnippet(ch.plainText || ch.contentSnippet || '', query);
            return {
                id: ch.id,
                chapterName: ch.chapterName,
                courseId: ch.courseId,
                courseTitle: ch.course.title,
                tag: ch.course.tags?.tagName,
                order: ch.order,
                pageId: ch.pageId,
                snippet: snippet,
                status: ch.course.status
            };
        });

        const formattedCourses = matchedCourses.map((c) => ({
            id: c.id,
            title: c.title,
            description: c.description,
            tag: c.tags?.tagName,
            chaptersCount: c._count.chapters,
            status: c.status
        }));

        return res.json({
            query,
            courses: formattedCourses,
            chapters: formattedChapters,
            total: formattedCourses.length + formattedChapters.length
        });
    } catch (err: any) {
        console.error("Search error:", err);
        return res.status(500).json({
            error: "Failed to perform search",
            details: err.message || err
        });
    }
});

export default searchRouter;
