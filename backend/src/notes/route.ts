import express from "express";
import fetchNotesContent from "../service/fetchNotecontent.js";
const noteRouter = express.Router();

noteRouter.get("/notes", async (req, res) => {
    // console.log("1. inside the note route")
    const result = await fetchNotesContent();
    res.json({
        data: result
    });
});

export default noteRouter;
