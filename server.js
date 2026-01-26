import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import aiRoutes from "./routes/aiRoutes.js";
dotenv.config();
import bodyParser from "body-parser";
import multer from "multer"
import OpenAI from "openai"
import fs from "fs"
import path from 'path';
import { fileURLToPath } from 'url';   
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const app = express();
const port = process.env.PORT || 5000;
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// routes
app.use('/api', aiRoutes);

const upload = multer({ dest: "uploads/" });


// openAI api key
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

app.post('/api/ai', upload.single('image'), async (req, res) => {
    try{
        let input;

        if(req.file){
            const imageBuffer = fs.readFileSync(req.file.path);
            const base64Image = imageBuffer.toString("base64");

            input = [
                {
                    role: "user",
                    content: [
                        {
                            type: "input_text",
                            text:req.body.question || " "
                        },
                        {
                            type: "input_image",
                            image_url: `data:image/jpeg;base64,${base64Image}`
                        }
                    ]
                }
            ]
        }
        else{
            input = req.body.question;
        }
        const response = await openai.responses.create({
            model: "gpt-4o-mini",
            input
        });

        if(req.file) fs.unlinkSync(req.file.path);

        res.json({answer: response.output_text})
    }
    catch(error){
        console.error("OPENAI ERROR:", error.response?.data || error.message);
        res.status(500).json({answer: "Cannot connect to API"});
    }
    
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});