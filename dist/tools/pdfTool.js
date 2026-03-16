"use strict";
// # definizione tools per LLM
Object.defineProperty(exports, "__esModule", { value: true });
exports.pdfTool = void 0;
exports.pdfTool = {
    type: "function",
    name: "generate_pdf",
    description: "Create a text file with a title and content",
    parameters: {
        type: "object",
        properties: {
            title: {
                type: "string",
                description: "The title of the file",
            },
            content: {
                type: "string",
                description: "The content of the file",
            },
        },
        required: ["title", "content"],
        additionalProperties: false, // Senza questa regola il modello potrebbe generare altri params non definiti in 'required' qui sopra, causando errors
    },
    strict: true, // controlla quanto rigidamente il modello deve rispettare lo schema dei parametri.
    // strict: true significa che Il modello deve rispettare esattamente lo schema JSON.
};
// PS :
// required: ["title", "content"], saranno compilati dallo llm, in base all'output delle altre tool invocate in precedenza
// e queste a sua volta verranno passate come input ad un altro tool, fino a quando la taske non e' completata
