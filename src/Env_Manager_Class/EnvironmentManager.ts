import dns from "dns/promises";
// import { toolRegistry } from "../agent/toolRegistry";

type EnvState = {
  internet: boolean;
  wifiEnabled: boolean;
  wifiConnected: boolean;
  lastUpdated: number;
};

export class EnvironmentManager {
  private cache: EnvState | null = null;
  private ttl = 5000; // cache valida 5 secondi

  //   la cache serve per evitare:
  // dns.lookup → ogni tool call ❌
  // check_wifi → ogni loop ❌

  // Con cache lo stato viene riusato per 5 secondi risultando in performance molto migliori  ✅
  constructor(private toolRegistry: any) {} // toolRegistry is sended as a param from agent.ts to call the 'check_wifi' tool

  // 🔹 Metodo pubblico principale
  async getState(forceRefresh = false): Promise<EnvState> {
    const now = Date.now();

    if (
      !forceRefresh &&
      this.cache &&
      now - this.cache.lastUpdated < this.ttl
    ) {
      return this.cache;
    }

    // make some cache logs to see if cache is working when you add more tools that require internet, to see that cache 'ttl' works properly
    const fresh = await this.computeState();
    this.cache = fresh;
    return fresh;
  }

  // 🔹 Calcolo reale dello stato
  private async computeState(): Promise<EnvState> {
    console.log("wifi check hit");
    const [internet, wifi] = await Promise.all([
      this.hasInternet(), // check real connection
      this.toolRegistry["check_wifi"]({}), // checks the wifi status
    ]);

    console.log("wifi check hit sec:", internet, wifi);
    return {
      internet,
      wifiEnabled: wifi.wifiEnabled ?? false,
      wifiConnected: wifi.connected ?? false,
      lastUpdated: Date.now(),
    };
  }

  // 🔹 Check internet
  private async hasInternet(): Promise<boolean> {
    try {
      await dns.lookup("api.openai.com");
      return true;
    } catch {
      return false;
    }
  }

  // 🔹 Utility opzionale
  invalidateCache() {
    console.log("invalidateCache hit =", this.cache);
    this.cache = null;
  }
}

// Obiettivi:

// ✅ stato centralizzato

// ⚡ cache (evita chiamate ripetute)

// 🔄 refresh controllato

// 🧠 riusabile da Pre-flight + Guard Layer

// Environment Manager → "com’è il sistema"
// Guard Layer → "posso fare questa azione?"
// LLM → "cosa devo fare?"
