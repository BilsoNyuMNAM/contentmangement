import { prisma } from "../../lib/Prisma.js";
import { redis, safeGet, safeSet } from "./redis.js";

async function findAllCourses() {
    let courses;
    await redis;
    const cachedCourses = await safeGet("courses");
    if (!cachedCourses) {
        courses = await prisma.course.findMany();
        if (courses) {
            await safeSet("courses", JSON.stringify(courses));
        }
    } else {
        courses = JSON.parse(cachedCourses);
    }

    return courses;
}

export default findAllCourses;