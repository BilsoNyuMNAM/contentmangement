import express from "express";
import findAllCourses from "../service/ findallcourse.js";
const courseRouter = express.Router();

courseRouter.get("/courses", async (req,res)=>{
   const result = await findAllCourses();
   console.log(typeof(result[0]?.id))
    return res.json({
        data : result
    })
    
})
export default courseRouter;

