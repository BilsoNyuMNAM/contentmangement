import { prisma } from "../../lib/Prisma.js";
type Chapter =  { PageId: string; ChapterName: string | null; CourseName: string | null; Tag: string | null; Order: number | null; }
async function upsertCourse(chapterList: Chapter[]) {
    for(const chapter of chapterList){ //since all the 3 tables are related , i need to use $transactions
            const tag = await prisma.tag.upsert({
                where:{
                    tagName:chapter.Tag || "Unknown"
                },
                update:{

                },
                create:{
                    tagName:chapter.Tag || "Unknown"
                }
            })
            const course = await prisma.course.upsert({
                where:{
                    title:chapter.CourseName || "Unknown"
                },
                update:{
                    tagId:tag.id
                },
                create:{
                    title:chapter.CourseName || "Unknown",
                    tagId:tag.id
                }
            })
            await prisma.chapter.upsert({
                where:{
                    pageId:chapter.PageId
                },
                update:{
                    chapterName:chapter.ChapterName || "Unknown",
                    courseId:course.id,
                    order:chapter.Order
                },
                create:{
                    chapterName:chapter.ChapterName || "Unknown",
                    courseId:course.id,
                    pageId:chapter.PageId,
                    order:chapter.Order
                }
            })
        
    }
    
}
export {upsertCourse}