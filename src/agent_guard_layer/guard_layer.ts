import { askUserPermission } from "./askUserPermission";
import { hasInternet } from "./has_internet";
import { toolPolicies } from "./ToolPolicy";

export async function guardToolExecution(toolCall: any) {
  const policy = toolPolicies[toolCall.name];
  console.log("policy check here,", policy);
  if (!policy) {
    throw new Error(`Unknown tool: ${toolCall.name}`);
  }

  // 🌐 check internet if a tool require it (os tools dont need it)
  if (policy.requiresInternet) {
    console.log("policy check internet here,", policy, policy.requiresInternet);
    const hasNet = await hasInternet();
    if (!hasNet) {
      return {
        success: false,
        error: "No internet connection",
      };
    }
  }

  // 🔐 permission check (Os tools often requires this check)
  if (policy.requiresPermission) {
    const allowed = await askUserPermission(
      `Agent wants to execute ${toolCall.name}. Allow?`,
    );

    if (!allowed) {
      return {
        success: false,
        error: "User denied permission",
      };
    }
  }

  return { success: true };
}
