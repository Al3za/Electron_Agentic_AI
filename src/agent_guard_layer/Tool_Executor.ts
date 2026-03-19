import { toolRegistry } from "../agent/toolRegistry";

export async function executeTool(toolCall: any) {
  const tool = toolRegistry[toolCall.name];
  if (!tool) {
    throw new Error(`Tool not found: ${tool}`);
  }
  const args = JSON.parse(toolCall.arguments);
  const result = await tool(args);
  console.log("result here :", result);

  return await tool(args); //toolRegistry[toolCall.name](args);
}
