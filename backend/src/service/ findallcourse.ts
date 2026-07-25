import {prisma} from "../../lib/Prisma.js"

async function findAllCourses() {
    const courses = await prisma.course.findMany();
    return courses;
}

export default findAllCourses