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
    const systemPrompt = `You are AIMEA, an AI Medical Emergency Assistant.

Rules:
- Stay calm, reassuring, and clear
- Provide step-by-step FIRST AID guidance
- DO NOT diagnose diseases
- DO NOT replace a doctor
- If situation is life-threatening, advise calling emergency services immediately
- Keep responses short and actionable`;

    let content;

    if (image) {
      const imageBuffer = fs.readFileSync(image.path);
      const base64Image = imageBuffer.toString("base64");

      content = [
        { type: "text", text: message || "Analyze this emergency image." },
        {
          type: "image_url",
          image_url: {
            url: `data:image/jpeg;base64,${base64Image}`
          }
        }
      ];
    } else {
      content = message;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: content }
      ],
      temperature: 0.3,
      max_tokens: 500
    });

    if (image) fs.unlinkSync(image.path);

    res.json({
      reply: response.choices[0].message.content || "Please try again."
    });

  } catch (error) {
    console.error("OPENAI ERROR:", error);
    res.status(500).json({
      reply: "AI service temporarily unavailable."
    });
  }
};
