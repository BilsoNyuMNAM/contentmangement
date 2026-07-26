import { prisma } from "../../lib/Prisma.js";
import {NotionAPI} from "notion-client";

const notion = new NotionAPI();
async function fetchNotesContent(){
    // console.log("2.inside the fetchNotesContent service")
    const result = await prisma.chapter.findFirst({
        where:{
            id: 1, 
            courseId:1 
        }
    })
    let  recordMap = null
    
    try{
        //@ts-ignore
        recordMap = await notion.getPage(result?.pageId)
        
    }
    catch(error){
        console.error("Error fetching page from Notion:", error)
    }
    
    return recordMap
}

export default fetchNotesContent