// Creiamo un registro centrale dei tool. Cosi abbiamo un registro ordinato che scala bene

import { generatePDF } from "../workers/pdfWorker"; //  the worker that write a file.txt
import { checkWifi } from "../workers/checkWifiWorker"; // the worker that check wifii
import { enableWifi } from "../workers/enableWifiWorker"; //  the worker that enable wifii

export const toolRegistry: Record<string, Function> = {
  generate_pdf: async (args: any) => {
    // generate_pdf = name of the tool defined in tool list
    const { title, content } = args;
    return await generatePDF(title, content); // generatePDF = name of the function defined in workers that actually do the real job in the OS
  },

  check_wifi: async () => {
    // check_wifi = name of the tool defined in tool list
    return await checkWifi(); // checkWifi = name of the function defined in workers that actually do the real job in the OS
  },

  enable_wifi: async () => {
    return await enableWifi();
  },
};

// Qui registrerai tutti i tool del sistema:
// generate_pdf
// read_file
// search_web
// summarize_pdf
