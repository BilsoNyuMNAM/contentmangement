/**
 * Utility to extract clean plain text from Notion recordMap for indexing and search.
 */

function extractTextChunks(titleProp: any): string {
    if (!titleProp) return '';
    if (typeof titleProp === 'string') return titleProp.trim();
    if (Array.isArray(titleProp)) {
        return titleProp
            .map((chunk: any) => {
                if (typeof chunk === 'string') return chunk;
                if (Array.isArray(chunk) && typeof chunk[0] === 'string') return chunk[0];
                return '';
            })
            .join('')
            .trim();
    }
    return '';
}

export function extractNotionPlainText(recordMap: any): { plainText: string; snippet: string } {
    if (!recordMap?.block) {
        return { plainText: '', snippet: '' };
    }

    const textPieces: string[] = [];

    for (const blockId of Object.keys(recordMap.block)) {
        const blockWrapper = recordMap.block[blockId];
        const block = blockWrapper?.value?.value || blockWrapper?.value || blockWrapper;
        if (!block) continue;

        // Extract title property
        if (block.properties?.title) {
            const txt = extractTextChunks(block.properties.title);
            if (txt) {
                textPieces.push(txt);
            }
        }

        // Extract caption if present
        if (block.properties?.caption) {
            const captionTxt = extractTextChunks(block.properties.caption);
            if (captionTxt) {
                textPieces.push(captionTxt);
            }
        }
    }

    const plainText = textPieces.join(' \n ').replace(/\s+/g, ' ').trim();
    const snippet = plainText.length > 250 ? plainText.slice(0, 247) + '...' : plainText;

    return { plainText, snippet };
}

/**
 * Generate a contextual snippet surrounding the query match with highlighted terms.
 */
export function generateSearchSnippet(text: string, query: string, snippetLength: number = 180): string {
    if (!text) return '';
    if (!query) return text.slice(0, snippetLength) + (text.length > snippetLength ? '...' : '');

    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase().trim();
    const matchIndex = lowerText.indexOf(lowerQuery);

    if (matchIndex === -1) {
        return text.slice(0, snippetLength) + (text.length > snippetLength ? '...' : '');
    }

    const half = Math.floor((snippetLength - query.length) / 2);
    let start = Math.max(0, matchIndex - half);
    let end = Math.min(text.length, matchIndex + query.length + half);

    // Adjust boundaries to avoid cutting words in half if possible
    if (start > 0) {
        const spaceIdx = text.indexOf(' ', start);
        if (spaceIdx !== -1 && spaceIdx < matchIndex) {
            start = spaceIdx + 1;
        }
    }
    if (end < text.length) {
        const spaceIdx = text.lastIndexOf(' ', end);
        if (spaceIdx !== -1 && spaceIdx > matchIndex + query.length) {
            end = spaceIdx;
        }
    }

    let snippet = text.slice(start, end).trim();
    if (start > 0) snippet = '...' + snippet;
    if (end < text.length) snippet = snippet + '...';

    return snippet;
}
