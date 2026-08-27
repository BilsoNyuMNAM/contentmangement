import express from "express";
import { NotionAPI } from "notion-client";
import { prisma } from "../../lib/Prisma.js";
import { adminAuthMiddleware } from "./auth.js";
import { invalidateTagCache } from "../service/findalltags.js";
import { extractNotionPlainText } from "../service/textExtractor.js";
import { invalidatePageCache, invalidatePagesCache, clearAllNotionCache, getCachedNotionPage, deleteHybridCache, setHybridCache } from "../service/notionCache.js";
import "dotenv/config";

const adminRouter = express.Router();
adminRouter.use(express.json());
adminRouter.use(adminAuthMiddleware);

// Step 0: Verify admin credentials
adminRouter.post("/verify", (req, res) => {
    return res.status(200).json({ ok: true, message: "Authenticated" });
});

// List all existing tags (for dropdown)
adminRouter.get("/tags", async (_req, res) => {
    try {
        const tags = await prisma.tag.findMany({
            orderBy: { tagName: 'asc' },
            select: { id: true, tagName: true }
        });
        return res.json({ tags });
    } catch (err: any) {
        return res.status(500).json({ error: "Failed to fetch tags", details: err.message || err });
    }
});

const rawToken = process.env.NOTION_TOKEN_V2 ?? "";
const authToken = rawToken.includes("%") ? decodeURIComponent(rawToken) : rawToken;

const notion = new NotionAPI({
    authToken: authToken,
    ofetchOptions: {
        headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        }
    }
});

function parsePageId(id: string = '', { uuid = true }: { uuid?: boolean } = {}): string | null {
    if (!id) return null;
    const cleanId = id.trim();
    const noQuery = cleanId.split('?')[0];
    if (!noQuery) return null;
    const noHash = noQuery.split('#')[0];
    if (!noHash) return null;
    const match = noHash.match(/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}|[0-9a-fA-F]{32})/);
    if (match && match[1]) {
        const raw = match[1].replace(/-/g, '').toLowerCase();
        if (uuid) {
            return `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}`;
        }
        return raw;
    }
    return noHash;
}

function cleanUuid(id: string): string {
    return id.replace(/[^0-9a-fA-F]/g, '').toLowerCase();
}

function extractBlockTitle(val: any): string | null {
    if (!val?.properties?.title) return null;
    const titleProp = val.properties.title;
    if (Array.isArray(titleProp)) {
        return titleProp.map((chunk: any) => (Array.isArray(chunk) ? chunk[0] : chunk)).join('').trim() || null;
    }
    if (typeof titleProp === 'string') return titleProp.trim() || null;
    return null;
}

function getBlockValue(block: any): any {
    if (!block) return null;
    if (block.value && block.value.value) return block.value.value;
    if (block.value) return block.value;
    return block;
}

function findBlock(recordMap: any, id: string): any {
    if (!recordMap?.block || !id) return null;
    const target = cleanUuid(id);
    if (!target) return null;
    
    // Direct match
    if (recordMap.block[id]) return getBlockValue(recordMap.block[id]);
    
    // Scan all blocks by clean UUID
    for (const key of Object.keys(recordMap.block)) {
        if (cleanUuid(key) === target) return getBlockValue(recordMap.block[key]);
        const val: any = getBlockValue(recordMap.block[key]);
        if (val?.id && cleanUuid(val.id) === target) return val;
    }
    return null;
}

