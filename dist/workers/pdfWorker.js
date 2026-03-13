"use strict";
// # esecuzione dei tools che l'llm ha deciso di invocare in base al prompt
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePDF = generatePDF;
const fs_extra_1 = __importDefault(require("fs-extra"));
async function generatePDF(title, content) {
    const file = `${title}.txt`; // usiamo .txt, poi possiamo usare pdf-lib, html-pdf, puppeteer
    console.log("title & contend =", title, content);
    await fs_extra_1.default.writeFile(file, content); // creiamo il file.txt nel nostro os
    return {
        // Per questo primo test, il return non ritorna allo llm perche e una semplice single tool task operation.
        // Tuttavia In futuro questo res(output) che equivale allo output di questa tool, puo' essere
        //  l'input di un altra tool. Cioe qesto output viene ritornato allo llm, che decide di chiamare uno
        // altra tool con input(args) per la prossima tool da chiamare. Questo serve spesso per 'multi step task'
        // tipo 'traova il pdf di ieri(primo task), compilalo(secondo task) e invialo(terzo task)'
        success: true,
        file,
    };
    // cosi si presenta un 'multi step task':
    //   result =  await fs.writeFile(file, content); // creiamo il file.txt nel nostro os
    //   return await runAgentNextStep(result); // nuova chiamata allo llm con i dati di questa res
    // che serviranno come args per la prossima tool call
}
// Per MVP usiamo .txt, poi possiamo usare:
// pdf-lib
// puppeteer
// html-pdf
