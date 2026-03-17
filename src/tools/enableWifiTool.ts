// The tool that call the worker that Enable wifii

import { FunctionTool } from "openai/resources/responses/responses";

export const enableWifiTool: FunctionTool = {
  type: "function",
  name: "enable_wifi",
  description: "Enable WiFi on the system",
  parameters: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
  strict: true,
};
