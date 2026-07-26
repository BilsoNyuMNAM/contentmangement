import express from "express";
import fetchNotesContent from "../service/fetchNotecontent.js";
const noteRouter = express.Router();
noteRouter.use(express.json());
noteRouter.get("/notes", async (req, res) => {
    // console.log("1. inside the note route")
    const {subject_name} = req.query
    console.log("subject_name:", subject_name);
    //@ts-ignore
    const result = await fetchNotesContent(subject_name);
    if(!result){
        return res.status(404).json({ error: "Course not found" });
    }
    return res.status(200).json({
        recordMap: result.recordMap,
        chaptersData: result.result2
    });
});

export default noteRouter;
