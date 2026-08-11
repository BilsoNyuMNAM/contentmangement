import express from "express";
// import findAllCourses from "../service/ findallcourse.js";
import findAlltag from "../service/findalltags.js";
import {prisma} from "../../lib/Prisma.js";
import { title } from "node:process";
const courseRouter = express.Router();

// courseRouter.get("/courses", async (req,res)=>{
//    const result = await findAllCourses();
//    console.log(typeof(result[0]?.id))
//     return res.json({
//         data : result
//     })
    
// })
courseRouter.get("/tag", async (req,res)=>{
    const result = await findAlltag();
    return res.json({
        data : result
    })
})

export default courseRouter;

