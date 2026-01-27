import express from "express";
import multer from "multer";
import { aiMedicalAssistant } from "../controllers/aiController.js";

const router = express.Router();
const upload = multer({dest:"uploads/"});

router.post("/ai", upload.single("image"), aiMedicalAssistant);

export default router;
