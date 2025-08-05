const express = require('express');
const bodyParser = require('body-parser');
const app = express();

const VERIFY_TOKEN = 'meu-token-secreto'; // escolha seu token
const PORT = process.env.PORT || 10000;

app.use(bodyParser.json());

// Validação do Webhook
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token && mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log("Webhook validado com sucesso!");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Recebendo mensagens
app.post('/webhook', (req, res) => {
  console.log('Mensagem recebida:', JSON.stringify(req.body, null, 2));
  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
