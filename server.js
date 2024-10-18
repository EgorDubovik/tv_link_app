const express = require('express');
const WebSocket = require('ws');
const QRCode = require('qrcode');
const {v4: uuidv4} = require('uuid');


const app = express();
const port = 3100;

app.use(express.static('public'));
const sessions = {};

app.get('/', (req, res) => {
   res.sendFile(__dirname + '/public/tv.html');
});

app.get('/qrcode', (req, res) => {
   const sessionId = uuidv4();
   const qrData = `http://localhost:${port}/connect/${sessionId}`;
   QRCode.toDataURL(qrData, (err, url) => {
      res.send({sessionId, url, qrData});
   });
});

const server = app.listen(port, () => {
   console.log(`Server started on port ${port}`);
});

