// Tool list to check the wifii status (On or off)
import { FunctionTool } from "openai/resources/responses/responses";

export const checkWifiTool: FunctionTool = {
  type: "function",
  name: "check_wifi",
  description: "Check if WiFi is enabled on the system",
  parameters: {
    type: "object",
    properties: {}, // no props needed
    additionalProperties: false,
  },
  strict: true,
};
