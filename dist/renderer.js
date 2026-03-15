"use strict";
// riceviamo solo html da index.html file. mentre qui definiamo il js che interagisce con html di quel file
const input = document.getElementById("prompt");
const btn = document.getElementById("sendBtn");
const responseDiv = document.getElementById("response");
// interface res_output {
//   success: boolean;
//   file: string;
// }
btn.addEventListener("click", () => {
    console.log("button clicked");
    const text = input.value.trim();
    if (!text)
        return;
    window.electronAPI.sendInput(text);
    console.log("Sto elaborando");
    responseDiv.innerText = "Sto elaborando....";
});
window.electronAPI.onResponse((output /*res_output*/) => {
    console.log("output format=", output);
    responseDiv.innerText = output /*`file ${output.file.toString()} created`*/; //output.success.toString(); // Il renderer riceve la risposta dallo llm(che abbiamo comunivcato da main.js) e la mostra:
});
