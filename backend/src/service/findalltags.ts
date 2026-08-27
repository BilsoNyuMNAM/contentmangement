import { prisma } from "../../lib/Prisma.js";
import { getHybridCache, setHybridCache, deleteHybridCache } from "./notionCache.js";

const TAGS_CACHE_KEY = "cms:published_tags";
const TAG_CACHE_TTL_SECONDS = 10 * 60; // 10 minutes

async function findAlltag() {
    // 1. Try hybrid cache
    const cached = await getHybridCache(TAGS_CACHE_KEY);
    if (cached) {
        return cached;
    }

    // 2. Fetch from Postgres
    const tags = await prisma.tag.findMany({
        include: {
            courses: {
                where: {
                    status: "PUBLISHED"
                },
                include: {
                    _count: {
                        select: {
                            chapters: true
                        }
                    }
                }
            }
        }
    });

    // Only return tags that have at least one published course
    const activeTags = tags.filter(t => t.courses.length > 0);

    // 3. Save to hybrid cache
    await setHybridCache(TAGS_CACHE_KEY, activeTags, TAG_CACHE_TTL_SECONDS);
    return activeTags;
}

export function invalidateTagCache() {
    deleteHybridCache(TAGS_CACHE_KEY).catch((err) =>
        console.warn("Failed to invalidate tag cache:", err)
    );
}

export default findAlltag;