import { syncFromNotion } from "./src/service/syncFromNotion.js";
syncFromNotion().then(console.log).catch(console.error);
