// # definizione tools per LLM

// questa e la list tool o function list che serve al modello open ai a capire cosa fa' una tool dalla description, e quale
// argomenti compilare. Qui diamo ulteriori direttive allo llm

import { FunctionTool } from "openai/resources/responses/responses";
export const pdfTool: FunctionTool = {
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

// required: ["title", "content"], saranno compilati dallo llm, in base all'output delle altre tool invocate in precedenza
// e queste a sua volta verranno passate come input ad un altro tool, fino a quando la taske non e' completata
