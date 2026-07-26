import { prisma } from "../../lib/Prisma.js";
import {NotionAPI} from "notion-client";

const notion = new NotionAPI();
async function fetchNotesContent(subject_name:string, chapter_name?:string){
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
    if(chapter_name){ //if there is chapter name , give that content 

        const chapterObject = result2.find((chapter)=>chapter.chapterName === chapter_name.replaceAll("-", " "))
        try{
            //@ts-ignore
            recordMap = await notion.getPage(chapterObject?.pageId)
        
        }
        catch(error){
            console.error("Error fetching page from Notion:", error)
        }
        
    } // else give the content of the first chapter of that subject
    else{
        try{
            //@ts-ignore
            recordMap = await notion.getPage(result2[0]?.pageId)
        }
        catch(error){
            console.error("Error fetching page from Notion:", error)
        }
    }

    return { recordMap, result2 }
}

export default fetchNotesContent