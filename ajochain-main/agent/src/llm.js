import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/// Call GPT-4o and parse the JSON response
export async function askTreasurer(prompt) {
  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content:
          "You are AjoChain's AI Treasurer — an autonomous on-chain financial agent managing rotating savings groups. You reason carefully, act proportionally, and always explain your decisions clearly. You respond only in valid JSON.",
      },
      { role: "user", content: prompt },
    ],
    temperature:     0.2,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0].message.content;
  try {
    return JSON.parse(raw);
  } catch {
    console.error("LLM returned non-JSON:", raw);
    throw new Error("LLM response was not valid JSON");
  }
}
