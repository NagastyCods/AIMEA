import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import aiRoutes from "./routes/aiRoutes.js";
import jwt from 'jsonwebtoken';
import bodyParser from 'body-parser';
dotenv.config();
import path from 'path';
import { fileURLToPath } from 'url';   
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const app = express();
const port = process.env.PORT || 5000;
const mongoUrl = process.env.MONGODB_URI || '';

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

// serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// routes
app.use("/api", aiRoutes);

// Connect to MongoDB then start the server
mongoose.connect(mongoUrl)
.then(() => {
    console.log("Connected to MongoDB");
    app.listen(port, () => {
        console.log(`Server is running on http://localhost:${port}`);
    });
})
.catch((error) => {
    console.error("MongoDB connection error:", error);
});