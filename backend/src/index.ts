import express from "express";
import courseRouter from "./course/route.js";
import noteRouter from "./notes/route.js";
import adminRouter from "./admin/route.js";
import searchRouter from "./search/route.js";
import cors from "cors";

const PORT = process.env.PORT || 3000;
const app = express();

app.get("/health", (req, res) => {
    res.status(200).send("OK");
});
app.use(cors());
app.use("/api/v1", courseRouter);
app.use("/api/v1", noteRouter);
app.use("/api/v1", searchRouter);
app.use("/api/v1/admin", adminRouter);

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});