// Step 1: Extract child pages from a parent Notion page
adminRouter.post("/extract-chapters", async (req, res) => {
    try {
        const { notionPageId } = req.body;
        if (!notionPageId) {
            return res.status(400).json({ error: "notionPageId is required" });
        }

        const parsedId = parsePageId(notionPageId, { uuid: true });
        if (!parsedId) {
            return res.status(400).json({ error: "Invalid Notion Page ID or URL" });
        }

        const recordMap = await notion.getPage(parsedId);
        if (!recordMap?.block || Object.keys(recordMap.block).length === 0) {
            return res.status(404).json({ error: "Could not load Notion page. Ensure the page is shared or your NOTION_TOKEN_V2 is valid." });
        }

        const cleanParentId = cleanUuid(parsedId);
        const rootVal: any = findBlock(recordMap, parsedId) || getBlockValue(Object.values(recordMap.block)[0]);

        const chapters: Array<{ pageId: string; title: string }> = [];

        // Strategy 1: Check ordered children in rootBlock.content
        if (rootVal?.content && Array.isArray(rootVal.content)) {
            for (const childId of rootVal.content) {
                const childVal: any = findBlock(recordMap, childId);
                if (!childVal) continue;
                if (childVal.id && cleanUuid(childVal.id) !== cleanParentId && childVal.type === 'page') {
                    const title = extractBlockTitle(childVal);
                    if (title) {
                        chapters.push({ pageId: childVal.id, title });
                    }
                }
            }
        }

        // Strategy 2: If no sub-pages found in content, scan all blocks in recordMap for type === 'page' (excluding parent)
        if (chapters.length === 0) {
            for (const key of Object.keys(recordMap.block)) {
                const val: any = getBlockValue(recordMap.block[key]);
                if (!val || !val.id) continue;
                if (cleanUuid(val.id) === cleanParentId) continue;
                if (val.type === 'page') {
                    const title = extractBlockTitle(val);
                    if (title) {
                        chapters.push({ pageId: val.id, title });
                    }
                }
            }
        }

        // Strategy 3: Only if no child subpages exist anywhere, use the single page itself as Chapter 1
        if (chapters.length === 0) {
            const rootTitle = extractBlockTitle(rootVal) || "Chapter 1";
            chapters.push({
                pageId: rootVal?.id || parsedId,
                title: rootTitle
            });
        }

        return res.json({ chapters });
    } catch (err: any) {
        console.error("Failed to extract chapters from Notion:", err);
        return res.status(500).json({
            error: "Failed to extract chapters from Notion. Check if the page is accessible or your NOTION_TOKEN_V2 is valid.",
            details: err.message || err
        });
    }
});

// Step 2: Create a course with extracted chapters
adminRouter.post("/create-course", async (req, res) => {
    try {
        const { title, description, tagName, chapters, status } = req.body;

        if (!title || !tagName || !chapters || !Array.isArray(chapters) || chapters.length === 0) {
            return res.status(400).json({
                error: "title, tagName, and chapters (non-empty array) are required"
            });
        }

        const validStatus = status === "DRAFT" ? "DRAFT" : "PUBLISHED";

        // 1. Upsert tag
        const tag = await prisma.tag.upsert({
            where: { tagName: tagName },
            update: {},
            create: { tagName: tagName }
        });

        // 2. Upsert course
        const course = await prisma.course.upsert({
            where: { title: title },
            update: {
                description: description || null,
                tagId: tag.id,
                status: validStatus
            },
            create: {
                title: title,
                description: description || null,
                tagId: tag.id,
                status: validStatus
            }
        });

        // Delete any existing chapters to safely overwrite/update
        await prisma.chapter.deleteMany({
            where: { courseId: course.id }
        });

        // 3. Create chapters with order
        const chapterRecords = chapters.map((ch: { pageId: string; title: string }, index: number) => ({
            chapterName: ch.title,
            pageId: ch.pageId,
            courseId: course.id,
            order: index + 1,
        }));

        await prisma.chapter.createMany({
            data: chapterRecords
        });

        // 4. Clear tag cache so new course appears immediately
        invalidateTagCache();

        // 5. Background indexing: fetch plain text for all chapters to enable immediate search
        (async () => {
            for (const ch of chapters) {
                try {
                    const recordMap = await getCachedNotionPage(notion, ch.pageId);
                    if (recordMap) {
                        const { plainText, snippet } = extractNotionPlainText(recordMap);
                        if (plainText) {
                            await prisma.chapter.updateMany({
                                where: { pageId: ch.pageId },
                                data: { plainText, contentSnippet: snippet }
                            });
                        }
                    }
                } catch (e) {
                    console.warn(`Could not pre-index chapter text for ${ch.pageId}:`, e);
                }
            }
        })().catch(() => {});

        // 6. Fetch the created course with chapters to return
        const createdCourse = await prisma.course.findUnique({
            where: { id: course.id },
            include: { chapters: { orderBy: { order: 'asc' } }, tags: true }
        });

        return res.status(201).json({ course: createdCourse });
    } catch (err: any) {
        console.error("Failed to create course:", err);
        return res.status(500).json({
            error: "Failed to create course",
            details: err.message || err
        });
    }
});

// Step 3: Get all courses with chapters for admin selection
adminRouter.get("/courses", async (req, res) => {
    try {
        const courses = await prisma.course.findMany({
            include: {
                chapters: { orderBy: { order: 'asc' } },
                tags: true,
            },
            orderBy: { title: 'asc' }
        });
        return res.json({ courses });
    } catch (err: any) {
        console.error("Failed to fetch courses for admin:", err);
        return res.status(500).json({
            error: "Failed to fetch courses",
            details: err.message || err
        });
    }
});

