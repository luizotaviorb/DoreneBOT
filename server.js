const express = require("express");
const app = express();

function initWebServer(port) {
  app.get("/bot", (req, res) => {
    res.send("Bot está operando!");
  });

  app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}.`);
  });
}

module.exports = initWebServer;
