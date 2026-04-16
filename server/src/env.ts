import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  BASE_URL: z.string().optional(),

  AI_PROVIDER: z.enum(["gemini", "ollama"]).default("gemini"),

  GEMINI_LLM_MODEL: z.string().default("gemini-2.5-flash"),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_IMAGE_MODEL: z.string().default("gemini-2.5-flash-image"),

  TAVILY_API_KEY: z.string().optional(),

  OLLAMA_HOST: z.string().default("http://localhost:11434"),
  OLLAMA_LLM_MODEL: z.string().default("qwen3.5:4b"),
  OLLAMA_IMAGE_MODEL: z.string().default("x/flux2-klein:4b"),
}).superRefine((env, ctx) => {
  if (env.AI_PROVIDER === "gemini" && !env.GEMINI_API_KEY) {
    ctx.addIssue({
      code: "custom",
      path: ["GEMINI_API_KEY"],
      message: "GEMINI_API_KEY is required when AI_PROVIDER=gemini.",
    });
  }
});

export const env = envSchema.parse(process.env);