// Step 4: Add a single chapter to an existing course
adminRouter.post("/add-chapter", async (req, res) => {
    try {
        const { courseId, notionPageId, chapterName, position } = req.body;

        if (!courseId || !notionPageId) {
            return res.status(400).json({ error: "courseId and notionPageId are required" });
        }

        const parsedId = parsePageId(notionPageId, { uuid: true });
        if (!parsedId) {
            return res.status(400).json({ error: "Invalid Notion Page ID or URL" });
        }

        // Verify course exists
        const course = await prisma.course.findUnique({
            where: { id: Number(courseId) },
            include: { chapters: { orderBy: { order: 'asc' } } }
        });

        if (!course) {
            return res.status(404).json({ error: "Course not found" });
        }

        // Check if pageId already exists in this course
        const existingChapter = course.chapters.find(ch => ch.pageId === parsedId);
        if (existingChapter) {
            return res.status(400).json({ error: `This Notion page is already added to this course as "${existingChapter.chapterName}"` });
        }

        // Determine title
        let finalTitle = chapterName?.trim();
        if (!finalTitle) {
            try {
                const recordMap = await notion.getPage(parsedId);
                const blockVal = findBlock(recordMap, parsedId) || getBlockValue(Object.values(recordMap.block || {})[0]);
                finalTitle = extractBlockTitle(blockVal) || undefined;
            } catch (notionErr) {
                console.warn("Could not auto-extract title from Notion:", notionErr);
            }
        }

        if (!finalTitle) {
            finalTitle = "Untitled Chapter";
        }

        // Determine order position
        const currentCount = course.chapters.length;
        let targetOrder: number;

        if (typeof position === 'number' && position >= 1 && position <= currentCount) {
            targetOrder = position;
            // Shift existing chapters at or after this position
            for (const ch of course.chapters) {
                if (ch.order && ch.order >= targetOrder) {
                    await prisma.chapter.update({
                        where: { id: ch.id },
                        data: { order: ch.order + 1 }
                    });
                }
            }
        } else {
            // Append to end (max existing order + 1)
            const maxOrder = course.chapters.reduce((max, ch) => Math.max(max, ch.order || 0), 0);
            targetOrder = maxOrder + 1;
        }

        // Create new chapter
        const newChapter = await prisma.chapter.create({
            data: {
                chapterName: finalTitle,
                pageId: parsedId,
                courseId: course.id,
                order: targetOrder,
            }
        });

        // Invalidate tag cache so updated chapter counts appear immediately
        invalidateTagCache();

        // Return updated course with ordered chapters
        const updatedCourse = await prisma.course.findUnique({
            where: { id: course.id },
            include: { chapters: { orderBy: { order: 'asc' } }, tags: true }
        });

        return res.status(201).json({
            message: "Chapter added successfully",
            chapter: newChapter,
            course: updatedCourse
        });
    } catch (err: any) {
        console.error("Failed to add chapter:", err);
        return res.status(500).json({
            error: "Failed to add chapter",
            details: err.message || err
        });
    }
});

// Step 5: Delete an entire course (and its chapters)
adminRouter.delete("/course/:id", async (req, res) => {
    try {
        const courseId = Number(req.params.id);
        if (isNaN(courseId)) {
            return res.status(400).json({ error: "Invalid course ID" });
        }

        const course = await prisma.course.findUnique({
            where: { id: courseId },
            include: { chapters: true }
        });

        if (!course) {
            return res.status(404).json({ error: "Course not found" });
        }

        // Delete all chapters first
        await prisma.chapter.deleteMany({
            where: { courseId: courseId }
        });

        // Delete the course
        await prisma.course.delete({
            where: { id: courseId }
        });

        // Invalidate tag cache
        invalidateTagCache();

        return res.json({
            message: `Course "${course.title}" and its ${course.chapters.length} chapters were deleted successfully.`,
            courseId: courseId,
            title: course.title
        });
    } catch (err: any) {
        console.error("Failed to delete course:", err);
        return res.status(500).json({
            error: "Failed to delete course",
            details: err.message || err
        });
    }
});

