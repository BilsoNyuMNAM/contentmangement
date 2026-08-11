import "dotenv/config";
import { prisma } from "../../lib/Prisma.js";
import {NotionAPI} from "notion-client";
import {redis, safeGet, safeSet}from "./redis.js";

const rawToken = process.env.NOTION_TOKEN_V2 ?? "";
const authToken = rawToken.includes("%") ? decodeURIComponent(rawToken) : rawToken;


const notion = new NotionAPI({
    authToken: authToken,
    ofetchOptions: {
        headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        }
    }
});
async function fetchNotesContent(subject_name:string, chapter_name?:string){
    await redis; // wait for connection attempt (won't throw — error is caught in redis.ts)
    let result;
    let result2;
    subject_name = subject_name.replaceAll("-", " ");
    const cacheData= await safeGet(subject_name);
    
    if(!cacheData){
        result = await prisma.course.findFirst({
            where:{
                title:subject_name
            }
        })
        if(result){
            await safeSet(subject_name, JSON.stringify(result));
        }
    } 
    else{
        result = JSON.parse(cacheData);
    }

    if(!result){
        return null; 
    }
    const cachedChapterList = await safeGet(result.id); 
    
    if(!cachedChapterList){ //no cache with the subject_id is present , then query the database and cache it 
        result2 = await prisma.chapter.findMany({ 
            where:{
                courseId: result.id
            },
            orderBy:{
                'id': 'asc'
            }
        })
        if(result2 && result2.length > 0){
            await safeSet(result.id, JSON.stringify(result2));
        }
    } else{
        result2 = JSON.parse(cachedChapterList);
    }
   

    if(!result2 || result2.length === 0){ //
        return null;
    }
    

    let  recordMap = null
    if(chapter_name){ //if there is chapter name , give that content 
        
        const normalizeSlug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
        const targetSlug = normalizeSlug(chapter_name);

        const chapterObject = result2.find((chapter: any) => 
            chapter.chapterName === chapter_name.replaceAll("-", " ") ||
            chapter.chapterName.replaceAll(" ", "-").toLowerCase() === chapter_name.toLowerCase() ||
            normalizeSlug(chapter.chapterName) === targetSlug
        );

        //{id: , chapterName: , pageId: , courseId:}
        if(!chapterObject){ //result2 has all the chapters of that subject, if the chapter name is there there that means , it is also not present in the database
            return null;
        }
        try{
            //@ts-ignore
            const cachedNotionpage = await safeGet(chapterObject?.pageId) ////check if there is any cache for the chapter (stores as : pageId as the key)
            if(!cachedNotionpage){
                 recordMap = await notion.getPage(chapterObject?.pageId)
                 await safeSet(chapterObject?.pageId, JSON.stringify(recordMap))
            }
            else{
                recordMap = JSON.parse(cachedNotionpage);
            }
        }
        catch(error){
            console.error("❌ Error fetching from Notion | pageId:", chapterObject?.pageId);
            console.error(error)
            return null;
        }
        
    } 
    else{ // there was no chapter_name coming from the request 
        try{
            //@ts-ignore
            const cachedNotionpage = await safeGet(result2[0]?.pageId)
            if(!cachedNotionpage){
                recordMap = await notion.getPage(result2[0]?.pageId)
                await safeSet(result2[0]?.pageId, JSON.stringify(recordMap))
            }
            else{
                recordMap = JSON.parse(cachedNotionpage);
            }
        }
        catch(error){
            console.error("❌ Error fetching from Notion (first chapter) | pageId:", result2[0]?.pageId);
            console.error(error)
            return null;
        }
    }

    return { recordMap, result2 }
}

export default fetchNotesContent