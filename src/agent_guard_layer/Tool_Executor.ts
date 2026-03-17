import { toolRegistry } from "../agent/toolRegistry";

export async function executeTool(toolCall: any) {
  const args = JSON.parse(toolCall.arguments);
  const tool = toolRegistry[toolCall.name];
  if (!tool) {
    throw new Error(`Tool not found: ${tool}`);
  }

  const result = await tool(args);
  console.log("result here :", result);

  return await tool(args); //toolRegistry[toolCall.name](args);
}
