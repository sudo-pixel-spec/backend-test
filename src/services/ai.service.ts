import OpenAI from "openai";
import { env } from "../config/env";

export interface AIResponse {
  content: string;
  tokenCount?: number;
}

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export interface AIProvider {
  chat(messages: ChatMessage[]): Promise<AIResponse>;
}

export class MockAIProvider implements AIProvider {
  async chat(_messages: ChatMessage[]): Promise<AIResponse> {
    return {
      content: "This is a mock AI response based on the lesson context.",
      tokenCount: 20,
    };
  }
}

class OpenAIProvider implements AIProvider {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async chat(messages: ChatMessage[]): Promise<AIResponse> {
    const completion = await this.client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
    });

    const response: AIResponse = {
      content: completion.choices?.[0]?.message?.content ?? "",
    };

    if (completion.usage?.total_tokens != null) {
      response.tokenCount = completion.usage.total_tokens;
    }

    return response;
  }
}

function createAIProvider(): AIProvider {
  if (env.NODE_ENV === "test") {
    return new MockAIProvider();
  }

  if (!env.OPENAI_API_KEY) {
    if (env.NODE_ENV === "production") {
      throw new Error(
        "[AI] OPENAI_API_KEY is required in production. " +
        "Set it in your environment or disable the AI chat module."
      );
    }
    console.warn(
      "[AI] OPENAI_API_KEY is not set. " +
      "Using MockAIProvider for development — set the key to enable real AI."
    );
    return new MockAIProvider();
  }

  return new OpenAIProvider(env.OPENAI_API_KEY);
}

export const aiProvider: AIProvider = createAIProvider();

