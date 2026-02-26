import OpenAI from "openai";

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
  async chat(messages: ChatMessage[]): Promise<AIResponse> {
    return {
      content: "This is a mock AI response based on the lesson context.",
      tokenCount: 20,
    };
  }
}

class OpenAIProvider implements AIProvider {
  private client: OpenAI;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set");
    }

    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async chat(messages: ChatMessage[]): Promise<AIResponse> {
    const completion = await this.client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
    });

    return {
      content: completion.choices?.[0]?.message?.content ?? "",
      tokenCount: completion.usage?.total_tokens,
    };
  }
}

export const aiProvider: AIProvider =
  process.env.NODE_ENV === "test"
    ? new MockAIProvider()
    : new OpenAIProvider();
