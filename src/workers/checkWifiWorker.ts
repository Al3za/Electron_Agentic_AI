// The worker that actually check the wifii status
import { exec } from "child_process";

export function checkWifi(): Promise<any> {
  console.log("wifii function invoked");
  return new Promise((resolve, reject) => {
    exec("netsh interface show interface", (error, stdout) => {
      if (error) {
        console.log("wifii function =", error);
        reject(error);
        return;
      }

      const wifiEnabled =
        stdout.includes("Wi-Fi") && stdout.includes("Enabled");

      console.log("wifii function wifiEnabled", wifiEnabled);

      // resolve funge da return
      resolve({
        wifiEnabled,
        raw: stdout,
      });
    });
  });
}
