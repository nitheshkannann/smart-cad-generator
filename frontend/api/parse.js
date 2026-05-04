export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { description } = req.body;

    if (!description) {
      return res.status(400).json({ error: "Missing description" });
    }

    const prompt = `
Extract CAD parameters from this:
"${description}"

Return ONLY valid JSON:
{
  "length": number,
  "width": number,
  "height": number,
  "thickness": number,
  "holeCount": number
}
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await response.json();
    
    // Check if OpenAI returned an error (e.g. invalid API key)
    if (data.error) {
      console.error("OpenAI Error:", data.error);
      return res.status(500).json({ error: "OpenAI API Error", details: data.error.message });
    }

    const content = data.choices[0].message.content;

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: "LLM did not return valid JSON", content: content });
    }
    
    const parsed = JSON.parse(jsonMatch[0]);

    return res.status(200).json(parsed);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "LLM parsing failed", details: err.message });
  }
}
