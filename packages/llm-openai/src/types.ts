/**
 * OpenAI adapter configuration options
 */
export type OpenAICallLlmOptions = {
  /**
   * OpenAI API endpoint URL
   * @default "https://api.openai.com/v1"
   */
  baseURL?: string;

  /**
   * OpenAI API key
   */
  apiKey: string;

  /**
   * Model name (e.g., "gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo")
   */
  model: string;

  /**
   * System prompt to prepend to all conversations
   */
  systemPrompt: string;

  /**
   * Sampling temperature (0-2)
   * Higher values make output more random, lower values more deterministic
   */
  temperature?: number;

  /**
   * Top-P (nucleus) sampling parameter (0-1)
   * Alternative to temperature for controlling randomness
   */
  topP?: number;
};
