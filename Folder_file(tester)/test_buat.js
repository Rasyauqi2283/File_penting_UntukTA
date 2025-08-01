//
// Membaca sertifikat dan kunci privat Service
async function loadCertificates() {
    const privateKey = await fs.readFile(path.join(__dirname, 'servicesguard', 'private-key.pem'), 'utf8');
    const certificate = await fs.readFile(path.join(__dirname, 'servicesguard', 'certificate.pem'), 'utf8');
    const ca = await fs.readFile(path.join(__dirname, 'servicesguard', 'ca.pem'), 'utf8');
        return { privateKey, certificate, ca };
    }
    
    // 
    const { privateKey, certificate, ca } = await loadCertificates();
    
    // Definisikan credentials yang berisi sertifikat dan kunci privat
    const credentials = { key: privateKey, cert: certificate, ca: ca };
    // Mengonfigurasi server HTTPS dengan TLS yang aman
    const server = http.createServer({
        ...credentials,
        secureProtocol: 'TLS_method',  // Menggunakan protokol TLS terbaru
    }, app);
    
    http.createServer((req, res) => {
        res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url });
        res.end();
    }).listen(80);