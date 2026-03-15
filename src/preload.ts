// Creare preload.ts (per comunicazione IPC tra renderer(frontend) e main(backend))
import { contextBridge, ipcRenderer } from "electron";
// interface res_output {
//   success: boolean;
//   file: string;
// }
// Espone solo le funzioni IPC che il renderer può usare
contextBridge.exposeInMainWorld("electronAPI", {
  // il nome che usiamo
  sendInput: (text: string) => ipcRenderer.send("user-input", text), // user-input e' il keyword che andiamo ad usare per accogliere i message nel backend(main.ts)
  onResponse: (
    callback: (output: string /*res_output*/) => void, // una volta chiamato user-input e fatto le operazioni dei workers, sempre in main.ts e' mandiamo un message('user-input') con i dati di output dei workers e che verra poi inviato al renderer per essere mosrato al fromtend(il frontend)    ipcRenderer.on("llm-response", (event, output) => callback(output)),
  ) => ipcRenderer.on("llm-response", (event, output) => callback(output)),
});
