import { openai } from "../utils/openaiClient";
// import { pdfTool } from "../tools/pdfTool";
import { tools } from "../tools";
import { toolRegistry } from "./toolRegistry";
import { guardToolExecution } from "../agent_guard_layer/guard_layer";
import { executeTool } from "../agent_guard_layer/Tool_Executor";
import { hasInternet } from "../agent_guard_layer/has_internet";
import { EnvironmentManager } from "../Env_Manager_Class/EnvironmentManager";
// import { generatePDF } from "../workers/pdfWorker";

export async function runAgent(userInput: string) {
  console.log("Agent started with input:", userInput);

  // 🟡 PRE-FLIGHT CHECK.(serve per openAi e ha non dare error in caso non ci fosse wifi)
  const env = new EnvironmentManager(toolRegistry); // class call with all the function check inside it. toolRegistry is used to call the
  // tool "check_wifi" in EnvironmentManager

  // QUI:
  // computeState() → chiamato solo 1 volta ogni 5s (cache) per evitare di fare ogni volta lookup connessione internet(utile quando si fanno tool chain)
  const state = await env.getState(); // check se il wifi e attivo prima di connettersi a openAi qui sotto

  console.log("ENV STATE:", state);
  // ENV STATE: {
  //    internet: true, false if wifi is off
  //    wifiEnabled: true, false if wifi is off
  //    wifiConnected: false,
  //    lastUpdated: 1773838313329
  //  }

  if (!state.internet) {
    return "⚠️ No internet connection. Please enable WiFi.";
  } // return che viene mostrato allo user

  // const hasNet = await hasInternet();

  // if (!hasNet) {
  //   // lo user vede questo error se non c'e' wify
  //   return "⚠️ No internet connection. Please enable WiFi.";
  // }

  let response = await openai.responses.create({
    model: "gpt-4.1",
    input: [
      // Ora stiamo passando due messaggi diversi al modello, con ruoli diversi.
      // Il modello li interpreta con priorità diverse.
      {
        role: "developer", // Quando definiamo 'developer/(same as 'system')', equivale è un messaggio di istruzioni per il comportamento dell'agente.
        // Serve a dire al modello: queste sono le regole che devi seguire quando ragioni (Prima di creare file controlla wifi usando i tool)
        // senza questo il modello potrebbe creare cercare di fare operazioni su internet senza avere il wifii attivato,
        // facendo un loop infinito
        // il content poi non bisognera' ricrearlo sotto quando rifacciamo 'openai.responses.create..' perche e' compreso
        // in 'previous_response_id: response.id'.(Se non usi response.id devi ricostruire la chat manualmente e reinserire il 'developer' content dinuovo)
        content: `
        You are a strict execution agent AI.

        Capabilities:
        - create pdf files
        - check wifi status
        - read files
        - write files

        Rules:
        1. ALWAYS check wifi before downloading resources
        2. Use tools instead of guessing
        3. NEVER invent tool outputs
        4. NEVER simulate tool execution.
        5. If a tool is needed, CALL IT.
        6. If a tool fails explain the error to the user
        7. If a task requires system interaction you must use the available tools.
           Do not simulate actions.
        
        CRITICAL RULE:
        - You MUST call tools using the function_call format.
        - NEVER write tool calls as plain text.
        - NEVER simulate tool execution.
        - NEVER describe actions instead of executing them.
        
        If a tool is required, you MUST call it.
        If you fail to call a tool, you must try again
        `,
      },
      {
        role: "user", // Questo invece è semplicemente il prompt reale dell'utente, definito da 'user' e userInput
        content: userInput,
      },
    ],
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

  // QUI:
  // Evitiamo il Loop-infinito dell'Agente:
  let retryCount = 0;
  const MAX_RETRIES = 3;

  // per tenere sato delle tool gia' eseguite
  let toolExecuted = false;

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
    console.log(JSON.stringify(response.output, null, 2)); // la res del modello all'input passato sopra a inizio funzione
    // in questo log vediamo se il modello ha' invocato una tool ("type": "function_call"), o se
    // ha risposto direttamente senza invocare tool: ("type": "message")

    // QUI :
    // L’OpenAI Responses API (qui toolCall) restituisce sempre un oggetto output che può avere diversi tipi:
    // console.log("toolCall check =", toolCall);
    // "text" → semplice risposta testuale
    // "function_call" → indica che l’LLM vuole invocare un tool (come vediamo sotto)
    // {
    //   "type": "function_call", // quando chiama una tool, "message" // quando llm risponde senza inocare tool
    //   "name": "generate_pdf", // nome della tool invocata (definita nella tool list)
    //   "arguments": "{\"title\":\"My PDF\",\"content\":\"Hello World\"}"
    //     "text": "qui risiede la resp finale dello llm in text formato (a fine loop quando non ci sono piu' tool da chiamare, oppure se si fanno domande che non richiedono tool invoking)"
    // }
    const toolCall = response.output.find(
      (item: any) => item.type === "function_call",
    ); // find the name of the tool invoked by the llm. function_call e la key word di defaut di openAi definita anche nelle tool list

    // QUI:
    // verfichiamo tramite userInput se una tool call e necessaria.
    // funziona, ma ha un limite:
    // guarda solo l'input iniziale e NON considera i turni successivi
    // (da usare insieme a requiresToolFromContext per robustezza )
    function requiresTool(userInputcheck: string): boolean {
      const text = userInputcheck.toLowerCase();
      console.log("userInputcheck here =", text);
      // add includes('text') in base a questo log
      // returns true or false
      console.log(
        "userInputcheck return",
        userInputcheck.includes("file") || userInputcheck.includes("scrivi"),
      );
      //return = True or false
      // aggiungi le altre includes in correlazioni con le altre tools(tippo wifi ecc)
      return (
        text.includes("file") ||
        text.includes("scrivi") ||
        text.includes("write") ||
        text.includes("create")
      );
    }
    // console.log("requiresTool check", requiresTool(userInput));

    // QUI:
    // ✔ Si usa il reasoning del modello(il thinking) insieme userInput per controllare gli action di questi e controllare se
    // una tool deve essere invocata(hard coded tool invoking)
    // ✔ funziona multi-turn. (da usare con requiresTool per robustezza)

    // "Posso creare un file se vuoi" porta ad error
    function requiresToolFromContext(response: any): boolean {
      const text = response.output_text?.toLowerCase() || ""; // la res del modello (il thinking)
      console.log("response.output_text? here =", text);
      // add includes('text') in base a questo log

      console.log(
        "requiresToolFromContext return",
        text.includes("creating") || text.includes("writing file"),
      );

      return (
        text.includes("creating") || text.includes("writing file")
        // text.includes("checking")
      );
      // return text.includes("creating") || text.includes("writing file"); // return True or false
    }
    // console.log(
    //   "requiresToolFromContext check",
    //   requiresToolFromContext(response),
    // );

    // const ShouldUseTool = requiresToolFromContext(response); // la res dello llm (il thinking)
    // console.log(mustUseTool); (return True/False)

    // QUI:
    //  verifichiamo se una funzione e' effettivamente richiesta ma non invocata.
    // In base a questo facciamo il recall della tool 3 volte(sotto).
    // Se !toolCall, ma requiresTool(userInput) o requiresToolFromContext(response) significa che probabilmente il
    // modello dovrebbe invocare una tool ma non lo fa', quindi partiamo riproviamo ad invocare la tool
    // per un massimo di 3 volte(retryCount > MAX_RETRIES)
    const mustUseTool = // return True or False. (ciao chat userInput return false, create a file.txt creturn true)
      !toolCall &&
      !toolExecuted && // verifica se una tool nen e gia stata eseguita
      (requiresTool(userInput) || requiresToolFromContext(response)); // questo funge da doppia validazione
    // se anche 1 di queste sopra e' true, allora mustUseTool = True. Devono essere tutte false, cosi sappiamo
    // che il modello non ha mancato una tool call

    console.log("mustUseTool check", mustUseTool);
    // Non esiste soluzione perfetta.
    // Per questo in produzione si usa:

    // 1) intent detection (input)
    // 2) LLM reasoning (context)
    // 3) fallback retry

    // 👉 esattamente come abbiamo fatto qui

    // QUI:
    // if (!toolCall am if mustUseTool) → retry to call the missed tool for 3 times:
    if (!toolCall || toolCall.type !== "function_call") {
      if (mustUseTool) {
        console.log("⚠️ Model failed to call tool properly");

        // Evita loop infinito
        if (retryCount > MAX_RETRIES) {
          console.log("⚠️ To many failed attempts, please try again");
          return "❌ Failed to execute tool after multiple attempts.";
        }

        retryCount++;

        response = await openai.responses.create({
          model: "gpt-4.1",
          previous_response_id: response.id,
          input: [
            {
              role: "developer",
              content: `
            You must call a tool using the function_call format.
            Do not write tool calls as text.
            Do not simulate tool execution.
            Only respond with a valid function_call.`,
            },
          ],
        });

        continue;
      }
      // Risposta ad una domanda normale tipo 'come stai chat', o quando l'ultima tool della task e' stata eseguita
      console.log("Final response:", response.output_text);
      return response.output_text; // output_text e inbuild sintaxt di OpenAi che ritorna la res del model
    }

    // 🛡 GUARD
    const guardResult = await guardToolExecution(toolCall, env); // guardToolExecution fa' parte del Guard Layer e risp alla
    // domanda: "posso fare questa azione?"
    // env is our class component e risp alla domanda: "com’è il sistema"?

    let result;

    if (!guardResult.success) {
      result = guardResult; // blocco tool (return "No internet connection" or "User denied permission" for now)
    } else {
      try {
        result = await executeTool(toolCall); // invochiamo le tool della tool chain
        toolExecuted = true; // qui' sappiamo se una tool e' stata gia' compiuta
        // 🔥 importante: aggiorna stato dopo tool critiche
        if (["enable_wifi", "connect_wifi"].includes(toolCall.name)) {
          env.invalidateCache();
        }
      } catch (err) {
        toolExecuted = false;
        result = {
          success: false,
          error: "Tool execution failed",
        };
      }
    } // close else

    // QUA:
    // arriviamo se l' LLM ha deciso di invocare un tool, e vediamo quale tool name deve agire come qua sotto.
    // Questa pratica e' chiamata Logging agent (molto utile), ed e' Questo è fondamentale quando
    //  gli agent diventano complessi.
    // console.log("Tool called:", toolCall.name);
    // console.log("Arguments:", toolCall.arguments);

    // const args = JSON.parse(toolCall.arguments);

    // QUI:
    // Qui facciamo un tool enforcement lato backend.
    // Anche se scriviamo chiaramente nel prompt che prima di scrivere un .txt file si deve controllare lo
    // status del wifii, a volte il modello salta questo passagio, anche se e' scritto chiaramente nel prompt
    // Cosi' facciamo un 'orchestrazione lato backend' in modo da assicuriamo che se il modello invoca
    // delle funzioni critiche, ci assicuriamo che il delle altre tool correlate(il wifii in questo caso) sia
    // controllato e 'acceso', sopratutto quando invokiamo tool che richiedono connessione wifii. Questa
    // e' una soluzione solida usata da molte aziende
    // if (toolCall.name === "generate_pdf") {
    //   const wifi = await toolRegistry["check_wifi"]({});
    //   console.log("function wifii check hit", wifi);
    //   if (!wifi.wifiEnabled) {
    //     // Accende l’adapter WiFi ma non ci connette realmente ad una rete. serve un nuovo worker per collegarsi a una rete
    //     await toolRegistry["enable_wifi"]({}); // enables enabled
    //   }
    // }

    //Qui:
    // Usiamo il tool Registry dove sono definite tutte le tools.
    // const tool = toolRegistry[toolCall.name]; // puoi aggiungere nuovi tool senza cambiare l’agent loop.

    // if (!tool) {
    //   throw new Error(`Tool not found: ${toolCall.name}`);
    // }

    // const result = await tool(args); // passiamo gli args creati dal modello alla tool che il modello decide di invocare
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
    // console.log("Tool result:", result);

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
          // "il file test.pdf e' stato creato con sucesso".
          // In pratica da qui il modello può scegliere: chiamare un'altra tool o rispondere in testo
          // A volte capita che il modello risponde in testo invece di invocare un'altra tool. Questo
          // e' un problema comune nell agent loop. Per risolvere il problema si deve avere un prompt piu'
          // strutturato e anche fare enforce lato codice in:
          // if (!toolCall) {
          //     console.log("⚠️ Model did not call tool, forcing retry");

          //     response = await openai.responses.create({
          //       model: "gpt-4.1",
          //       previous_response_id: response.id,
          //       input: "You must call the appropriate tool to complete the task.",
          //     });

          // continue;}
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

// next step = Tool Validator Middleware
