import express from "express";
import { aiMedicalAssistant } from "../controllers/aiController.js";

const router = express.Router();

router.post("/ai", aiMedicalAssistant);

export default router;
