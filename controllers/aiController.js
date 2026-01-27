import fs from "fs";
import { openai } from "../config/openai.js";

export const aiMedicalAssistant = async (req, res) => {
  try {
    const message = req.body.message;
    const image = req.file;

    if (!message && !image) {
      return res.status(400).json({
        reply: "Please describe the emergency or send an image."
      });
    }

    // SYSTEM SAFETY PROMPT (VERY IMPORTANT)
    const systemPrompt = `
You are AIMEA, an AI Medical Emergency Assistant.

Rules:
- Stay calm, reassuring, and clear
- Provide step-by-step FIRST AID guidance
- DO NOT diagnose diseases
- DO NOT replace a doctor
- If situation is life-threatening, advise calling emergency services immediately
- Keep responses short and actionable
`;

    let input;

    if (image) {
      const imageBuffer = fs.readFileSync(image.path);
      const base64Image = imageBuffer.toString("base64");

      input = [
        {
          role: "user",
          content: [
            { type: "input_text", text: message || "Analyze this emergency image." },
            {
              type: "input_image",
              image_url: `data:image/jpeg;base64,${base64Image}`
            }
          ]
        }
      ];
    } else {
      input = message;
    }

    const response = await openai.responses.create({
      model: "gpt-4o-mini",
      input,
      temperature: 0.3,
      instructions: systemPrompt
    });

    if (image) fs.unlinkSync(image.path);

    res.json({
      reply: response.output_text || "Please try again."
    });

  } catch (error) {
    console.error("OPENAI ERROR:", error);
    res.status(500).json({
      reply: "AI service temporarily unavailable."
    });
  }
};
