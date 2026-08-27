import express from "express";
import findAlltag from "../service/findalltags.js";

const courseRouter = express.Router();

courseRouter.get("/tag", async (req, res) => {
    try {
        const result = await findAlltag();
        return res.json({
            data: result
        });
    } catch (err: any) {
        return res.status(500).json({
            error: "Failed to fetch tags",
            details: err.message || err
        });
    }
});



export default courseRouter;