// Step 6: Delete a single chapter
adminRouter.delete("/chapter/:id", async (req, res) => {
    try {
        const chapterId = Number(req.params.id);
        if (isNaN(chapterId)) {
            return res.status(400).json({ error: "Invalid chapter ID" });
        }

        const chapter = await prisma.chapter.findUnique({
            where: { id: chapterId },
            include: { course: true }
        });

        if (!chapter) {
            return res.status(404).json({ error: "Chapter not found" });
        }

        const courseId = chapter.courseId;

        // Delete the chapter
        await prisma.chapter.delete({
            where: { id: chapterId }
        });

        // Re-order remaining chapters in the course to be contiguous
        const remainingChapters = await prisma.chapter.findMany({
            where: { courseId: courseId },
            orderBy: { order: 'asc' }
        });

        for (let i = 0; i < remainingChapters.length; i++) {
            const ch = remainingChapters[i];
            if (ch && ch.order !== i + 1) {
                await prisma.chapter.update({
                    where: { id: ch.id },
                    data: { order: i + 1 }
                });
            }
        }

        // Invalidate tag cache
        invalidateTagCache();

        // Fetch updated course
        const updatedCourse = await prisma.course.findUnique({
            where: { id: courseId },
            include: { chapters: { orderBy: { order: 'asc' } }, tags: true }
        });

        return res.json({
            message: `Chapter "${chapter.chapterName}" was deleted successfully.`,
            chapterId: chapterId,
            chapterName: chapter.chapterName,
            course: updatedCourse
        });
    } catch (err: any) {
        console.error("Failed to delete chapter:", err);
        return res.status(500).json({
            error: "Failed to delete chapter",
            details: err.message || err
        });
    }
});

// Step 7: Update course metadata (title, description, tag, status)
adminRouter.put("/course/:id", async (req, res) => {
    try {
        const courseId = Number(req.params.id);
        if (isNaN(courseId)) {
            return res.status(400).json({ error: "Invalid course ID" });
        }

        const { title, description, tagName, status } = req.body;

        const existingCourse = await prisma.course.findUnique({
            where: { id: courseId }
        });

        if (!existingCourse) {
            return res.status(404).json({ error: "Course not found" });
        }

        let tagId = existingCourse.tagId;
        if (tagName && tagName.trim()) {
            const tag = await prisma.tag.upsert({
                where: { tagName: tagName.trim() },
                update: {},
                create: { tagName: tagName.trim() }
            });
            tagId = tag.id;
        }

        const updatedCourse = await prisma.course.update({
            where: { id: courseId },
            data: {
                ...(title ? { title: title.trim() } : {}),
                ...(description !== undefined ? { description: description?.trim() || null } : {}),
                ...(tagId ? { tagId } : {}),
                ...(status && (status === "DRAFT" || status === "PUBLISHED") ? { status } : {})
            },
            include: {
                chapters: { orderBy: { order: 'asc' } },
                tags: true
            }
        });

        invalidateTagCache();

        return res.json({
            message: "Course updated successfully",
            course: updatedCourse
        });
    } catch (err: any) {
        console.error("Failed to update course:", err);
        return res.status(500).json({
            error: "Failed to update course",
            details: err.message || err
        });
    }
});

// Step 8: Update single chapter (chapterName, pageId, order)
adminRouter.put("/chapter/:id", async (req, res) => {
    try {
        const chapterId = Number(req.params.id);
        if (isNaN(chapterId)) {
            return res.status(400).json({ error: "Invalid chapter ID" });
        }

        const { chapterName, notionPageId, order } = req.body;

        const existingChapter = await prisma.chapter.findUnique({
            where: { id: chapterId }
        });

        if (!existingChapter) {
            return res.status(404).json({ error: "Chapter not found" });
        }

        let newPageId = existingChapter.pageId;
        let plainText = existingChapter.plainText;
        let contentSnippet = existingChapter.contentSnippet;

        if (notionPageId && notionPageId.trim() && notionPageId.trim() !== existingChapter.pageId) {
            const parsedId = parsePageId(notionPageId.trim(), { uuid: true });
            if (!parsedId) {
                return res.status(400).json({ error: "Invalid Notion Page ID or URL" });
            }
            newPageId = parsedId;
            invalidatePageCache(existingChapter.pageId);
            invalidatePageCache(newPageId);

            // Fetch and extract new text
            try {
                const recordMap = await getCachedNotionPage(notion, newPageId);
                if (recordMap) {
                    const extracted = extractNotionPlainText(recordMap);
                    plainText = extracted.plainText;
                    contentSnippet = extracted.snippet;
                }
            } catch (e) {
                console.warn("Could not fetch updated Notion page for indexing:", e);
            }
        }

        const updatedChapter = await prisma.chapter.update({
            where: { id: chapterId },
            data: {
                ...(chapterName ? { chapterName: chapterName.trim() } : {}),
                pageId: newPageId,
                plainText,
                contentSnippet,
                ...(typeof order === 'number' ? { order } : {})
            }
        });

        invalidateTagCache();

        const updatedCourse = await prisma.course.findUnique({
            where: { id: existingChapter.courseId },
            include: { chapters: { orderBy: { order: 'asc' } }, tags: true }
        });

        return res.json({
            message: "Chapter updated successfully",
            chapter: updatedChapter,
            course: updatedCourse
        });
    } catch (err: any) {
        console.error("Failed to update chapter:", err);
        return res.status(500).json({
            error: "Failed to update chapter",
            details: err.message || err
        });
    }
});

