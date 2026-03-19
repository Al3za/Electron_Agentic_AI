import dns from "dns/promises"; // per fare fetch ad internet

// questo non viene piu' usato
export async function hasInternet() {
  console.log("hasInternet function hit");
  try {
    await dns.lookup("api.openai.com");
    return true;
  } catch {
    return false;
  }
}
