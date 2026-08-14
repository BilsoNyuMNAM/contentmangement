import "dotenv/config";
import { Client } from "@notionhq/client";
const notion = new Client({ auth: process.env.NOTION_API_KEY || ""});
async function run() {
    const response = await notion.dataSources.query({
        data_source_id: process.env.NOTION_DATABASE_ID || "",
    });
    console.log("Property keys:", Object.keys(response.results[0].properties));
}
run();
