import express from "express";
import fetchNotesContent from "../service/fetchNotecontent.js";
const noteRouter = express.Router();
noteRouter.use(express.json());
noteRouter.get("/notes", async (req, res) => {
    const { subject_name, chapter_name } = req.query;
    const adminSecret = process.env.ADMIN_SECRET || "admin123";
    const headerKey = req.headers["x-admin-key"] as string | undefined;
    const isAdmin = Boolean(headerKey && headerKey === adminSecret);

    //@ts-ignore
    const result = await fetchNotesContent(subject_name, chapter_name, isAdmin);
    if (!result) {
        return res.status(404).json({ error: "Course or chapter not found" });
    }
    return res.status(200).json({
        recordMap: result.recordMap,
        chaptersData: result.result2
    });
});

export default noteRouter;
