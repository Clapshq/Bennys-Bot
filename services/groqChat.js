import { env } from "../core/env.js";

export function isGroqConfigured() {
  return Boolean(env.groqApiKey);
}

/**
 * Groq chat completion (tekst og valgfri billed-URLs til vision).
 */
export async function groqChat(messages, { json = false, model, maxTokens = 1024, temperature = 0.3 } = {}) {
  if (!env.groqApiKey) {
    throw new Error("GROQ_API_KEY mangler i .env");
  }

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.groqApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model ?? env.groqChatModel,
      messages,
      temperature,
      max_completion_tokens: maxTokens,
      ...(json ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Groq ${res.status}: ${err.slice(0, 250)}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

export function parseJsonFromAi(text) {
  const raw = String(text ?? "").trim();
  const block = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const payload = block ? block[1] : raw;
  const start = payload.indexOf("{");
  const end = payload.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("AI returnerede ikke JSON");
  return JSON.parse(payload.slice(start, end + 1));
}

/** Vision: tekst + billed-URL(s) */
export async function groqVision(prompt, imageUrls, options = {}) {
  const content = [{ type: "text", text: prompt }];
  for (const url of imageUrls.slice(0, 3)) {
    content.push({ type: "image_url", image_url: { url } });
  }

  return groqChat([{ role: "user", content }], {
    model: options.model ?? env.groqVisionModel,
    json: options.json ?? false,
    maxTokens: options.maxTokens ?? 2048,
    temperature: options.temperature ?? 0.1,
  });
}
