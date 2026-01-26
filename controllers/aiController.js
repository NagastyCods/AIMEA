import { openai} from "../config/openai.js";

export const aiMedicalAssistant = async (req, res) => {
    try {
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ error: "Message is required" });
        }

        // AI Prompt
        const prompt = `
You are an AI medical emergency assistant. 
Provide safe, calm, step-by-step medical guidance.
Do NOT give diagnoses. Do NOT replace a doctor. 
Keep responses simple, clear, and actionable.
User message: ${message}
`;

        // OpenAI API call
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini", 
            messages: [
                { role: "system", content: "You are a medical emergency assistant AI." },
                { role: "user", content: prompt }
            ],
            temperature: 0.3
        });

        const reply = completion.choices[0].message.content;

        return res.json({ reply });

    } catch (error) {
        console.error("AI ERROR:", error);
        return res.status(500).json({
            error: "AI processing failed",
        });
    }
};
