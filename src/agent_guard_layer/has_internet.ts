import dns from "dns/promises"; // per fare fetch ad internet

export async function hasInternet() {
  try {
    await dns.lookup("api.openai.com");
    return true;
  } catch {
    return false;
  }
}
