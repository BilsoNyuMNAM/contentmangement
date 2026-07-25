import {prisma} from "../lib/Prisma.js"


async function seedCoursetable(){
    await prisma.course.createMany({
        data:[{
            title: "React"
        }, {
            title:"Database"
        }, {
            title:"Devops"
        }]
    })
}
seedCoursetable();
