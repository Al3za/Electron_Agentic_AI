// // import OpenAI from "openai";
// import { pdfTool } from "./pdfTool";
// import { generatePDF } from "../workers/pdfWorker";
// import { openai } from "../utils/openaiClient"; // la connessione con l'llm di open ai

// export async function runAgent(userInput: string) {
//   try {
//     console.log("agent function created and userInput =", userInput);
//     // passiamo l'input allo llm e gli forniamo una lista di tool che puo' decidere di chiamare
//     const response = await openai.responses.create({
//       model: "gpt-4.1",
//       input: userInput,
//       tools: [pdfTool], // questa unica tool al momento genera .txt file (per ora in versione test .txt)
//     });

//     console.log(JSON.stringify(response.output, null, 2));
//     // const toolCall = response.output.find(
//     //   (item) => item.type === "function_call"
//     // ); // try this one as well
//     const toolCall = response.output[0];
//     // L’OpenAI Responses API (qui toolCall) restituisce sempre un oggetto output che può avere diversi tipi:
//     console.log("toolCall check =", toolCall);
//     // "text" → semplice risposta testuale
//     // "function_call" → indica che l’LLM vuole invocare un tool (come vediamo sotto)
//     // {
//     //   "type": "function_call", // quando chiama una tool
//     //   "name": "generate_pdf", // nome della tool invocata (definita nella tool list)
//     //   "arguments": "{\"title\":\"My PDF\",\"content\":\"Hello World\"}"
//     //     "text": "qui risiede la resp finale dello llm in text formato (a fine loop quando non ci sono piu' tool da chiamare, oppure se si fanno domande che non richiedono tool invoking)"
//     // }

//     // qua verifichiamo se lo llm ha deciso di chiamare la tool, e se la tool e 'generate_pdf'(il nome della tool definita nella list tool
//     //   che da direttive al modello nella description di cosa fare, e di quali argomenti compilare)
//     if (toolCall.type === "function_call") {
//       // "function_call" e una come abbiamo detto sopra ka key word che viene generato dall’LLM quando decide di usare una tool.
//       if (toolCall.name === "generate_pdf") {
//         const args = JSON.parse(toolCall.arguments); // gli argument estrapolati che corrispondono allo input l'utente che in questo esempio
//         // ha chiesto 'creami un pdf con nome assestment, e testo 'lorem ipsum....'

//         return await generatePDF(args.title, args.content); // mandiamo il titolo e testo allo worker che usa os e fs per creare il text file
//         // con i dati args estrapolati nella query
//       }
//     }
//     console.log("return llm res", response.output_text);
//     return response.output_text; // parte testuale dell’output dell’LLM come descritto sopra
//   } catch (error) {
//     console.error("Agent error:", error);
//     return "Errore durante l'esecuzione dell'agent";
//   } // con try/catch  eviti crash dell'app Electron.
//   // Oppure UI update:
//   // ipcMain.emit('task-result', result); // quando ad esempio la single/multi task viene portata a termine
//   // mandiamo questo mess al nextjs frontend tramit ICP
// }

import { openai } from "../utils/openaiClient";
// import { pdfTool } from "../tools/pdfTool";
import { tools } from "../tools";
import { toolRegistry } from "./toolRegistry";
// import { generatePDF } from "../workers/pdfWorker";

