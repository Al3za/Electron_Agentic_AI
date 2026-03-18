import { dialog } from "electron"; // inbuild function di eectron

export async function askUserPermission(message: string) {
  const result = await dialog.showMessageBox({
    type: "question",
    buttons: ["Allow", "Deny"],
    defaultId: 0,
    message,
  });

  console.log("result hit=", result);

  return result.response === 0;
}
