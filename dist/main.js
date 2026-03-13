"use strict";
// # Electron main process
// app → gestisce il ciclo di vita dell’applicazione desktop.
// esempio: quando l’app si avvia, quando si chiude, ecc.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// BrowserWindow → crea una finestra desktop “browser-like” in cui puoi caricare HTML/CSS/JS.
// È la finestra principale dell’app Electron.
// sotto c'e' scritto come avviare l'app in dev
const electron_1 = require("electron");
const path_1 = __importDefault(require("path")); // per definire i file da importare dal file sistem
const agent_1 = require("./tools/agent");
require("dotenv/config");
function createWindow() {
    console.log("MAIN STARTED");
    const win = new electron_1.BrowserWindow({
        // BrowserWindow crea un contenitore desktop simile a un browser.
        // Tutto ciò che l’utente vede e con cui può interagire (input, pulsanti, risultati) è dentro questa finestra.
        width: 1000,
        height: 700,
        webPreferences: {
            //   nodeIntegration: true, // Permette al codice JS nella finestra (renderer) di usare Node.js (require, fs, ecc. (Non sicuro))
            preload: path_1.default.join(__dirname, "preload.js"), // file preload combilato in dist dopo  watch--(npm run dev) o build(npm run build). Ora il renderer non ha accesso
            //  diretto a Node e può solo usare le funzioni esposte da preload → molto più sicuro.
            contextIsolation: true, // più sicuro
        },
        // LEGGI ATTENTAMENTE:
        // non usiamo MAI nodeIntegration: true, e nell'index-html file facciamo:
        //  "const { ipcRenderer } = require("electron")" per mandare/ricevere req/res(messaggi dall utente e res dai processi del backend)
        //  altrimenti Il renderer (la finestra dell’utente) ha accesso completo a Node.js(le function sensibili 'fs.readFile', 'process.env...')
        // e quindi se un malintenzionato riesce a far eseguire uno script nella tua pagina (ad esempio tramite
        // XSS o librerie esterne compromesse), può praticamente prendere il controllo del computer
        // per questo separiamo la comunicazione ICP tra backend e' frontend, non scriendo piu' const { ipcRenderer } = require("electron")
        // nel render('index_html') file, ma creando un ponte di itc comunication tramite il file preload
    });
    const path_dir = path_1.default.join(__dirname, "../index.html"); // C:\Users\ale\ai-agent-app\index.html
    console.log("path_dir here", path_dir);
    win.loadFile(path_1.default.join(__dirname, "../index.html")); // garantisce che Electron trovi il file anche su Windows/macOS/Linux.
    // Questo sarà il tuo renderer process, cioè l’interfaccia utente.
    // apre devtools(serve per fare console.log, network, elements, nel browser chronium dentro electron)
    // come facciamo quando vogliamo vedere i log o i request status dentro una pagina web su google
    win.webContents.openDevTools(); //ciao ghgh gfg
}
electron_1.app.whenReady().then(createWindow);
// app.whenReady() → ritorna una Promise che si risolve quando Electron ha finito di inizializzarsi.
// .then(createWindow) → chiama la funzione che crea la finestra solo quando Electron è pronto.
// NOTA! I workers NON devono usare IPC. Il main.ts è l’unico punto dove si parla con il renderer (mandando gli input allo llm e mandare/ricevere le risposte di questi nello renderer peer mostrarlo allo user.)
// IPC listener per ricevere input dal renderer da mandare al 'backend'. Il backend ascolta la comunicazione
// definita dal name id 'user-input'
electron_1.ipcMain.on("user-input", async (event, input) => {
    // qui main.js(il nostro backend) ascoltiamo lo user input mandato da renderer.ts(il nostro frontend), tramite comunicazione IPC by  name id 'user-input'
    const result = await (0, agent_1.runAgent)(input); // runAgent() e' la function  dove passiamo lo html l'input dello user allo llm, e dove a sua volta questo decide che tool invocare(e se c'e' bisogno di invocarlo) per portare a termine il task descritto dallo user input
    event.reply("llm-response", result); // llm-response definito in preload.js, e serve a mandare la res dei workers al renderer cosicche' lo user viene comunicato lo stato della task che ha chiesto, e se e' stata completata
});
// COME AVVIARE L' APP IN DEV :     "dev": "concurrently \"tsc --watch\" \"electronmon --watch dist --exec \\\"npx electron .\\\"\"", (dont start the browser)
// fai npm run dev per testare l'app in dev. Ricorda che elelctron usa un browser(il 'frontend') per creare
// html e js. Quindi siccome stiamo usando ts per scrivere l'app, alcuni file devono essere compilati in js
// Cosa succede quando fai npm run dev? "dev": "npm run build && concurrently \"npm run watch\" \"electronmon --watch dist electron .\"", (a volte si usa(ma non in questo caso) wait-on dist/main.js && electronmon così Electron parte solo dopo la prima compilazione e non da' error)
// succedono due processi paralleli fhfh:
//(il build avviene 1 sola volta quando facciamo npm run dev, non ogni volta che cambiamo un file)
// Processo 1 — TypeScript compiler (tsc -w)
// questo fa':
// legge i file in src/
// ↓
// compila in JavaScript
// ↓
// salva i file in dist/
// ex:
// src/main.ts        → dist/main.js
// src/preload.ts     → dist/preload.js
// src/renderer.ts    → dist/renderer.js
// Se dist non esiste, tsc la crea automaticamente.
// 2️⃣ Processo 2 — electronmon (electronmon .)
// Electron guarda nel package.json:
// "main": "dist/main.js" e quindi avvia dist/main.js
// Cosa succede quando modifichi un file?
// se per esempio modifico src/renderer.ts
// tsc --watch rileva il cambiamento, ricompila in js e lo mette in dist/renderer con code aggiornato
// (il change che abbiamo fatto)
// Step 2
// electronmon(definito in package.json) vede che un file in dist è cambiato:
// (dist/renderer.js changed)
// e quindi:
// chiude Electron
// ↓
// riavvia Electron
// ↓
// esegue di nuovo dist/main.js
