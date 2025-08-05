const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

const app = express();

const VERIFY_TOKEN = 'meu-token-secreto';
const PORT = process.env.PORT || 10000;

const WHATSAPP_API_URL = 'https://graph.facebook.com/v19.0';
const PHONE_NUMBER_ID = '770964959424705'; // Do seu webhook
const ACCESS_TOKEN = 'EAAT6cetkdfMBPAdEnyTvQGspmlO8TiX8oIDMm8mGVK3D2v7zcY5Lo8O3gZCEU27ZCM7VwVWNmPZCg6j58Gq0JixrqjaFugHc51p0LlIzlGEbXkCcC8HkOd05LZBfkkyXPVBmGMwNb3AWoaOuNj45WwObl9UD3CFSAjyoEQXEZCyZCQwJyijjPAzLPSkTZC3PqFEhAlZAYSta1E3EXP5IeCKNLhPNKxPZBEXIf8pYqvs8oDckZD'; // <-- Substitua aqui pelo token real

app.use(bodyParser.json());

// Validação do Webhook (GET)
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token && mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('Webhook validado com sucesso!');
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
});

// Função para enviar mensagem de texto
async function enviarTexto(wa_id, mensagem) {
    await axios.post(`${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`, {
        messaging_product: 'whatsapp',
        to: wa_id,
        text: { body: mensagem }
    }, {
        headers: {
            Authorization: `Bearer ${ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
        }
    });
}

// Função para enviar boleto em PDF
async function enviarBoletoPDF(wa_id, filePath) {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    formData.append('messaging_product', 'whatsapp');
    formData.append('type', 'document');
    formData.append('filename', path.basename(filePath));

    // 1. Faz upload da mídia
    const mediaRes = await axios.post(
        `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/media`,
        formData,
        {
            headers: {
                Authorization: `Bearer ${ACCESS_TOKEN}`,
                ...formData.getHeaders(),
            },
        }
    );

    const mediaId = mediaRes.data.id;

    // 2. Envia a mídia como documento
    await axios.post(`${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`, {
        messaging_product: 'whatsapp',
        to: wa_id,
        type: 'document',
        document: {
            id: mediaId,
            caption: 'Boleto em anexo'
        }
    }, {
        headers: {
            Authorization: `Bearer ${ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
        }
    });
}

// Webhook de recebimento de mensagens (POST)
app.post('/webhook', async (req, res) => {
    try {
        const entry = req.body.entry?.[0];
        const changes = entry?.changes?.[0];
        const message = changes?.value?.messages?.[0];

        if (message && message.type === 'text') {
            const texto = message.text.body.toLowerCase();
            const wa_id = message.from;
            const nome = changes.value.contacts?.[0]?.profile?.name || 'cliente';

            console.log(`Mensagem de ${nome} (${wa_id}): ${texto}`);

            if (texto.includes('boleto')) {
                await enviarTexto(wa_id, `Segue o boleto, ${nome}!`);

                const boletoPath = path.join(__dirname, 'boletos', 'LAURO_CAMPA_Setembro.pdf'); // <-- ajuste aqui conforme necessário
                await enviarBoletoPDF(wa_id, boletoPath);
            }
        }

        res.sendStatus(200);
    } catch (err) {
        console.error('Erro ao processar mensagem:', err);
        res.sendStatus(500);
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
