const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });

const textFromCandidate = (payload) =>
  (payload.candidates?.[0]?.content?.parts || [])
    .map((part) => part.text || "")
    .join("")
    .trim();

export async function onRequestPost(context) {
  const apiKey = context.env.GEMINI_API_KEY;
  if (!apiKey) {
    return json(
      { error: "Math AI is not configured yet. Add GEMINI_API_KEY in Cloudflare." },
      503
    );
  }

  let body;
  try {
    body = await context.request.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }

  const message = String(body.message || "").trim();
  if (!message || message.length > 2000) {
    return json({ error: "Please enter a question under 2,000 characters." }, 400);
  }

  const contextData = body.context && typeof body.context === "object" ? body.context : {};
  const history = Array.isArray(body.history)
    ? body.history
        .slice(-10)
        .filter((item) => item && ["user", "model"].includes(item.role))
        .map((item) => ({
          role: item.role,
          parts: [{ text: String(item.text || "").slice(0, 4000) }]
        }))
    : [];

  const lessonContext = [
    contextData.lessonId ? `Lesson ID: ${String(contextData.lessonId).slice(0, 40)}` : "",
    contextData.title ? `Lesson title: ${String(contextData.title).slice(0, 300)}` : "",
    contextData.summary ? `Lesson summary: ${String(contextData.summary).slice(0, 1000)}` : "",
    contextData.lessonContent
      ? `Lesson material:\n${String(contextData.lessonContent).slice(0, 12000)}`
      : ""
  ]
    .filter(Boolean)
    .join("\n\n");

  const requestBody = {
    systemInstruction: {
      parts: [
        {
          text:
            "You are Math AI, a patient mathematics tutor embedded in an interactive course. " +
            "Answer in clear English. Use the supplied lesson as the primary context. " +
            "Explain reasoning step by step, define notation, and prefer hints before giving a final answer. " +
            "Use plain-text LaTeX delimiters $...$ and $$...$$ for formulas. " +
            "Do not claim to have seen material that was not supplied. " +
            "If a question is unrelated to mathematics or the course, gently redirect the learner."
        }
      ]
    },
    contents: [
      {
        role: "user",
        parts: [{ text: `Course context:\n${lessonContext || "General mathematics course."}` }]
      },
      {
        role: "model",
        parts: [{ text: "I will use this course context to tutor the learner." }]
      },
      ...history,
      { role: "user", parts: [{ text: message }] }
    ],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 1200
    }
  };

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify(requestBody)
      }
    );

    const payload = await response.json();
    if (!response.ok) {
      console.error("Gemini API error", response.status, payload?.error?.status);
      return json({ error: "Math AI could not answer right now. Please try again." }, 502);
    }

    const answer = textFromCandidate(payload);
    if (!answer) {
      return json({ error: "Gemini returned an empty response. Please rephrase the question." }, 502);
    }

    return json({ answer });
  } catch (error) {
    console.error("Math AI request failed", error);
    return json({ error: "Math AI is temporarily unavailable." }, 502);
  }
}

export function onRequest(context) {
  if (context.request.method === "POST") return onRequestPost(context);
  return json({ error: "Method not allowed." }, 405);
}
