import { EnvironmentManager } from "../Env_Manager_Class/EnvironmentManager";
import { askUserPermission } from "./askUserPermission";
// import { hasInternet } from "./has_internet";
import { toolPolicies } from "./ToolPolicy";

// Guard Layer → "posso fare questa azione?"

export async function guardToolExecution(
  toolCall: any,
  env: EnvironmentManager,
) {
  const policy = toolPolicies[toolCall.name];
  console.log("policy check here,", policy);

  // State check:
  const state = await env.getState(); // usa cache senza chiamare piu' volte una funzione che era
  // gia stata invocata prima(in questo caso serve a non chiamare sempre la fun hasInternet ogni volta che l'agente chiama un tool).
  // questo e' importante perche evita':
  // dns.lookup → ogni tool call ❌
  // check_wifi → ogni loop ❌

  // Con cache lo stato viene riusato per 5 secondi risultando in performance molto migliori  ✅

  // 🌐 check internet if a tool require it (os operation tools usually dont need it)
  if (policy?.requiresInternet && !state.internet) {
    // throw new Error(`Unknown tool: ${toolCall.name}`);
    return {
      success: false,
      error: "No internet connection",
    };
  }

  // 🌐 check internet if a tool require it (os operation tools usually dont need it)
  // if (policy.requiresInternet) {
  //   console.log("policy check internet here,", policy, policy.requiresInternet);
  //   const hasNet = await hasInternet();
  //   if (!hasNet) {
  //     return {
  //       success: false,
  //       error: "No internet connection",
  //     };
  //   }
  // }

  // 🔐 permission check (Os tools often requires this check)
  if (policy?.requiresPermission) {
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

// Environment Manager → "com’è il sistema"
// Guard Layer → "posso fare questa azione?"
// LLM → "cosa devo fare?"
