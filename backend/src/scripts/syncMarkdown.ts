import "dotenv/config";
import { syncMarkdownDirectory } from "../service/markdownSync.js";

async function main() {
    console.log("🚀 Starting Markdown content synchronization...");
    const result = await syncMarkdownDirectory();
    console.log("=========================================");
    console.log(`✅ Courses Created : ${result.coursesCreated}`);
    console.log(`🔄 Courses Updated : ${result.coursesUpdated}`);
    console.log(`✅ Chapters Created: ${result.chaptersCreated}`);
    console.log(`🔄 Chapters Updated: ${result.chaptersUpdated}`);
    if (result.errors.length > 0) {
        console.warn("⚠️ Errors encountered:");
        result.errors.forEach(e => console.warn("  -", e));
    }
    console.log("=========================================");
    process.exit(0);
}

main().catch((err) => {
    console.error("Fatal error during markdown sync:", err);
    process.exit(1);
});
