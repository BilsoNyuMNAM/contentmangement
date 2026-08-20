import {prisma} from "../../lib/Prisma.js"
import {redis, safeTag, safeSet} from "./redis.js"

async function findAlltag(){
    let tags;
    await redis;
    const cachedTags = await safeTag();
    if (!cachedTags) {
        tags = await prisma.tag.findMany({
            include:{
                courses:{
                    include:{
                        _count:{
                           select:{
                            chapters:true
                           }
                        }
                    }
                }
            }
        });
        if(tags){
            await safeSet("tag", JSON.stringify(tags));
        }

    }
    else{
        tags = JSON.parse(cachedTags);
    }

    return tags;
}

export default findAlltag;