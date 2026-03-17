// The worker that actually enable the wifii if it was not Enabled

import { exec } from "child_process";

export function enableWifi(): Promise<any> {
  console.log("wifii function wifiEnabled called");
  return new Promise((resolve, reject) => {
    exec('netsh interface set interface "Wi-Fi" enable', (error) => {
      if (error) {
        console.log("wifii function enabled =", error);
        reject(error);
        return;
      }
      console.log("wifii function wifiEnabled resolve");
      // resolve funge da return
      resolve({
        success: true,
        message: "WiFi enabled",
      });
    });
  });
}
