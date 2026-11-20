const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

async function askForJson(system, userMessage, validate) {
  let lastError;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: userMessage }] }],
          generationConfig: {
            responseMimeType: "application/json",
            maxOutputTokens: 4096,
            temperature: 0.7,
          },
        }),
      });
      if (!res.ok)
        throw new Error(`Gemini API ${res.status}: ${await res.text()}`);

      const json = await res.json();
      const text = (json.candidates?.[0]?.content?.parts || [])
        .map((p) => p.text || "")
        .join("");
      const data = JSON.parse(text.replace(/```json|```/g, "").trim());
      validate(data);
      return { data, tokens: json.usageMetadata?.totalTokenCount ?? null };
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

export function generateProposal({ title, client_name, brief }) {
  const system =
    "You are an assistant for a freelancer based in India. Write a concise, professional project proposal. " +
    'All prices must be in Indian Rupees (INR), written like "₹40,000 – ₹60,000". Never use dollars. ' +
    "Respond with ONLY JSON in this shape: " +
    '{"summary": string, "deliverables": string[], "timeline": string, "price_estimate": string}';
  const user = `Project: ${title}\nClient: ${client_name || "N/A"}\nClient brief:\n${brief}`;

  return askForJson(system, user, (d) => {
    if (
      typeof d.summary !== "string" ||
      !Array.isArray(d.deliverables) ||
      typeof d.timeline !== "string" ||
      typeof d.price_estimate !== "string"
    ) {
      throw new Error("Invalid proposal shape");
    }
  });
}

export function generateTasks({ title, brief }) {
  const system =
    "You are a project planner for a freelancer. Break the project into 5-10 concrete, ordered tasks. " +
    'Respond with ONLY JSON in this shape: {"tasks": [{"title": string, "estimate_hrs": number}]}';
  const user = `Project: ${title}\nBrief:\n${brief}`;

  return askForJson(system, user, (d) => {
    if (
      !Array.isArray(d.tasks) ||
      d.tasks.length === 0 ||
      d.tasks.some((t) => typeof t.title !== "string")
    ) {
      throw new Error("Invalid tasks shape");
    }
  });
}
