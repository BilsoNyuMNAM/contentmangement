import "dotenv/config";
import { prisma } from "../../lib/Prisma.js";
import { NotionAPI } from "notion-client";
import { getCachedNotionPage } from "./notionCache.js";

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

import { extractNotionPlainText } from "./textExtractor.js";
import { getHybridCache, setHybridCache } from "./notionCache.js";

async function fetchNotesContent(subject_name: string, chapter_name?: string, isAdmin: boolean = false) {
    subject_name = subject_name.replaceAll("-", " ");
    const metaCacheKey = `cms:course_meta:${subject_name.toLowerCase().trim()}`;

    let courseData: { course: any; chapters: any[] } | null = await getHybridCache(metaCacheKey);

    if (!courseData) {
        const result = await prisma.course.findFirst({
            where: {
                title: {
                    equals: subject_name,
                    mode: 'insensitive'
                }
            }
        });

        if (!result) {
            return null;
        }

        const result2 = await prisma.chapter.findMany({
            where: {
                courseId: result.id
            },
            orderBy: {
                'order': 'asc'
            }
        });

        if (!result2 || result2.length === 0) {
            return null;
        }

        courseData = { course: result, chapters: result2 };
        await setHybridCache(metaCacheKey, courseData, 1800);
    }

    const { course: result, chapters: result2 } = courseData;

    // Hide draft courses from non-admin users
    if (result.status === "DRAFT" && !isAdmin) {
        return null;
    }

    let recordMap = null;
    let targetChapter: any = null;

    if (chapter_name) {
        const normalizeSlug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
        const targetSlug = normalizeSlug(chapter_name);

        targetChapter = result2.find((chapter: any) =>
            chapter.chapterName === chapter_name.replaceAll("-", " ") ||
            chapter.chapterName.replaceAll(" ", "-").toLowerCase() === chapter_name.toLowerCase() ||
            normalizeSlug(chapter.chapterName) === targetSlug
        );

        if (!targetChapter || !targetChapter.pageId) {
            return null;
        }
        try {
            recordMap = await getCachedNotionPage(notion, targetChapter.pageId);
        } catch (error) {
            console.error("❌ Error fetching from Notion | pageId:", targetChapter.pageId);
            console.error(error);
            return null;
        }
    } else {
        targetChapter = result2[0];
        const firstPageId = targetChapter?.pageId;
        if (!firstPageId) {
            return null;
        }
        try {
            recordMap = await getCachedNotionPage(notion, firstPageId);
        } catch (error) {
            console.error("❌ Error fetching from Notion (first chapter) | pageId:", firstPageId);
            console.error(error);
            return null;
        }
    }

    // Background indexing: if this chapter hasn't been plain-text indexed yet, extract and save it
    if (recordMap && targetChapter && !targetChapter.plainText) {
        try {
            const { plainText, snippet } = extractNotionPlainText(recordMap);
            if (plainText) {
                prisma.chapter.update({
                    where: { id: targetChapter.id },
                    data: { plainText, contentSnippet: snippet }
                }).catch((err) => console.warn("Failed background plainText indexing:", err));
            }
        } catch (err) {
            // Non-blocking
        }
    }

    return { recordMap, result2 };
}

export default fetchNotesContent;