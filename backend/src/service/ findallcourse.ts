// import {prisma} from "../../lib/Prisma.js"
// import {redis, safeCourse, safeSet} from "./redis.js"
// async function findAllCourses() {
//     let courses;
//     await redis;
//     const cachedCourses = await safeCourse();
//     if (!cachedCourses) {
//         courses = await prisma.course.findMany();
//         if(courses){
//             await safeSet("course", JSON.stringify(courses));
//         }
        
//     }
//     else{
//         courses = JSON.parse(cachedCourses);
//     }
    
//     return courses;
// }

// export default findAllCourses