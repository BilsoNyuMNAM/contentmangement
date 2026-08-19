import "dotenv/config";
import {Client} from "@notionhq/client"
import { upsertCourse } from "./upsert.js";
type Chapter =  { PageId: string; ChapterName: string | null; CourseName: string | null; Tag: string | null; Order: number | null; }
const notion = new Client({ auth: process.env.NOTION_API_KEY || ""});

async function syncFromNotion() {
    
    const response = await notion.dataSources.query({
        data_source_id: process.env.NOTION_DATABASE_ID || " ",
    });
    let data: Chapter[] = [];
    response.results.forEach((chapterObject)=>{ //chapterObject is an object  . it has a key called properties which is an object containing the following keys: order, Course Name, Tag, Chapter Name
        let chapter = new Object();
        //@ts-ignore
        chapter.ChapterName = chapterObject.properties["Chapter Name"].title.length > 0 ? chapterObject.properties["Chapter Name"].title[0].text.content: null;
        //@ts-ignore
        chapter.CourseName = chapterObject.properties["Course Name"].select != null ? chapterObject.properties["Course Name"].select.name: null ;
        //@ts-ignore
        chapter.PageId = chapterObject.id;
        //@ts-ignore
        chapter.Tag = chapterObject.properties["Tag"].select != null ? chapterObject.properties["Tag"].select.name: null ;
        //@ts-ignore
        chapter.Order = chapterObject.properties["order"].number != null ? chapterObject.properties["order"].number: null ;
        //@ts-ignore
        data.push(chapter);
    });
    try{
        await upsertCourse(data); // Call the upsertCourse function to update the database with the fetched data
        return { success: true};
    }catch(err:any){
        return { success: false, error: err.message || err };
    }
    // console.log("Rows fetched:", response.results.length);
    
}


export { syncFromNotion }
