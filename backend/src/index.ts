// import { PrismaClient } from "./generated/prisma/client.js";
import express from "express";
import courseRouter from "./course/route.js";
import noteRouter from "./notes/route.js";
import cors from "cors";
const app = express();
//  const prisma = new PrismaClient();

app.use(cors());
app.use("/api/v1", courseRouter);
app.use("/api/v1", noteRouter);

app.listen(3000);