const express = require('express');
const WebSocket = require('ws');
const QRCode = require('qrcode');
const {v4: uuidv4} = require('uuid');

const app = express();
const port = 3100;

app.use(express.static('public'));
const sessions = {};

const wss = new WebSocket.Server({ noServer: true });
wss.on('connection', (ws, req) => {
   const sessionId = req.url.split('/').pop();

   console.log('Connected', sessionId);

   if (sessions[sessionId]) {
      sessions[sessionId].phones.push(ws);
   } else {
      sessions[sessionId] = {tv: ws, phones: []};
   }

   ws.on('message', (message) => {
      if (sessions[sessionId]) {
         sessions[sessionId].tv.send(mesage)
      }
   });

   ws.on('close', () => {
      if (sessions[sessionId]) {
         if (sessions[sessionId].tv === ws) {
            sessions[sessionId].phones.forEach((phoneWs) => {
               if (phoneWs.readyState === WebSocket.OPEN) {
                  phoneWs.close();
               }
            });
            delete sessions[sessionId];
         } else {
            sessions[sessionId].phones = sessions[sessionId].phones.filter((phoneWs) => phoneWs !== ws);
         }
      }
   });
});

app.get('/', (req, res) => {
   res.sendFile(__dirname + '/public/tv.html');
});

app.get('/qrcode', (req, res) => {
   const sessionId = uuidv4();
   const qrData = `http://localhost:${port}/connect/${sessionId}`;
   const wsLink = `ws://localhost:${port}/connect/${sessionId}`;
   QRCode.toDataURL(qrData, (err, url) => {
      if (err) {
         res.status(500).send('Error generating QR code');
         return;
      }
      res.send({sessionId, url, qrData,wsLink});
   });
});

const server = app.listen(port, () => {
   console.log(`Server started on port ${port}`);
});

server.on('upgrade', (request, socket, head) => {
   const pathname = request.url.split('/')[1];

   if (pathname === 'connect') {
      wss.handleUpgrade(request, socket, head, (ws) => {
         wss.emit('connection', ws, request);
      });
   } else {
      socket.destroy();
   }
});
