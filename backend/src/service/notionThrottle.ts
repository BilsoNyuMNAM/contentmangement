import { NotionAPI } from "notion-client";

const MAX_CONCURRENCY = 2;
const MIN_GAP_MS = 250;
const MAX_RETRIES = 4;

let activeCount = 0;
let lastRequestTime = 0;
const queue: Array<{ resolve: () => void }> = [];

function releaseSlot() {
    activeCount--;
    if (queue.length > 0) {
        const next = queue.shift()!;
        next.resolve();
    }
}

async function acquireSlot(): Promise<void> {
    if (activeCount < MAX_CONCURRENCY) {
        activeCount++;
        return;
    }
    return new Promise<void>((resolve) => {
        queue.push({ resolve: () => { activeCount++; resolve(); } });
    });
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function isForbidden(err: any): boolean {
    return err?.status === 403 || err?.statusCode === 403 || 
           (err?.message && err.message.includes('403'));
}

export async function fetchWithRetry(notion: NotionAPI, pageId: string): Promise<any> {
    await acquireSlot();
    try {
        // Enforce minimum gap between requests
        const now = Date.now();
        const elapsed = now - lastRequestTime;
        if (elapsed < MIN_GAP_MS) {
            await sleep(MIN_GAP_MS - elapsed);
        }

        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
                lastRequestTime = Date.now();
                const recordMap = await notion.getPage(pageId);
                return recordMap;
            } catch (err: any) {
                // If it's a 403 Forbidden or 404 Not Found, retrying will never help — fail immediately!
                if (isForbidden(err) || err?.status === 404 || err?.statusCode === 404) {
                    console.error(`Notion access error (${err?.status || 403}) for ${pageId}. Page may not be public or token lack permissions.`);
                    throw err;
                }
                if (attempt === MAX_RETRIES - 1) throw err;
                const base = 300;
                const delay = base * Math.pow(2, attempt);
                console.warn(`Notion fetch attempt ${attempt + 1} failed for ${pageId}, retrying in ${delay}ms`);
                await sleep(delay);
            }
        }
    } finally {
        releaseSlot();
    }
}
