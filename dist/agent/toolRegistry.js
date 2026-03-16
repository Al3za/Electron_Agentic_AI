"use strict";
// Creiamo un registro centrale dei tool. Cosi abbiamo un registro ordinato che scala bene
Object.defineProperty(exports, "__esModule", { value: true });
exports.toolRegistry = void 0;
const pdfWorker_1 = require("../workers/pdfWorker");
exports.toolRegistry = {
    generate_pdf: async (args) => {
        const { title, content } = args;
        return await (0, pdfWorker_1.generatePDF)(title, content);
    },
};
// Qui registrerai tutti i tool del sistema:
// generate_pdf
// read_file
// search_web
// summarize_pdf
