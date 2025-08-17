import axios from "axios";
import { CONFIG } from "./config";

export interface AIDecision {
  decision: "long" | "short" | "flat";
  confidence: number;
  prompt: string;
  rawResponse: string;
}

export async function getModelName(): Promise<string> {
  return CONFIG.ollamaModel;
}

export async function askOllama(features: any): Promise<AIDecision> {
  try {
    const prompt =
      'You are a trading signal model. Respond ONLY as JSON {"decision":"long|short|flat","confidence":0..1}\\nFeatures: ' +
      JSON.stringify(features);

    const res = await axios.post(
      `${CONFIG.ollamaHost}/api/generate`,
      {
        model: CONFIG.ollamaModel,
        prompt,
        stream: false,
      },
      { timeout: 15000 }
    );

    const text: string = res.data?.response || "";
    const match = text.match(/\{.*\}/s);
    if (!match) throw new Error("No JSON in Ollama response");

    const parsed = JSON.parse(match[0]);
    return {
      decision:
        parsed.decision === "long" || parsed.decision === "short"
          ? parsed.decision
          : "flat",
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0,
      prompt,
      rawResponse: text
    };
  } catch (err) {
    console.error("Ollama error:", err);
    return { decision: "flat", confidence: 0, prompt: "", rawResponse: "" };
  }
}
