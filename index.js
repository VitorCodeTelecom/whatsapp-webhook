// index.js
const express = require('express');
const fs = require('fs');
const csv = require('csv-parser');
const axios = require('axios');
const multer = require('multer');
const path = require('path');
const app = express();

app.use(express.json());

const ACCESS_TOKEN = 'EAAT6cetkdfMBPM2OHKNyke2cjxZBRyuZBbhZAHwAZC4PUZBa99saohlAv2ZAEZAAnfzGbHMjE9xzC2MHnMElsJZAKMydBMLlvigSIhUZCZB889YG6MpuZAkiXiKxqQRHawLWQZBdKiy4PW2BXARFZCAKIiEqpZCVeO57LgptfnXrA90FEN0katuS8SUGRvVt9ij6BrEhTAUpb27k3JHdtoVupfKlBOuPbZAz0XUgVa7JfoVjYDATwZDZD';
const PHONE_NUMBER_ID = '770964959424705';
const BOLETOS_DIR = path.join(__dirname, 'boletos');

// Lê o CSV e monta um mapa: telefone → nome
function carregarClientes() {
  return new Promise((resolve, reject) => {
    const mapa = {};
    fs.createReadStream('clientes.csv')
      .pipe(csv())
      .on('data', (row) => {
        mapa[row.telefone] = row.nome;
      })
      .on('end', () => resolve(mapa))
      .on('error', reject);
  });
}

// Envia mensagem de texto
async function enviarTexto(destino, texto) {
  await axios.post(`https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`, {
    messaging_product: 'whatsapp',
    to: destino,
    type: 'text',
    text: { body: texto }
  }, {
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });
}

// Envia o PDF como documento
async function enviarPDF(destino, linkPublico, nomeArquivo) {
  await axios.post(`https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`, {
    messaging_product: 'whatsapp',
    to: destino,
    type: 'document',
    document: {
      link: linkPublico,
      filename: nomeArquivo
    }
  }, {
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });
}

// Webhook principal
app.post('/webhook', async (req, res) => {
  const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  const from = message?.from;
  const texto = message?.text?.body?.toLowerCase();

  if (texto?.includes('boleto')) {
    const clientes = await carregarClientes();
    const nomeCliente = clientes[from];

    if (!nomeCliente) {
      await enviarTexto(from, 'Desculpe, não encontrei seu nome em nosso sistema.');
      return res.sendStatus(200);
    }

    const nomeArquivoBase = nomeCliente.toUpperCase().replace(/ /g, '_');
    const arquivoEncontrado = fs.readdirSync(BOLETOS_DIR).find(arquivo => arquivo.startsWith(nomeArquivoBase));

    if (arquivoEncontrado) {
      const publicUrl = `https://whatsapp-webhook-p9v6.onrender.com/boletos/${encodeURIComponent(arquivoEncontrado)}`;
      await enviarTexto(from, `Aqui vai o boleto, ${nomeCliente}`);
      await enviarPDF(from, publicUrl, arquivoEncontrado);
    } else {
      await enviarTexto(from, 'Não encontrei seu boleto ainda. Tente novamente mais tarde ou fale com o atendimento.');
    }
  }

  res.sendStatus(200);
});

// Rota pública para servir boletos
app.use('/boletos', express.static(BOLETOS_DIR));

// Confirmação do webhook (GET)
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === 'seu_token_de_verificacao') {
    console.log('WEBHOOK VERIFICADO');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