// Step 9: Reorder chapters in bulk
adminRouter.put("/course/:id/reorder", async (req, res) => {
    try {
        const courseId = Number(req.params.id);
        if (isNaN(courseId)) {
            return res.status(400).json({ error: "Invalid course ID" });
        }

        const { chapterIds } = req.body;
        if (!Array.isArray(chapterIds)) {
            return res.status(400).json({ error: "chapterIds must be an array of numbers" });
        }

        // Apply order updates sequentially in transaction
        await prisma.$transaction(
            chapterIds.map((id: number, idx: number) =>
                prisma.chapter.update({
                    where: { id: Number(id) },
                    data: { order: idx + 1 }
                })
            )
        );

        invalidateTagCache();

        const updatedCourse = await prisma.course.findUnique({
            where: { id: courseId },
            include: { chapters: { orderBy: { order: 'asc' } }, tags: true }
        });

        return res.json({
            message: "Chapters reordered successfully",
            course: updatedCourse
        });
    } catch (err: any) {
        console.error("Failed to reorder chapters:", err);
        return res.status(500).json({
            error: "Failed to reorder chapters",
            details: err.message || err
        });
    }
});

// Step 10: Force-sync a course from Notion (refresh cache + re-index text)
adminRouter.post("/course/:id/sync", async (req, res) => {
    try {
        const courseId = Number(req.params.id);
        if (isNaN(courseId)) {
            return res.status(400).json({ error: "Invalid course ID" });
        }

        const course = await prisma.course.findUnique({
            where: { id: courseId },
            include: { chapters: { orderBy: { order: 'asc' } } }
        });

        if (!course) {
            return res.status(404).json({ error: "Course not found" });
        }

        // 1. Invalidate caches for all chapters & course metadata
        const pageIds = course.chapters.map(c => c.pageId);
        await invalidatePagesCache(pageIds);
        await deleteHybridCache(`cms:course_meta:${course.title.toLowerCase().trim()}`);

        // 2. Fetch fresh Notion content for each chapter and re-index
        let syncedCount = 0;
        for (const chapter of course.chapters) {
            try {
                const recordMap = await getCachedNotionPage(notion, chapter.pageId);
                if (recordMap) {
                    const { plainText, snippet } = extractNotionPlainText(recordMap);
                    
                    // Optionally update title if Notion block has updated title
                    const blockVal = findBlock(recordMap, chapter.pageId) || getBlockValue(Object.values(recordMap.block || {})[0]);
                    const blockTitle = extractBlockTitle(blockVal);

                    await prisma.chapter.update({
                        where: { id: chapter.id },
                        data: {
                            plainText,
                            contentSnippet: snippet,
                            ...(blockTitle ? { chapterName: blockTitle } : {})
                        }
                    });
                    syncedCount++;
                }
            } catch (err) {
                console.warn(`Failed to sync chapter ${chapter.pageId}:`, err);
            }
        }

        invalidateTagCache();

        const updatedCourse = await prisma.course.findUnique({
            where: { id: courseId },
            include: { chapters: { orderBy: { order: 'asc' } }, tags: true }
        });

        return res.json({
            message: `Successfully synced ${syncedCount} of ${course.chapters.length} chapters from Notion.`,
            syncedCount,
            course: updatedCourse
        });
    } catch (err: any) {
        console.error("Failed to sync course from Notion:", err);
        return res.status(500).json({
            error: "Failed to sync course from Notion",
            details: err.message || err
        });
    }
});

// Step 11: Clear all server caches (Notion page cache & tag cache)
adminRouter.post("/cache/clear", async (req, res) => {
    try {
        clearAllNotionCache();
        invalidateTagCache();
        return res.json({
            message: "All in-memory Notion page caches and tag caches have been flushed."
        });
    } catch (err: any) {
        return res.status(500).json({
            error: "Failed to clear cache",
            details: err.message || err
        });
    }
});

export default adminRouter;
