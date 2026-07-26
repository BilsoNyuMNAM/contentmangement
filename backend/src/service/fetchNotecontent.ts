import { prisma } from "../../lib/Prisma.js";
import {NotionAPI} from "notion-client";

const notion = new NotionAPI();
async function fetchNotesContent(subject_name:string){
    // console.log("2.inside the fetchNotesContent service")
    const result = await prisma.course.findFirst({
        where:{
            title:subject_name
        }
    })
    if(!result){
        return null;
    }
    const result2 = await prisma.chapter.findMany({
        where:{
            courseId:result.id
        },
        orderBy:{
            'id': 'asc'
        }
    })

    let  recordMap = null
    
    try{
        //@ts-ignore
        recordMap = await notion.getPage(result2[0]?.pageId)
        
    }
    catch(error){
        console.error("Error fetching page from Notion:", error)
    }

    return { recordMap, result2 }
}

export default fetchNotesContent