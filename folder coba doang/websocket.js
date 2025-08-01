import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });

// Menyimpan klien WebSocket
let webSocketClients = {
  LTB: [],
};

// Ketika ada klien yang terhubung
wss.on('connection', (ws) => {
  console.log('Client connected');

  // Menambahkan klien yang terhubung ke dalam array LTB
  webSocketClients.LTB.push(ws);

  // Menangani pesan yang diterima dari klien
  ws.on('message', (message) => {
    console.log(`Pesan diterima: ${message}`);
  });

  // Menangani ketika klien terputus
  ws.on('close', () => {
    console.log('Client disconnected');
    // Menghapus klien yang terputus dari array
    webSocketClients.LTB = webSocketClients.LTB.filter(client => client !== ws);
  });
});

// Fungsi untuk mengirim notifikasi ke LTB
const sendNotificationToLtb = (message) => {
  if (webSocketClients.LTB && webSocketClients.LTB.length > 0) {
    webSocketClients.LTB.forEach(client => {
      client.send(message); // Mengirim pesan ke setiap klien LTB
    });
  }
};

// Menyediakan fungsi agar bisa diimpor oleh file lain
export { sendNotificationToLtb };
