"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAgent = runAgent;
// import OpenAI from "openai";
const pdfTool_1 = require("./pdfTool");
const pdfWorker_1 = require("../workers/pdfWorker");
const openaiClient_1 = require("../utils/openaiClient"); // la connessione con l'llm di open ai
async function runAgent(userInput) {
    try {
        console.log("agent function created and userInput =", userInput);
        // passiamo l'input allo llm e gli forniamo una lista di tool che puo' decidere di chiamare
        const response = await openaiClient_1.openai.responses.create({
            model: "gpt-4.1",
            input: userInput,
            tools: [pdfTool_1.pdfTool], // questa unica tool al momento genera .txt file (per ora in versione test .txt)
        });
        console.log(JSON.stringify(response.output, null, 2));
        // const toolCall = response.output.find(
        //   (item) => item.type === "function_call"
        // ); // try this one as well
        const toolCall = response.output[0];
        // L’OpenAI Responses API (qui toolCall) restituisce sempre un oggetto output che può avere diversi tipi:
        console.log("toolCall check =", toolCall);
        // "text" → semplice risposta testuale
        // "function_call" → indica che l’LLM vuole invocare un tool (come vediamo sotto)
        // {
        //   "type": "function_call", // quando chiama una tool
        //   "name": "generate_pdf", // nome della tool invocata (definita nella tool list)
        //   "arguments": "{\"title\":\"My PDF\",\"content\":\"Hello World\"}"
        //     "text": "qui risiede la resp finale dello llm in text formato (a fine loop quando non ci sono piu' tool da chiamare, oppure se si fanno domande che non richiedono tool invoking)"
        // }
        // qua verifichiamo se lo llm ha deciso di chiamare la tool, e se la tool e 'generate_pdf'(il nome della tool definita nella list tool
        //   che da direttive al modello nella description di cosa fare, e di quali argomenti compilare)
        if (toolCall.type === "function_call") {
            // "function_call" e una come abbiamo detto sopra ka key word che viene generato dall’LLM quando decide di usare una tool.
            if (toolCall.name === "generate_pdf") {
                const args = JSON.parse(toolCall.arguments); // gli argument estrapolati che corrispondono allo input l'utente che in questo esempio
                // ha chiesto 'creami un pdf con nome assestment, e testo 'lorem ipsum....'
                return await (0, pdfWorker_1.generatePDF)(args.title, args.content); // mandiamo il titolo e testo allo worker che usa os e fs per creare il text file
                // con i dati args estrapolati nella query
            }
        }
        console.log("return llm res", response.output_text);
        return response.output_text; // parte testuale dell’output dell’LLM come descritto sopra
    }
    catch (error) {
        console.error("Agent error:", error);
        return "Errore durante l'esecuzione dell'agent";
    } // con try/catch  eviti crash dell'app Electron.
    // Oppure UI update:
    // ipcMain.emit('task-result', result); // quando ad esempio la single/multi task viene portata a termine
    // mandiamo questo mess al nextjs frontend tramit ICP
}
