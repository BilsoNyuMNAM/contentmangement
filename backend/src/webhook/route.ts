import express from "express";
import { verifyWebhookSignature } from "@notionhq/client"
import {redis,safeDelete} from "../service/redis.js"
import { syncFromNotion } from "../service/syncFromNotion.js";
import {prisma} from "../../lib/Prisma.js";
import { json } from "node:stream/consumers";
const webHookRouter = express.Router();
webHookRouter.use(express.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf.toString(); // Save the raw text for later!
  }
}));

//add a middle ware that verify the event is from notion and not from any other source
let verificationToken = process.env.NOTION_VERIFICATION_TOKEN || "";

async function verifyNotionEvent(header:any, rawRequestBody:any){
    const isTrustedPayload = await verifyWebhookSignature({
    body: rawRequestBody,
    signature: header,
    verificationToken,
    })
    return isTrustedPayload
}

webHookRouter.post("/webhook", async (req, res) => {
    // console.log("this route is being hit by notion webhook")
    let token;
    let header;
    
    if(req.body.verification_token){
        token = req.body.verification_token;
        console.log("token:", token);
        return res.status(200).json({

        });
    }
    else{
        
        let event = req.body.type;
        header = req.headers["x-notion-signature"];
        await redis; //connect to redis server

        if(event === "page.content_updated"){
            // console.log("rawBody:", (req as any).rawBody);
            // console.log("header:", header);
            // console.log("token:", verificationToken);
            const result = await verifyNotionEvent(header, (req as any).rawBody);
            if(result){ //if the verification is successfull 
                const pageId = req.body.entity.id;
                const result = await safeDelete(pageId); //delete the cache
                if(result ===1){
                    return res.status(200).json({
                    message: "Cache deleted successfully"
                    });
                }
                else{ 
                    return res.status(500).json({
                        message: "Failed to delete cache"
                    });
                }
            }
            else{
                return res.status(401).json({
                    message: "Unauthorized"
                });
            }
        }

        else if(event === "page.created" || event == "page.deleted" || event === "page.properties_updated"){
            const result = await verifyNotionEvent(header, (req as any).rawBody);
            if(result){ // if the verfication is successfull

                await safeDelete("tag");//delete the cache 
                
                const query_result = await prisma.chapter.findFirst({ //get the course.id and
                    where:{
                        pageId:req.body.entity.id
                    },
                    include:{
                        course:{
                            select:{
                                title:true,
                            }
                        }
                    }
                })
                await safeDelete(query_result?.courseId?.toString() || "");// delete the cache
                await safeDelete(query_result?.course?.title || ""); //delete the cache for the course title
                 //sync the notion data with the database
                await syncFromNotion(); 
                return res.status(200).json({
                    message: "Cache deleted successfully"
                });
            }
            else{ // this block is executed when the verification of the event request fails 
                return res.status(401).json({
                    message: "Unauthorized"
                });
            }
        }
        else{
            return res.status(200).json({
                message: "Event ignored"
            });
        }
    }
})


export default webHookRouter;