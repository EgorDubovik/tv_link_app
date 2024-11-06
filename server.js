const express = require('express');
const WebSocket = require('ws');
const QRCode = require('qrcode');
const {v4: uuidv4} = require('uuid');

const app = express();
const port = 8080;
const ip = '35.206.80.187';
// const ip = 'localhost';

app.use(express.static('public'));
app.use(express.json());
const sessions = {};

const wss = new WebSocket.Server({ noServer: true });
wss.on('connection', (ws, req) => {
   const sessionId = req.url.split('/').pop();

   console.log('Connected', sessionId);

   if (sessions[sessionId]) {
      sessions[sessionId].phones.push(ws);
      if(sessions[sessionId].tv.readyState === WebSocket.OPEN) {
         sessions[sessionId].tv.send(JSON.stringify({event: 'phoneConnected', data: sessions[sessionId].phones.length}));
      }
      console.log('Phone connected', sessionId);
   } else {
      sessions[sessionId] = {tv: ws, phones: []};
      console.log('Session created', sessionId);
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
                  phoneWs.send(JSON.stringify({event: 'tvDisconnected'}));
                  phoneWs.close();
               }
            });
            delete sessions[sessionId];
            console.log('Session closed', sessionId);
         } else {
            sessions[sessionId].phones = sessions[sessionId].phones.filter((phoneWs) => phoneWs !== ws);
            sendToTv(sessionId, JSON.stringify({event: 'phoneConnected', data: sessions[sessionId].phones.length}));
            console.log('Phone disconnected', sessionId);
         }
      }
   });
});

// Маршрут для проверки здоровья
app.get('/health', (req, res) => {
   res.status(200).send('Server is healthy');
 });

app.get('/', (req, res) => {
   res.sendFile(__dirname + '/public/tv.html');
});

app.get('/qrcode', (req, res) => {
   const sessionId = uuidv4();
   const qrData = `http://${ip}:${port}/phone/${sessionId}`;
   const wsLink = `ws://${ip}:${port}/connect/${sessionId}`;
   QRCode.toDataURL(qrData, (err, url) => {
      if (err) {
         res.status(500).send('Error generating QR code');
         return;
      }
      res.send({sessionId, url, qrData,wsLink});
   });
});

app.get('/phone/:sessionId', (req, res) => {
   res.sendFile(__dirname + '/public/phone.html');
});

app.get('/phone/ws/:sessionId', (req, res) => {
   if(sessions[req.params.sessionId]) {
      const wsLink = `ws://${ip}:${port}/connect/${req.params.sessionId}`;
      res.json({wsLink});
   } else {
      res.status(404).send('Session not found');
   }
});
app.post('/onmessage', (req, res) => {
   
   const sessionId = req.body.sessionId;
   const message = req.body.message;
   console.log('Message received', sessionId, message);
   if (sessions[sessionId]) {
      if(sessions[sessionId].tv.readyState === WebSocket.OPEN) {
         sessions[sessionId].tv.send(JSON.stringify({event: 'message', data: message}));
         res.json('Message sent');
      } else {
         res.status(404).json('Session not found');
      }
   } else {
      res.status(404).json('Session not found');
   }
});
app.get('/test', (req, res) => {
   // res.send('Test');
   process.exit(1);
});

const server = app.listen(port,'0.0.0.0', () => {
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


function sendToTv(sessionId, message) {
   if (sessions[sessionId]) {
      if(sessions[sessionId].tv.readyState === WebSocket.OPEN) {
         console.log('Sending to TV', sessionId, message);
         sessions[sessionId].tv.send(message);
      }
   }
}