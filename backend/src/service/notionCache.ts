import { NotionAPI } from "notion-client";
import { Redis } from "@upstash/redis";
import { fetchWithRetry } from "./notionThrottle.js";
import "dotenv/config";

const CACHE_TTL_SECONDS = 30 * 60; // 30 minutes
const CACHE_TTL_MS = CACHE_TTL_SECONDS * 1000;

// 1. Initialize Upstash Redis if environment credentials exist
const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

let redisClient: Redis | null = null;

if (upstashUrl && upstashToken) {
    try {
        redisClient = new Redis({
            url: upstashUrl,
            token: upstashToken,
        });
        console.log("⚡ [Cache] Upstash Redis connected successfully.");
    } catch (err) {
        console.warn("⚠️ [Cache] Failed to initialize Upstash Redis, falling back to in-memory cache:", err);
        redisClient = null;
    }
} else {
    console.log("🧠 [Cache] Running in fallback in-memory RAM mode (No UPSTASH_REDIS_REST_URL configured).");
}

// 2. L1 In-Memory RAM Store (0ms ultra-fast lookup)
const memoryFreshCache = new Map<string, { recordMap: any; ts: number }>();
const memoryStaleCache = new Map<string, any>();
const memoryGenericCache = new Map<string, { value: any; expiresAt: number }>();

/**
 * Get a Notion page recordMap with Tiered Caching:
 * Tier 1: L1 In-Memory RAM (0ms)
 * Tier 2: L2 Upstash Redis (~500ms network, persists across restarts)
 * Tier 3: Notion API (1-3s, saves to both L1 and L2)
 */
export async function getCachedNotionPage(notion: NotionAPI, pageId: string): Promise<any> {
    const freshKey = `notion:page:${pageId}`;
    const staleKey = `notion:stale:${pageId}`;

    // Tier 1: Check L1 Local RAM first (Instant 0ms)
    const local = memoryFreshCache.get(pageId);
    if (local && Date.now() - local.ts < CACHE_TTL_MS) {
        return local.recordMap;
    }

    // Tier 2: Check L2 Upstash Redis if connected
    if (redisClient) {
        try {
            const redisCached = await redisClient.get(freshKey);
            if (redisCached) {
                // Populate L1 RAM so subsequent requests are instant (0ms)
                memoryFreshCache.set(pageId, { recordMap: redisCached, ts: Date.now() });
                memoryStaleCache.set(pageId, redisCached);
                return redisCached;
            }
        } catch (err) {
            console.warn(`[Cache] Redis get failed for ${freshKey}:`, err);
        }
    }

    // Tier 3: Fetch from Notion API
    try {
        const recordMap = await fetchWithRetry(notion, pageId);
        
        if (recordMap && Object.keys(recordMap.block || {}).length > 0) {
            // Save to L1 Local RAM
            memoryFreshCache.set(pageId, { recordMap, ts: Date.now() });
            memoryStaleCache.set(pageId, recordMap);

            // Save to L2 Upstash Redis
            if (redisClient) {
                redisClient.set(freshKey, recordMap, { ex: CACHE_TTL_SECONDS }).catch(err => 
                    console.warn(`[Cache] Redis set fresh failed for ${pageId}:`, err)
                );
                redisClient.set(staleKey, recordMap, { ex: 7 * 24 * 3600 }).catch(err => 
                    console.warn(`[Cache] Redis set stale failed for ${pageId}:`, err)
                );
            }
        }

        return recordMap;
    } catch (err: any) {
        console.error(`Notion fetch failed for ${pageId}, checking stale cache:`, err?.message || err);

        // Fallback: Check stale L1 RAM
        const localStale = memoryStaleCache.get(pageId);
        if (localStale) return localStale;

        // Fallback: Check stale L2 Redis
        if (redisClient) {
            try {
                const redisStale = await redisClient.get(staleKey);
                if (redisStale) {
                    memoryStaleCache.set(pageId, redisStale);
                    return redisStale;
                }
            } catch (redisErr) {
                // Ignore
            }
        }

        return null;
    }
}

/**
 * Invalidate a single Notion page from both L1 RAM and L2 Redis cache.
 */
export async function invalidatePageCache(pageId: string) {
    memoryFreshCache.delete(pageId);
    memoryStaleCache.delete(pageId);

    if (redisClient) {
        try {
            await redisClient.del(`notion:page:${pageId}`);
            await redisClient.del(`notion:stale:${pageId}`);
        } catch (err) {
            console.warn(`[Cache] Redis del failed for ${pageId}:`, err);
        }
    }
}

/**
 * Invalidate multiple Notion pages from both L1 RAM and L2 Redis cache.
 */
export async function invalidatePagesCache(pageIds: string[]) {
    for (const id of pageIds) {
        memoryFreshCache.delete(id);
        memoryStaleCache.delete(id);
    }

    if (redisClient && pageIds.length > 0) {
        try {
            const keys = pageIds.flatMap(id => [`notion:page:${id}`, `notion:stale:${id}`]);
            await redisClient.del(...keys);
        } catch (err) {
            console.warn("[Cache] Redis batch del failed:", err);
        }
    }
}

/**
 * Purge all Notion page and application caches across L1 RAM and L2 Redis.
 */
export async function clearAllNotionCache() {
    memoryFreshCache.clear();
    memoryStaleCache.clear();
    memoryGenericCache.clear();

    if (redisClient) {
        try {
            const keys = await redisClient.keys("notion:*");
            const tagKeys = await redisClient.keys("cms:*");
            const allKeys = [...keys, ...tagKeys];
            if (allKeys.length > 0) {
                await redisClient.del(...allKeys);
            }
        } catch (err) {
            console.warn("[Cache] Redis clear failed:", err);
        }
    }
}

/**
 * Generic Hybrid Cache getter with L1 + L2 tiered caching.
 */
export async function getHybridCache<T = any>(key: string): Promise<T | null> {
    // 1. Check L1 RAM
    const local = memoryGenericCache.get(key);
    if (local && Date.now() < local.expiresAt) {
        return local.value as T;
    }

    // 2. Check L2 Redis
    if (redisClient) {
        try {
            const redisVal = await redisClient.get<T>(key);
            if (redisVal) {
                memoryGenericCache.set(key, {
                    value: redisVal,
                    expiresAt: Date.now() + 600 * 1000,
                });
                return redisVal;
            }
        } catch (err) {
            console.warn(`[Cache] Redis get for ${key} failed:`, err);
        }
    }

    return null;
}

/**
 * Generic Hybrid Cache setter
 */
export async function setHybridCache(key: string, value: any, ttlSeconds: number = 600): Promise<void> {
    memoryGenericCache.set(key, {
        value,
        expiresAt: Date.now() + ttlSeconds * 1000,
    });

    if (redisClient) {
        redisClient.set(key, value, { ex: ttlSeconds }).catch(err => 
            console.warn(`[Cache] Redis set for ${key} failed:`, err)
        );
    }
}

/**
 * Generic Hybrid Cache deleter
 */
export async function deleteHybridCache(key: string): Promise<void> {
    memoryGenericCache.delete(key);
    if (redisClient) {
        try {
            await redisClient.del(key);
        } catch (err) {
            console.warn(`[Cache] Redis del for ${key} failed:`, err);
        }
    }
}
