// import { PrismaClient } from "./generated/prisma/client.js";
import express from "express";
import courseRouter from "./course/route.js";
import noteRouter from "./notes/route.js";
import cors from "cors";
import webHookRouter from "./webhook/route.js";
const PORT = process.env.PORT || 3000;
const app = express();
//  const prisma = new PrismaClient();
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});
app.use(cors());
app.use("/api/v1", webHookRouter);
app.use("/api/v1", courseRouter);
app.use("/api/v1", noteRouter);
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);

});