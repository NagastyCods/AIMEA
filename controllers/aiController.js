import fs from "fs";
import ChatHistory from "../models/chatHistory.js";
import { openai } from "../config/openai.js";

export const aiMedicalAssistant = async (req, res) => {
  try {
    const message = req.body.message;
    const image = req.file;
    const sessionId = req.body.sessionId;
    const userId = req.user.userId;

    if (!message && !image) {
      return res.status(400).json({
        reply: "Please describe the emergency or send an image."
      });
    }

    // SYSTEM SAFETY PROMPT (VERY IMPORTANT)
    const systemPrompt = `You are AIMEA, an AI Medical Emergency Assistant. Rules:
    - Stay calm, reassuring, and clear
    - Provide step-by-step FIRST AID guidance
    - DO NOT diagnose diseases - DO NOT replace a doctor
    - If situation is life-threatening, advise calling emergency services immediately
    - Keep responses short, clear, and concise
    - Do NOT use markdown bullets, asterisks, or special formatting characters
    - Reply in plain text with correct spacing and no extra symbols
    - Number all the steps `;

    let imageData = null;
    let content;

    if (image) {
      const imageBuffer = fs.readFileSync(image.path);
      const base64Image = imageBuffer.toString("base64");
      imageData = `data:${image.mimetype};base64,${base64Image}`;

      content = [
        { type: "text", text: message || "Analyze this emergency image." },
        {
          type: "image_url",
          image_url: {
            url: imageData
          }
        }
      ];
    } else {
      content = message;
    }

    let session = null;
    if (sessionId) {
      session = await ChatHistory.findOne({ _id: sessionId, userId });
    }

    if (!session) {
      session = new ChatHistory({
        userId,
        title: message ? message.slice(0, 40) : 'Image chat',
        messages: []
      });
    }

    session.messages.push({
      role: 'user',
      text: message || 'Sent an image',
      imageUrl: imageData,
      createdAt: new Date()
    });

    await session.save();

    const response = await openai.chat.completions.create({
      model: "gpt-5.5",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: content }
      ],
      temperature: 1,
      max_completion_tokens: 500
    });

    if (image) fs.unlinkSync(image.path);

    let reply = response.choices[0].message.content || "Please try again.";
    reply = reply.replace(/^[\s]*[\*•\-]+\s*/gm, "");
    reply = reply.replace(/\n+/g, " ").replace(/\s+/g, " ").trim();

    session.messages.push({
      role: 'ai',
      text: reply,
      createdAt: new Date()
    });
    await session.save();

    res.json({
      reply,
      sessionId: session._id,
      session: {
        _id: session._id,
        title: session.title,
        messages: session.messages,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt
      }
    });

  } catch (error) {
    console.error("OPENAI ERROR:", error);
    res.status(500).json({
      reply: "AI service temporarily unavailable."
    });
  }
};
