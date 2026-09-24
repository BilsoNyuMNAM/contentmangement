import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { prisma } from "../../lib/Prisma.js";
import { deleteHybridCache } from "./notionCache.js";

export function slugify(text: string): string {
    if (!text) return "";
    return text
        .trim()
        .replace(/[/\\+]+/g, "-")
        .replace(/[^a-zA-Z0-9\s-_]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "");
}

export function parseFrontmatter(fileContent: string): { data: Record<string, any>; content: string } {
    const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
    const match = fileContent.match(frontmatterRegex);
    if (!match) {
        return { data: {}, content: fileContent.trim() };
    }
    const yamlBlock = match[1] || "";
    const content = (match[2] || "").trim();
    const data: Record<string, any> = {};
    for (const line of yamlBlock.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const colonIdx = trimmed.indexOf(":");
        if (colonIdx !== -1) {
            const key = trimmed.slice(0, colonIdx).trim();
            let val = trimmed.slice(colonIdx + 1).trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                val = val.slice(1, -1);
            }
            if (!isNaN(Number(val)) && val !== "") {
                data[key] = Number(val);
            } else if (val.toLowerCase() === "true") {
                data[key] = true;
            } else if (val.toLowerCase() === "false") {
                data[key] = false;
            } else {
                data[key] = val;
            }
        }
    }
    return { data, content };
}

