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
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    const targetSubjectSlug = normalize(subject_name);
    const metaCacheKey = `cms:course_meta:${targetSubjectSlug}`;

    let courseData: { course: any; chapters: any[] } | null = await getHybridCache(metaCacheKey);

    if (!courseData) {
        // 1. Try exact or space-replaced match
        let result = await prisma.course.findFirst({
            where: {
                OR: [
                    { title: { equals: subject_name, mode: 'insensitive' } },
                    { title: { equals: subject_name.replaceAll("-", " "), mode: 'insensitive' } }
                ]
            }
        });

        // 2. If not found, match via normalized slug across all courses
        if (!result) {
            const allCourses = await prisma.course.findMany();
            result = allCourses.find(c => normalize(c.title) === targetSubjectSlug) || null;
        }

        // 3. If still not found, check if subject_name is a chapter pageId
        if (!result) {
            const cleanId = subject_name.replaceAll("-", "").toLowerCase();
            const chapterByPage = await prisma.chapter.findFirst({
                where: {
                    OR: [
                        { pageId: { equals: subject_name, mode: 'insensitive' } },
                        { pageId: { equals: cleanId, mode: 'insensitive' } }
                    ]
                },
                include: { course: true }
            });

            if (chapterByPage && chapterByPage.course) {
                result = chapterByPage.course;
                if (!chapter_name) {
                    chapter_name = chapterByPage.chapterName;
                }
            }
        }

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
        const targetChapterSlug = normalize(chapter_name);

        targetChapter = result2.find((chapter: any) =>
            normalize(chapter.chapterName) === targetChapterSlug ||
            chapter.chapterName.toLowerCase() === chapter_name.toLowerCase() ||
            chapter.chapterName === chapter_name.replaceAll("-", " ")
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