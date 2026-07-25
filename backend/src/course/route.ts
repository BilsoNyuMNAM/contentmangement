import express from "express";
import findAllCourses from "../service/ findallcourse.js";
const courseRouter = express.Router();

courseRouter.get("/courses", async (req,res)=>{
   const result = await findAllCourses();
    res.json({
        data : result
    })
})
export default courseRouter;

