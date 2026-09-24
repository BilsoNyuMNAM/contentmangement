import express from "express";
import courseRouter from "./course/route.js";
import noteRouter from "./notes/route.js";
import adminRouter from "./admin/route.js";
import searchRouter from "./search/route.js";
import cors from "cors";
import { syncMarkdownDirectory } from "./service/markdownSync.js";

const PORT = process.env.PORT || 3000;
const app = express();

app.get("/health", (req, res) => {
    res.status(200).send("OK");
});
app.use(cors());

// Request logger to track incoming sync and API pings
app.use((req, _res, next) => {
    console.log(`📥 [${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

app.use("/api/v1", courseRouter);
app.use("/api/v1", noteRouter);
app.use("/api/v1", searchRouter);
app.use("/api/v1/admin", adminRouter);

app.listen(PORT, async () => {
    console.log(`Server listening on port ${PORT}`);
    
    // Automatically sync local/git markdown notes on startup in the background
    try {
        const res = await syncMarkdownDirectory();
        if (res.coursesCreated > 0 || res.chaptersCreated > 0 || res.chaptersUpdated > 0) {
            console.log(`✅ [Auto-Sync] Notes synced: ${res.coursesCreated} courses created, ${res.chaptersCreated} chapters created, ${res.chaptersUpdated} chapters updated.`);
        } else if (res.errors.length === 0) {
            console.log("✨ [Auto-Sync] Markdown notes are up to date.");
        }
    } catch (err: any) {
        console.warn("⚠️ [Auto-Sync] Could not auto-sync notes on boot:", err?.message || err);
    }
});