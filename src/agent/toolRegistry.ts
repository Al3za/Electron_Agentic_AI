// Creiamo un registro centrale dei tool. Cosi abbiamo un registro ordinato che scala bene

import { generatePDF } from "../workers/pdfWorker";

export const toolRegistry: Record<string, Function> = {
  generate_pdf: async (args: any) => {
    const { title, content } = args;
    return await generatePDF(title, content);
  },
};

// Qui registrerai tutti i tool del sistema:
// generate_pdf
// read_file
// search_web
// summarize_pdf
