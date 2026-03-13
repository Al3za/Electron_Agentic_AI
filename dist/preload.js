"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Creare preload.ts (per comunicazione IPC tra renderer(frontend) e main(backend))
const electron_1 = require("electron");
// Espone solo le funzioni IPC che il renderer può usare
electron_1.contextBridge.exposeInMainWorld("electronAPI", {
    // il nome che usiamo
    sendInput: (text) => electron_1.ipcRenderer.send("user-input", text), // user-input e' il keyword che andiamo ad usare per accogliere i message nel backend(main.ts)
    onResponse: (callback) => electron_1.ipcRenderer.on("llm-response", (event, output) => callback(output)),
});