export function extractMarkdownPlainText(markdown: string): { plainText: string; snippet: string } {
    const plainText = markdown
        .replace(/```[\s\S]*?```/g, " ")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/!\[.*?\]\(.*?\)/g, "")
        .replace(/\[(.*?)\]\(.*?\)/g, "$1")
        .replace(/#{1,6}\s+/g, "")
        .replace(/(\*\*|__)(.*?)\1/g, "$2")
        .replace(/(\*|_)(.*?)\1/g, "$2")
        .replace(/>\s+/g, "")
        .replace(/[-*+]\s+/g, "")
        .replace(/\n+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    const snippet = plainText.slice(0, 250);
    return { plainText, snippet };
}

export interface SyncResult {
    coursesCreated: number;
    coursesUpdated: number;
    chaptersCreated: number;
    chaptersUpdated: number;
    errors: string[];
}

/**
 * Scans a folder (e.g. content/courses/) and synchronizes markdown files into PostgreSQL
 */
export async function syncMarkdownDirectory(baseDir?: string): Promise<SyncResult> {
    const result: SyncResult = {
        coursesCreated: 0,
        coursesUpdated: 0,
        chaptersCreated: 0,
        chaptersUpdated: 0,
        errors: []
    };

    const searchCandidates = [
        baseDir,
        path.resolve(process.cwd(), "..", "notes"),
        path.resolve(process.cwd(), "notes"),
        path.resolve(process.cwd(), "..", "content", "courses"),
        path.resolve(process.cwd(), "content", "courses")
    ].filter(Boolean) as string[];

    let targetDir = searchCandidates.find(dir => fs.existsSync(dir));

    // If running in the cloud (e.g. Render) without local notes, clone from remote Git repo
    if (!targetDir) {
        const repoUrl = process.env.NOTES_REPO_URL || "https://github.com/BilsoNyuMNAM/NOTES-cms-.git";
        const cloudClonePath = path.resolve(process.cwd(), "remote_notes");
        try {
            console.log(`🌐 No local notes found. Fetching latest notes from ${repoUrl}...`);
            if (fs.existsSync(cloudClonePath) && fs.existsSync(path.join(cloudClonePath, ".git"))) {
                execSync(`git -C "${cloudClonePath}" pull --depth 1`, { stdio: "ignore" });
            } else {
                fs.rmSync(cloudClonePath, { recursive: true, force: true });
                execSync(`git clone --depth 1 "${repoUrl}" "${cloudClonePath}"`, { stdio: "ignore" });
            }
            targetDir = cloudClonePath;
        } catch (gitErr: any) {
            console.error("Failed to clone remote notes repo on server:", gitErr);
            result.errors.push(`Remote notes clone failed: ${gitErr.message || gitErr}`);
            return result;
        }
    }

    const courseDirs = fs.readdirSync(targetDir, { withFileTypes: true })
        .filter(d => d.isDirectory() && !d.name.startsWith("."));

    for (const dir of courseDirs) {
        const courseFolder = dir.name;
        const coursePath = path.join(targetDir, courseFolder);
        const files = fs.readdirSync(coursePath).filter(f => f.endsWith(".md") || f.endsWith(".markdown"));

        if (files.length === 0) continue;

        // Read first file or _course.json if exists for course metadata
        let courseTitle = courseFolder.replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
        let courseDesc = `Course covering ${courseTitle}`;
        let tagName = "General";

        // Read files to find courseTitle or tag from frontmatter
        const parsedFiles: Array<{
            filename: string;
            filePath: string;
            data: Record<string, any>;
            content: string;
        }> = [];

        for (const file of files) {
            const filePath = path.join(coursePath, file);
            const rawContent = fs.readFileSync(filePath, "utf8");
            const { data, content } = parseFrontmatter(rawContent);
            if (data.courseTitle) courseTitle = String(data.courseTitle);
            if (data.courseDescription) courseDesc = String(data.courseDescription);
            if (data.tag) tagName = String(data.tag);
            parsedFiles.push({ filename: file, filePath, data, content });
        }

        try {
            // Find or create tag
            let tag = await prisma.tag.findUnique({ where: { tagName } });
            if (!tag) {
                tag = await prisma.tag.create({ data: { tagName } });
            }

            // Find or create course
            let course = await prisma.course.findFirst({
                where: {
                    OR: [
                        { title: { equals: courseTitle, mode: "insensitive" } },
                        { title: { equals: courseFolder, mode: "insensitive" } }
                    ]
                }
            });

            if (!course) {
                course = await prisma.course.create({
                    data: {
                        title: courseTitle,
                        description: courseDesc,
                        source: "MARKDOWN",
                        status: "PUBLISHED",
                        tagId: tag.id
                    }
                });
                result.coursesCreated++;
            } else {
                await prisma.course.update({
                    where: { id: course.id },
                    data: {
                        description: courseDesc,
                        tagId: tag.id
                    }
                });
                result.coursesUpdated++;
            }

            // Invalidate cache for this course
            const courseSlug = slugify(courseTitle).toLowerCase().replace(/[^a-z0-9]/g, "");
            await deleteHybridCache(`cms:course_meta:${courseSlug}`);

            // Upsert chapters
            let orderCounter = 1;
            for (const item of parsedFiles) {
                const chapterSlug = item.filename.replace(/\.mdx?$/, "").replace(/^\d+[-_]/, "");
                const chapterTitle = item.data.title || chapterSlug.replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
                const chapterOrder = item.data.order !== undefined ? Number(item.data.order) : orderCounter++;
                const pageId = `md:${slugify(courseTitle)}:${slugify(item.filename)}`;
                const { plainText, snippet } = extractMarkdownPlainText(item.content);

                const existingChapter = await prisma.chapter.findUnique({
                    where: { pageId }
                });

                if (!existingChapter) {
                    await prisma.chapter.create({
                        data: {
                            chapterName: chapterTitle,
                            pageId: pageId,
                            source: "MARKDOWN",
                            courseId: course.id,
                            order: chapterOrder,
                            markdownContent: item.content,
                            plainText: plainText,
                            contentSnippet: snippet
                        }
                    });
                    result.chaptersCreated++;
                } else {
                    await prisma.chapter.update({
                        where: { id: existingChapter.id },
                        data: {
                            chapterName: chapterTitle,
                            order: chapterOrder,
                            markdownContent: item.content,
                            plainText: plainText,
                            contentSnippet: snippet
                        }
                    });
                    result.chaptersUpdated++;
                }
            }
        } catch (err: any) {
            console.error(`Error syncing course ${courseFolder}:`, err);
            result.errors.push(`Course ${courseFolder}: ${err.message || String(err)}`);
        }
    }

    return result;
}