export async function runAgent(userInput: string) {
  console.log("Agent started with input:", userInput);

  let response = await openai.responses.create({
    model: "gpt-4.1",
    // input: messages,
    input: userInput,
    tools: tools,
  }); // qua' il modello decide se invocare una tool o meno in base all'input ricevuto,

  // const tools = [pdfTool]; // usually are they many

  // QUI:
  // messages: [] e' ancora molto usato dalle agenzie per fare multi-turn task perche
  // e facile da fare debug ed e' piu' affidabile se abbiamo molti tool nella chain. Pero al momento usiamo
  // previous_response_id: response.id, che e' il servizio  semplificata di messages, offerto
  // da OpenAi (leggi sotto la desc in generate_Pdf function)
  // let messages: any[] = [
  //   {
  //     role: "user",
  //     content: userInput,
  //   },
  // ];

  // IN QUESTO WHILE PARTE IL 'MULTI AGENT AI':
  // questo while resta true per tutta la durata del modello che invoca nuove tool, rendendolo ideale per il multi agent
  // quando il modello ha chiamato l'ultima tool della chain e deve dare la res finale, ovvero
  // laddove vediamo "return response.output_text" qui' si interrompe il while loop, e significa che il
  // modello ha invocato l'ultima tool (o semplicemente che l'inout non richiedeva nessuna tool call
  // ma solo una res diretta)
  while (true) {
    // ask llm e lui decide se iniziare una serie di tool call e se dare una res senza invocare nessun tools
    // let response = await openai.responses.create({
    //   model: "gpt-4.1",
    //   // input: messages,
    //   input: userInput,
    //   tools: tools,
    // }); // qua' il modello decide se invocare una tool o meno in base all'input ricevuto,

    console.log("MODEL OUTPUT:");
    console.log(JSON.stringify(response.output, null, 2));

    // QUI :
    // L’OpenAI Responses API (qui toolCall) restituisce sempre un oggetto output che può avere diversi tipi:
    // console.log("toolCall check =", toolCall);
    // "text" → semplice risposta testuale
    // "function_call" → indica che l’LLM vuole invocare un tool (come vediamo sotto)
    // {
    //   "type": "function_call", // quando chiama una tool
    //   "name": "generate_pdf", // nome della tool invocata (definita nella tool list)
    //   "arguments": "{\"title\":\"My PDF\",\"content\":\"Hello World\"}"
    //     "text": "qui risiede la resp finale dello llm in text formato (a fine loop quando non ci sono piu' tool da chiamare, oppure se si fanno domande che non richiedono tool invoking)"
    // }
    const toolCall = response.output.find(
      (item: any) => item.type === "function_call",
    ); // find the name of the tool invoked by the llm. function_call e la key word di defaut di openAi definita anche nelle tool list

    // QUI:
    // Si ferma il while loop. Il modello da' la risposta finale quando sono state invocate tutte le
    //  tool dela chain o se l'input dello user non richiede l'uso di una tool call
    // (tipo se l'utente dice: 'ciao chat, come stai?'). In pratica, se invochiamo 10 tools, al completamento
    // della 10 tool il modello risponde qui, e questa res viene inviata al renderer.ts per mostrarla
    //  allo user
    if (!toolCall || toolCall.type !== "function_call") {
      // cosi' ts sa' che e' una openAi function_call
      // e non lancia error sotto nel name(toolCall.name)
      console.log("Final response:", response.output_text);
      return response.output_text; // output_text e inbuild sintaxt di OpenAi che ritorna la res del model
    }

    // QUA:
    // arriviamo se l' LLM ha deciso di invocare un tool, e vediamo quale tool name deve agire come qua sotto.
    // Questa pratica e' chiamata Logging agent (molto utile), ed e' Questo è fondamentale quando
    //  gli agent diventano complessi.
    console.log("Tool called:", toolCall.name);
    console.log("Arguments:", toolCall.arguments);

    const args = JSON.parse(toolCall.arguments);

    //Qui:
    // Usiamo il tool Registry dove sono definite tutte le tools.
    const tool = toolRegistry[toolCall.name]; // puoi aggiungere nuovi tool senza cambiare l’agent loop.

    if (!tool) {
      throw new Error(`Tool not found: ${toolCall.name}`);
    }

    const result = await tool(args); // passiamo gli args creati dal modello alla tool che il modello decide di invocare
    // il result verra poi salvato dallo llm alla fine della tool chain come descritto nel blocco sotto:

    // let result; // il result e diverso per ogni tool invocata, e si dovrebbe fermare nel if (!toolCall || toolCall.type !== "function_call")
    // Cosicche si possano usare multi task agent.(ancora il loop stranamente non si ferma dopo aver invokato la tool, si deve investigare)
    // QUA
    // Si arriva se' la function tool nale e' generate_pdf, e qua dentro chiamiamo la fun
    // che scrive il .txt file con gli args dello input.
    // P.S. Fare actions facendo il check dell nome della tool invocata dal modello cosi' come sotto
    //  non scala bene se abbiamo molti tools. Per questo il prossimo update sara' il 'Tool registry'
    // in modo da avere anche 100+ tools in modo ordinato e scalabile
    // if (toolCall.name === "generate_pdf") {
    //   // Se il tool name e questo, esegui questa tool(crea .txt file). Nello stesso modo possiamo
    //   // definire un altra 'if' per azionare un altra tool quando ci saranno piu' tools
    //   // const args = JSON.parse(toolCall.arguments);
    //   // const result = await generatePDF(args.title, args.content);
    //   result = await generatePDF(args.title, args.content);
    // }
    console.log("Tool result:", result);

    response = await openai.responses.create({
      model: "gpt-4.1",
      previous_response_id: response.id, // continua il reasoning a partire dalla risposta precedente
      // del modello. In modo da tenere aggiurnato il modello su quale e' il next step in base a quello che
      // e' accaduto prima, altrimenti al prossimo turn del loop non si sarebbe resettato, non sapendo che
      // si era invocata la tool prima, e quindi non sarebbe possibile il multi turn agent
      // Curiosita. Il modello non riceve tutta la chat ogni volta — l’API ricostruisce il
      //  contesto usando gli ID delle res precedenti del loop:
      // resp 1 = [resp_abc123XYZ]
      // resp 2 = [resp_def456LMN]. Quesi sono semplicemente l'identificatore di quella risposta
      // del modello in modo da evitare di caricare sempre tutto il contesto(cioe' input e metadati
      // pesanti) e' rendendo questa pratica è molto più efficiente dei classici 'array messages'.
      // Con previous_response_id il contesto è gestito dal server OpenAI ed e' per questo che
      // Il modello capisce il contesto dei turn precedenti solo grazie agli id.
      // Ricordiamo che questo e' necessario  per debugging, multiturn task, ecc..
      input: [
        // Qui dentro passano i dati l'output della tool che abbiamo chiamato sopra. Serve per il multi
        // agent loop e per mantenere il context allo llm
        {
          type: "function_call_output", // function_call_output e la Sintax di openAi. Serve a informare il modello
          //  che stiamo questo e' un autput di una toll
          call_id: toolCall.call_id, // esattamente di questa tool id (che ci servira' se vogliamo
          // usare questo output come input per la next tool call)
          output: JSON.stringify(result), // e' qui diciamo allo llm il result della funzione chiamata sopra
          //: {success: true, file: "test.pdf"} Questo puo' essere l'input nella next tool call(che si
          // ricava con toolCall.call_id), oppure puo' essere la res finale tipo dello llm tipo:
          // "il file test.pdf e' stato creato con sucesso"
        },
      ],
    });
    // return response.output_text; // Qui lo LLM ferma il while loop e ritorna la res per il renderer.ts (lo user)
    /////
    // messages.push Serve per creare il loop cognitivo dell’agent. Cioe' serve a fare il
    // multiturn agent, in modo che l'output di una tool venga servita come input allo llm
    // per dare una response, o nel caso si dovrebbe  passare questo output come input di un
    // altra tool. Al momento non serve perche usiamo "previous_response_id: response.id" come riferimento
    // ma response.id non puoi facilmente:
    //fare logging completo
    // fare agent debugging
    // fare tool chains lunghe
    // salvare la conversazione
    // Per questo molti agent in produzione usano ancora:
    // messages[]
    // invece di previous_response_id.
    // In futuro usaremo message [], ma al momento usiamo response.id per facilitare

    // messages.push({
    //   type: "function_call_output", // il risultato di un tool deve essere mandato con prefisso di openAi 'function_call_output'
    //   call_id: toolCall.call_id, // Il call_id serve a OpenAI per sapere che questo risultato appartiene a quel tool call specifico
    //   output: JSON.stringify(result), // OpenAI rifiuta gli object, quindi trasformiamo l'output
    //   // della res in una stringa JSON per non causare errors
    // });

    // continue;
  }
}

// questo loop fa in modo che in nostro agent si comporta da vero agent in prod.
// Questo loop fa' :

// User input
//  ↓
// LLM decide tool
//  ↓
// execute tool
//  ↓
// send result back to LLM
//  ↓
// LLM decide next step
//  ↓
// eventuale altro tool
//  ↓
// final answer

// quando creiamo il .txt file ora il workflow sara' cosi':
// Agent started with input: ...
// MODEL OUTPUT:
// function_call generate_pdf

// PDF created: report.txt

// MODEL OUTPUT:
// message: "Ho creato il file report.txt"

// PS
// Molte aziende grandi ora usano:

// OpenAI SDK (il collegamento ad openai definito in .env)
// +
// tool schema
// +
// agent loop custom

// esattamente come stai facendo tu.
