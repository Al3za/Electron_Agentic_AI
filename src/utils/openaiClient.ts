import OpenAI from "openai";
import "dotenv/config";
// console.log("process.env.OPENAI_API_KEY here", process.env.OPENAI_API_KEY);

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
