/**
 * Safely converts a title/name into a URL-friendly slug.
 * Replaces slashes, special characters, and handles spaces/dashes cleanly.
 */
export function slugify(text: string): string {
    if (!text) return '';
    return text
        .trim()
        .replace(/[/\\+]+/g, '-')           // replace slashes and plus with hyphen
        .replace(/[^a-zA-Z0-9\s-_]/g, '')     // remove special symbols (?, #, &, :, etc.)
        .replace(/\s+/g, '-')               // replace whitespace with hyphen
        .replace(/-+/g, '-')                // collapse multiple hyphens
        .replace(/^-+|-+$/g, '');           // trim hyphens from start/end
}

/**
 * Normalizes a string for resilient comparison (ignores spaces, hyphens, slashes, case).
 */
export function normalizeSlug(text: string): string {
    if (!text) return '';
    return text.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Extracts a 32-character Notion page/block ID from any Notion URL or ID string.
 */
export function extractNotionId(input: string): string | null {
    if (!input) return null;
    const match = input.match(/([a-f0-9]{8}-?[a-f0-9]{4}-?[a-f0-9]{4}-?[a-f0-9]{4}-?[a-f0-9]{12}|[a-f0-9]{32})/i);
    return match ? match[0].replaceAll('-', '').toLowerCase() : null;
}

/**
 * Resolves any Notion page ID, block ID, or URL into the correct internal app route.
 * Handles chapter page IDs, sub-block mentions (climbing parent_id hierarchy in recordMap),
 * and hash fragments.
 */
export function resolveNotionTarget({
    rawUrlOrId,
    chaptersData,
    subjectName,
    currentChapterName,
    recordMap
}: {
    rawUrlOrId: string;
    chaptersData: any[] | undefined;
    subjectName: string;
    currentChapterName?: string;
    recordMap?: any;
}): { destination: string; isSameChapter: boolean; blockId: string | null } {
    if (!rawUrlOrId) {
        return { destination: '', isSameChapter: true, blockId: null };
    }

    // 1. Extract hash (blockId) if present in URL
    const hashIndex = rawUrlOrId.indexOf('#');
    const rawHash = hashIndex !== -1 ? rawUrlOrId.slice(hashIndex + 1) : '';
    let blockId = rawHash ? rawHash.replaceAll('-', '').toLowerCase() : null;

    // 2. Extract Notion ID from path/string
    const pathPart = hashIndex !== -1 ? rawUrlOrId.slice(0, hashIndex) : rawUrlOrId;
    const extractedId = extractNotionId(pathPart);

    let targetChapter: any = null;

    if (extractedId) {
        // Check if extractedId is directly one of the chapters
        targetChapter = chaptersData?.find(
            (ch) => ch.pageId?.replaceAll('-', '').toLowerCase() === extractedId
        );

        // If not a chapter directly, check if it's a block inside recordMap and climb parent_id
        if (!targetChapter && recordMap?.block) {
            let currentBlockWrapper = Object.values(recordMap.block).find((bw: any) => {
                const b = bw?.value?.value || bw?.value || bw;
                return b?.id?.replaceAll('-', '').toLowerCase() === extractedId;
            }) as any;

            let blockData = currentBlockWrapper?.value?.value || currentBlockWrapper?.value || currentBlockWrapper;
            const visited = new Set<string>();

            if (blockData) {
                // If it's a sub-block, treat extractedId as the blockId to scroll to
                if (!blockId && blockData.type !== 'page') {
                    blockId = extractedId;
                }

                while (blockData && !visited.has(blockData.id)) {
                    visited.add(blockData.id);
                    const parentCleanId = blockData.parent_id?.replaceAll('-', '').toLowerCase();

                    // Check if parent block is one of our chapters
                    const parentChapter = chaptersData?.find(
                        (ch) => ch.pageId?.replaceAll('-', '').toLowerCase() === parentCleanId
                    );
                    if (parentChapter) {
                        targetChapter = parentChapter;
                        break;
                    }

                    // Climb up to next parent block
                    const parentWrapper = Object.values(recordMap.block).find((bw: any) => {
                        const b = bw?.value?.value || bw?.value || bw;
                        return b?.id?.replaceAll('-', '').toLowerCase() === parentCleanId;
                    }) as any;

                    blockData = parentWrapper?.value?.value || parentWrapper?.value || parentWrapper;
                }
            }
        }
    }

    const currentChapterSlug = slugify(currentChapterName || '');
    const targetChapterSlug = targetChapter ? slugify(targetChapter.chapterName) : currentChapterSlug;
    const subjectSlug = slugify(subjectName || '');

    const isSameChapter = !targetChapter || targetChapterSlug === currentChapterSlug;
    const destination = blockId
        ? `/${subjectSlug}/${targetChapterSlug}#${blockId}`
        : `/${subjectSlug}/${targetChapterSlug}`;

    return { destination, isSameChapter, blockId };
}
