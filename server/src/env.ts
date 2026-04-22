import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  BASE_URL: z.string().optional(),
  TAVILY_API_KEY: z.string().optional(),
  OLLAMA_HOST: z.string().default("http://localhost:11434"),
  OLLAMA_LLM_MODEL: z.string().default("qwen3.5:4b"),
  OLLAMA_IMAGE_MODEL: z.string().default("x/flux2-klein:4b"),
});

export const env = envSchema.parse(process.env);
