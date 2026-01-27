import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import aiRoutes from "./routes/aiRoutes.js";
dotenv.config();
import path from 'path';
import { fileURLToPath } from 'url';   
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const app = express();
const port = process.env.PORT || 5000;
app.use(cors());

// serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// routes
app.use("/api", aiRoutes);

// const upload = multer({ dest: "uploads/" })

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});