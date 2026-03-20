import { dialog } from "electron"; // inbuild function di elctron. Fa in modo che nella UI compaia 'allow' o 'deny'
// quando facciamo un opreazione sensibile, ad esempio quando il modello deve accendere wifi

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
