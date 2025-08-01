import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import path from 'path';
import bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import crypto from 'crypto';
import PDFKitDocument from 'pdfkit';
import fs from 'fs';
import sharp from 'sharp';
import morgan from 'morgan';
import winston from 'winston';
import cron from 'node-cron';
import { fileURLToPath } from 'url';
import pgSession from 'connect-pg-simple';
//database port
import { pool } from './db.js';
//cek upload file
import uploadKTP from './backend/config/uploads/upload_ktp.js';
import { uploadProfile } from './backend/config/uploads/upload_profpicture.js';
import { pdfDUpload, imgDUpload } from './backend/config/uploads/upload_document.js';
import { ttdVerifMiddleware } from './backend/config/uploads/upload_ttdverif.js';
import { uploadDocumentMiddleware } from './backend/config/multer.js';
export {
  uploadKTP,
  uploadProfile,
  pdfDUpload,
  imgDUpload,
  ttdVerifMiddleware,
  uploadDocumentMiddleware
};
import { staticConfig } from './backend/config/static.js';
import userRoutes from './backend/routesxcontroller/userRoutes.js';

//session endpoint
import loginRouter from './backend/endpoint_session/login/login_endpoint.js';
import regisRouter from './backend/endpoint_session/registrasi/registrasi_endpoint.js';
import passwordResetRouter from './backend/endpoint_session/password_service.js';
import profileRouter from './backend/endpoint_session/profile/profile_endpoint.js';

const app = express();
const PORT = 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

staticConfig(app);

const morganMiddleware = morgan(
  ':method :url :status :res[content-length] - :response-time ms',
  {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  }
);
// 2. Setup Winston (Application Logging)
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

app.use(cookieParser());
// Konfigurasi session
app.use(session({
    secret: process.env.SESSION_SECRET, // Gantilah dengan secret yang lebih aman
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Hanya untuk pengembangan, di production harus set ke true jika menggunakan HTTPS
}));

app.get('/check-cookie', (req, res) => {
    const userCookie = req.cookies['user'];
    res.send(userCookie ? `Hello ${userCookie}` : 'No user cookie found');
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/design-n-script', express.static(path.join(__dirname, 'design-n-script')));
app.use('/asset', express.static(path.join(__dirname, 'asset')));
app.use(express.static('public'));
app.use('/api/users', userRoutes);
app.use('/api/auth', loginRouter);
app.use('/api/auth', regisRouter);
app.use('/api/auth', passwordResetRouter);
app.use('/api/auth', profileRouter);
///////////////////////////////////////////////////////////////////////////////
import rateLimit from 'express-rate-limit';

const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 3, // Maksimal 3 request
  message: {
    success: false,
    code: 'TOO_MANY_REQUESTS',
    message: 'Terlalu banyak permintaan reset password'
  }
});

app.use('/api/auth/reset-password-request', resetPasswordLimiter);
//////////////////////////////////////////////////////////////////////////////
// Tambahkan setelah inisialisasi pool
const PGStore = pgSession(session);

app.use(session({
  store: new PGStore({
    pool: pool,
    tableName: 'user_sessions',
    createTableIfMissing: true
  }),
  secret: process.env.SESSION_SECRET || 'default-secret-untuk-development',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 1 hari
  }
}));
// Tambahkan di bagian atas setelah import
const requiredEnvVars = ['PG_USER', 'PG_HOST', 'PG_DATABASE', 'PG_PASSWORD', 'PG_PORT'];

requiredEnvVars.forEach(env => {
  if (!process.env[env]) {
    console.error(`❌ Variabel lingkungan ${env} tidak ditemukan`);
    process.exit(1);
  }
});
/////////////////////////////////////////////////////////////

// API untuk melayani file gambar atau PDF
app.get('/public/*', (req, res) => {
    const filePath = path.join(__dirname, req.url);
    res.sendFile(filePath);
});

// API untuk melayani file dokumen yang diupload
app.get('/uploads/documents/*', (req, res) => {
    const filePath = path.join(__dirname, 'public', req.url);
    res.sendFile(filePath);
});
// Endpoint untuk mengambil data pengguna yang statusnya pending
app.get('/api/users/pending', async (_req, res) => {
    try {
        const query = 'SELECT * FROM verified_users WHERE verifiedstatus = $1';
        const result = await pool.query(query, ['verified_pending']);
        res.json(result.rows);
    } catch (err) {
        console.error("Gagal membaca data pengguna:", err);
        res.status(500).json({ error: "Gagal membaca data pengguna" });
    }
});


// Endpoint untuk mengambil data pengguna yang sudah lengkap (status: complete)
app.get('/api/users/complete', async (_req, res) => {
    try {
        const query = 'SELECT * FROM verified_users WHERE verifiedstatus = $1';
        const result = await pool.query(query, ['complete']); 
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Tidak ada data pengguna dengan status 'complete'." });
        }
        
        // Kirimkan data pengguna dengan status 'complete'
        res.json(result.rows);
    } catch (err) {
        console.error("Gagal membaca data pengguna:", err);
        res.status(500).json({ error: "Gagal membaca data pengguna" });
    }
});
// end save endpoint users to validate users //
//
// Endpoint admin untuk update data user
app.post('/api/users/update', async (req, res) => {
    const { email, userid, divisi } = req.body;

    if (!email || !userid || !divisi) {
        return res.status(400).json({ message: 'Email, UserID, dan Divisi wajib diisi.' });
    }
    try {
        const updateQuery = 'UPDATE verified_users SET userid = $1, Divisi = $2 WHERE email = $3 RETURNING *';
        const result = await pool.query(updateQuery, [userid, divisi, email]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Pengguna tidak ditemukan' });
        }

        res.status(200).json({ message: 'Data pengguna berhasil diperbarui.' });
    } catch (err) {
        console.error("Error saat update data user:", err);
        res.status(500).json({ message: 'Terjadi kesalahan saat menyimpan data.' });
    }
});

//

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


// Endpoint profile x header start//

// Endpoint untuk mendapatkan data profil pengguna
app.get('/api/profile', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: 'User belum login.' });
    }
    const user = req.session.user;

    res.json({
        userid: user.userid,
        nama: user.nama,
        email: user.email,
        telepon: user.telepon,
        divisi: user.divisi,
        fotoprofil: user.fotoprofil,
        password: user.password,
        username: user.username,
        nip: user.nip,
        special_field: user.special_field,
        special_parafv: user.special_parafv,
        statuspengguna: user.statuspengguna,
        tanda_tangan_path: user.tanda_tangan_path,
        tanda_tangan_mime: user.tanda_tangan_mime
    });
});
// ==== bagian ini akan direfactor \\
app.post('/api/update-profile-paraf', 
  ttdVerifMiddleware,
  async (req, res) => {
    try {
        const userDivisi = req.session.user.divisi;
        
        // Validasi session dan divisi
        if (!req.session.user || 
            (userDivisi !== 'Peneliti' && 
             userDivisi !== 'Peneliti Validasi' && 
             userDivisi !== 'PPAT' && 
             userDivisi !== 'PPATS')) {
          return res.status(403).json({ 
            success: false, 
            message: 'Hanya divisi tertentu yang boleh upload tanda tangan' 
          });
        }

        if (!req.processedTTD) {
          return res.status(400).json({ 
            success: false, 
            message: 'File tanda tangan wajib diupload' 
          });
        }

        // Hapus file lama jika ada
        if (req.session.user.tanda_tangan_path) {
          try {
            const fullPath = path.join(__dirname, '..', 'public', req.session.user.tanda_tangan_path);
            await fs.unlink(fullPath).catch(() => {});
          } catch (error) {
            console.error('Error deleting old signature:', error);
          }
        }

        // Update database
        const updateQuery = `
          UPDATE verified_users 
          SET 
            tanda_tangan_path = $1,
            tanda_tangan_mime = $2
          WHERE userid = $3
          RETURNING tanda_tangan_path, tanda_tangan_mime
        `;
        
        const result = await pool.query(updateQuery, [
          req.processedTTD.url,
          req.processedTTD.mimeType,
          req.session.user.userid
        ]);

        // Update session
        req.session.user.tanda_tangan_path = result.rows[0].tanda_tangan_path;
        req.session.user.tanda_tangan_mime = result.rows[0].tanda_tangan_mime;

        res.json({ 
          success: true,
          message: 'Tanda tangan berhasil diupload',
          data: {
            path: req.processedTTD.url,
            mimeType: req.processedTTD.mimeType,
            size_kb: Math.round(req.processedTTD.size / 1024)
          }
        });

    } catch (error) {
      console.error('[TTD UPLOAD ERROR]', error);
      res.status(500).json({ 
        success: false, 
        message: 'Gagal mengupload tanda tangan',
        error: process.env.NODE_ENV === 'development' ? error.message : null
      });
    }
  }
);
////
app.get('/api/tanda-tangan/:userid', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT tanda_tangan_path, tanda_tangan_mime 
       FROM verified_users 
       WHERE userid = $1`,
      [req.params.userid]
    );

    if (!result.rows[0]?.tanda_tangan_path) {
      return res.status(404).json({ 
        success: false, 
        message: 'Tanda tangan tidak ditemukan' 
      });
    }

    const filePath = path.join(
      __dirname, 
      '..', 
      'public', 
      result.rows[0].tanda_tangan_path
    );

    // Set header Content-Type sesuai MIME type dari database
    res.setHeader('Content-Type', result.rows[0].tanda_tangan_mime);
    
    // Stream file langsung dari filesystem
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('[TTD RETRIEVAL ERROR]', error);
    res.status(500).json({ 
      success: false, 
      message: 'Gagal mengambil tanda tangan' 
    });
  }
});

//
app.post('/api/update-profile', async (req, res) => {
    // Pastikan user sudah login
    if (!req.session.user) {
        return res.status(401).json({ message: 'User belum login.' });
    }

    const { username, nip, specialField } = req.body;
    const { userid, divisi } = req.session.user;

    // Validasi input dasar
    if (!username || !nip) {
        return res.status(400).json({ message: 'Username dan NIP harus diisi.' });
    }

    // Validasi khusus untuk PPAT/PPATS
    if ((divisi === 'PPAT' || divisi === 'PPATS') && !specialField) {
        return res.status(400).json({ message: 'Bidang khusus wajib diisi untuk PPAT/PPATS.' });
    }

    try {
        // Persiapkan query dan parameter berdasarkan divisi
        let query, params;
        
        if (divisi === 'PPAT' || divisi === 'PPATS') {
            query = `
                UPDATE verified_users 
                SET username = $1, nip = $2, special_field = $3 
                WHERE userid = $4
                RETURNING username, nip, special_field
            `;
            params = [username, nip, specialField, userid];
        } else {
            query = `
                UPDATE verified_users 
                SET username = $1, nip = $2 
                WHERE userid = $3
                RETURNING username, nip
            `;
            params = [username, nip, userid];
        }

        // Eksekusi query
        const result = await pool.query(query, params);
        const updatedUser = result.rows[0];

        if (result.rowCount > 0) {
            // Update session dengan data baru
            req.session.user.username = updatedUser.username;
            req.session.user.nip = updatedUser.nip;
            
            // Jika PPAT/PPATS, update juga special_field di session
            if (divisi === 'PPAT' || divisi === 'PPATS') {
                req.session.user.specialField = updatedUser.special_field;
            }

            // Siapkan response
            const responseData = {
                success: true,
                message: 'Profil berhasil diperbarui.',
                username: updatedUser.username,
                nip: updatedUser.nip
            };

            // Tambahkan specialField ke response jika PPAT/PPATS
            if (divisi === 'PPAT' || divisi === 'PPATS') {
                responseData.specialField = updatedUser.special_field;
            }

            return res.status(200).json(responseData);
        } else {
            return res.status(400).json({ 
                success: false,
                message: 'Tidak ada perubahan pada profil.' 
            });
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        
        // Handle unique constraint violation (misal: username sudah ada)
        if (error.code === '23505') {
            return res.status(400).json({ 
                success: false,
                message: 'Username sudah digunakan oleh user lain.' 
            });
        }
        
        return res.status(500).json({ 
            success: false, 
            message: 'Gagal memperbarui profil',
            error: error.message 
        });
    }
});




// Endpoint untuk meng-upload foto profil
app.post('/api/profile/upload', uploadProfile.single('fotoprofil'), async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: 'User belum login.' });
    }

    if (!req.file) {
        return res.status(400).json({ message: 'Foto profil tidak ditemukan.' });
    }

    // Mengubah path agar sesuai dengan format URL yang dapat diakses di browser
    const newFotoPath = '/penting_F_simpan/profile-photo/' + encodeURIComponent(req.file.filename.replace('\\','/'));  // Path relatif yang disimpan di database

    // Update foto profil di database
    const updateQuery = 'UPDATE verified_users SET fotoprofil = $1 WHERE userid = $2 RETURNING *';
    try {
        const result = await pool.query(updateQuery, [newFotoPath, req.session.user.userid]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
        }

        // Perbarui foto profil yang ada di session
        req.session.user.foto = newFotoPath;

        res.status(200).json({ message: 'Foto profil berhasil diperbarui.' });
    } catch (error) {
        console.error('Error saat mengupdate foto profil:', error.message);
        res.status(500).json({ message: 'Terjadi kesalahan saat memperbarui foto profil.' });
    }
});

//change password
// Endpoint untuk meng-update password
app.post('/api/update-password', async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    if (!req.session.user) {
        return res.status(401).json({ message: 'User belum login.' });
    }

    try {
        // Ambil data pengguna berdasarkan session
        const user = req.session.user;

        // Cek apakah password lama yang dimasukkan benar
        const match = await bcrypt.compare(oldPassword, user.password);
        if (!match) {
            return res.status(400).json({ message: 'Password lama salah.' });
        }

        // Hash password baru sebelum disimpan
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        // Update password baru di database
        const updateQuery = 'UPDATE verified_users SET password = $1 WHERE userid = $2 RETURNING *';
        const result = await pool.query(updateQuery, [hashedNewPassword, user.userid]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
        }

        // Perbarui password yang ada di session
        req.session.user.password = hashedNewPassword;

        res.status(200).json({ message: 'Password berhasil diperbarui.' });
    } catch (error) {
        console.error('Error saat memperbarui password:', error.message);
        res.status(500).json({ message: 'Terjadi kesalahan saat memperbarui password.' });
    }
});
////////////////////
// Start Member endpoint //
app.get('/api/members-header', async (req, res) => {
    // Pastikan user sudah login dan session ada
    if (!req.session.user) {
        return res.status(401).json({ message: 'User not logged in' });
    }

    try {
        const { divisi } = req.session.user; // Ambil divisi dari session user

        const query = 'SELECT fotoprofil, nama, statuspengguna, username FROM verified_users WHERE divisi = $1';
        const result = await pool.query(query, [divisi]);

        const usersm = result.rows.map(row => ({
            fotoprofil: row.fotoprofil,
            nama: row.nama,
            statuspengguna: row.statuspengguna,
            username: row.username
        }));

        res.json({ usersm });
    } catch (error) {
        console.error('Error fetching members:', error);
        res.status(500).json({ message: 'Failed to fetch members' });
    }
});
// End Member endpoint //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


// End endpoint profile x header//  

// Start endpoint Dashboard Admin case//
// Membuat endpoint untuk menghitung jumlah anggota berdasarkan divisi
app.get('/api/member-count/admin-access', async (req, res) => {
    const { divisi } = req.query; // Mengambil divisi yang dipilih dari query parameter

    try {
        // Query untuk menghitung jumlah anggota berdasarkan divisi
        const query = 'SELECT COUNT(*) FROM verified_users WHERE divisi = $1';
        const result = await pool.query(query, [divisi]);

        // Mengambil hasil jumlah anggota
        const count = result.rows[0].count;

        // Kirim hasil jumlah anggota ke frontend
        res.json({ count });
    } catch (error) {
        console.error('Error fetching member count:', error);
        res.status(500).json({ message: 'Failed to fetch member count' });
    }
});
// End endpoint Dashboard Admin case//

// Start endpoint Dashboard //
// Endpoint untuk mengambil data bulan dan tahun yang dipilih
app.post('/api/select-month/dashboard', async (req, res) => {
    const { month, year } = req.body; // Menerima bulan dan tahun dari frontend

    try {
        // Simpan bulan dan tahun yang dipilih ke database jika diperlukan
        const query = `INSERT INTO selected_months (month, year) VALUES ($1, $2)`;
        await pool.query(query, [month, year]);

        res.status(200).json({
            success: true,
            message: 'Bulan dan tahun berhasil dipilih',
        });
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan saat menyimpan data bulan dan tahun.',
        });
    }
});

app.get('/api/user/dashboard', (req, res) => {
    if (req.session.user) {
        // Kirim data yang ada di session
        res.json({
            userid: req.session.user.userid,
            divisi: req.session.user.divisi,
            username: req.session.user.username,
            email: req.session.user.email
        });
    } else {
        res.status(401).json({ message: 'User not logged in' });
    }
});

// End endpoint Dashboard //
    
// Start PPATK Endpoint // (belum selesai)
// Endpoint untuk menyimpan booking dan perhitungan BPHTB
app.post('/api/ppatk_create-booking-and-bphtb', morganMiddleware,async (req, res) => {
    const userid = req.session.user ? req.session.user.userid : null;
    const nama = req.session.user ? req.session.user.nama : null;
    // Pastikan user sudah login dan session ada
    if (!userid || !nama) {
        logger.warn('Unauthorized access attempt', { endpoint: req.originalUrl });
        return res.status(401).json({ message: 'Silakan login terlebih dahulu.' });
    }

    // Validasi Divisi
    if (!['PPAT', 'PPATS'].includes(req.session.user.divisi)) {
        logger.warn('Forbidden access attempt', { user: userid, divisi: req.session.user.divisi });
        return res.status(403).json({ message: 'Hanya pengguna dengan divisi PPAT dan PPATS yang bisa membuat booking' });
    }

    const client = await pool.connect();
    const { 
        jenis_wajib_pajak, noppbb, namawajibpajak, alamatwajibpajak, 
        namapemilikobjekpajak, alamatpemilikobjekpajak, tahunajb, 
        kabupatenkotawp, kecamatanwp ,kelurahandesawp, rtrwwp, npwpwp, kodeposwp, 
        kabupatenkotaop, kecamatanop, kelurahandesaop, rtrwop, npwpop, kodeposop, status_kepemilikan,

        // Penghitungan NJOP
        luas_tanah, njop_tanah, luas_bangunan, njop_bangunan,
        
        // Data perhitungan BPHTB
        nilaiPerolehanObjekPajakTidakKenaPajak, bphtb_yangtelah_dibayar,
        
        // Data Objek Pajak
        hargatransaksi, letaktanahdanbangunan, rt_rwobjekpajak,  kelurahandesalp, kecamatanlp, jenisPerolehan,
        keterangan, nomor_sertifikat, tanggal_perolehan, tanggal_pembayaran, 
        nomor_bukti_pembayaran
    } = req.body;
        const tanggal = req.body.tanggal;  // Misalnya 01052025
        console.log("Tanggal AJB yang diterima di backend:", tanggal);


        // Mapping value ke tampilan yang lebih baik
        const statusKepemilikanMap = {
            'milik_pribadi': 'Milik Pribadi',
            'milik_bersama': 'Milik Bersama',
            'sewa': 'Sewa',
            'hgb': 'Hak Guna Bangunan'
        };

        const statusKepemilikanFormatted = statusKepemilikanMap[status_kepemilikan] || null;


    try {
        await client.query('BEGIN');  // Memulai transaksi

        // 1. Simpan data booking ke tabel ppatk_bookingsspd
        const bookingQuery = `
            INSERT INTO ppatk_bookingsspd (userid, jenis_wajib_pajak, noppbb, namawajibpajak, 
                                           alamatwajibpajak, namapemilikobjekpajak, alamatpemilikobjekpajak, 
                                           tanggal, tahunajb, kabupatenkotawp, kecamatanwp, kelurahandesawp, 
                                           rtrwwp, npwpwp, kodeposwp, kabupatenkotaop, kecamatanop, kelurahandesaop, 
                                           rtrwop, npwpop, kodeposop, trackstatus, nama)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, 'Draft', $22)
            RETURNING bookingid, nobooking;
        `;
        const bookingValues = [
            userid, jenis_wajib_pajak, noppbb, namawajibpajak, alamatwajibpajak,
            namapemilikobjekpajak, alamatpemilikobjekpajak, tanggal, tahunajb,
            kabupatenkotawp, kecamatanwp, kelurahandesawp, rtrwwp, npwpwp, kodeposwp,
            kabupatenkotaop, kecamatanop, kelurahandesaop, rtrwop, npwpop, kodeposop, nama
        ];

        const bookingResult = await client.query(bookingQuery, bookingValues);
        if (!bookingResult.rows[0] || !bookingResult.rows[0].nobooking) {
            return res.status(500).json({ message: 'Gagal mendapatkan booking ID.' });
        }
        const nobooking = bookingResult.rows[0].nobooking;  // Mendapatkan nobooking setelah data disimpan
        const Bookingid = bookingResult.rows[0].bookingid;  // Mendapatkan bookingid setelah data disimpan

        if (!nobooking) {
            await client.query('ROLLBACK');
            return res.status(500).json({ message: 'Gagal mendapatkan nobooking.' });
        }

        console.log('Nobooking berhasil diambil:', nobooking);
        console.log('Bookingid berhasil diambil:', Bookingid);

        const penghitunganquery = `
            INSERT INTO ppatk_penghitungan_njop (nobooking, luas_tanah, njop_tanah, luas_bangunan, njop_bangunan)
            VALUES ($1, $2, $3, $4, $5);`;
        const penghitunganvalues = [nobooking, luas_tanah, njop_tanah, luas_bangunan, njop_bangunan];

        await client.query(penghitunganquery, penghitunganvalues);

        // 2. Simpan data perhitungan BPHTB ke tabel ppatk_bphtb_perhitungan
        const bphtbQuery = `
            INSERT INTO ppatk_bphtb_perhitungan 
                (nobooking, nilaiPerolehanObjekPajakTidakKenaPajak, bphtb_yangtelah_dibayar)
            VALUES ($1, $2, $3);
        `;
        const bphtbValues = [
            nobooking, nilaiPerolehanObjekPajakTidakKenaPajak, bphtb_yangtelah_dibayar
        ];

        await client.query(bphtbQuery, bphtbValues);  // Menyimpan perhitungan BPHTB

        // 3. Simpan data objek pajak ke tabel ppatk_objek_pajak
        const objekPajakQuery = `
            INSERT INTO ppatk_objek_pajak (nobooking, harga_transaksi, letaktanahdanbangunan, rt_rwobjekpajak, status_kepemilikan, 
                                          keterangan, nomor_sertifikat, tanggal_perolehan, 
                                          tanggal_pembayaran, nomor_bukti_pembayaran, kelurahandesalp, kecamatanlp, jenis_perolehan)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13);
        `;
        const objekPajakValues = [
            nobooking, hargatransaksi, letaktanahdanbangunan, rt_rwobjekpajak, statusKepemilikanFormatted, keterangan, nomor_sertifikat,
            tanggal_perolehan, tanggal_pembayaran, nomor_bukti_pembayaran, kelurahandesalp, kecamatanlp, jenisPerolehan 
        ];

        await client.query(objekPajakQuery, objekPajakValues);  // Menyimpan data objek pajak

        const ValidasiQuery = `
            INSERT INTO ppatk_validasi_tambahan (nobooking)
            VALUES ($1);
        `;
        const ValidasiValues = [
            nobooking
        ];

        await client.query(ValidasiQuery, ValidasiValues);  // Menyimpan data objek pajak
        await client.query('COMMIT');  // Commit transaksi

        // Mengirimkan response sukses
        res.status(201).json({ 
            success: true, 
            message: 'Booking, perhitungan BPHTB, dan objek pajak berhasil disimpan.',
            nobooking: nobooking
        });

    } catch (error) {
        await client.query('ROLLBACK');  // Rollback transaksi jika terjadi error
        console.error('Error during booking, BPHTB calculation, and objek pajak creation:', error);
        res.status(500).json({
            success: false, 
            message: 'Gagal menyimpan booking, perhitungan BPHTB, dan objek pajak.'
        });
    } finally {
        client.release();  // Melepaskan koneksi setelah operasi selesai
    }
});

//
// Endpoint untuk mengambil data booking
// Tambahkan validasi lebih ketat
app.get('/api/ppatk_get-booking-data', async (req, res) => {
    try {
        // Validasi session
        if (!req.session.user || !req.session.user.userid) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const { userid } = req.session.user;
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const offset = (page - 1) * limit;

        // Query utama dengan optimasi
        const query = `
            SELECT
                b.nobooking, b.noppbb, b.tanggal, b.tahunajb,
                b.namawajibpajak, b.namapemilikobjekpajak, b.npwpwp,
                b.trackstatus, b.akta_tanah_path, b.sertifikat_tanah_path, b.pelengkap_path,
                o.letaktanahdanbangunan AS alamat_objek, pv.*
            FROM ppatk_bookingsspd b
            LEFT JOIN ppatk_objek_pajak o ON b.nobooking = o.nobooking
            LEFT JOIN ppatk_validasi_tambahan pv ON b.nobooking = pv.nobooking
            WHERE b.userid = $1 AND b.trackstatus IN ('Draft','Diolah','Ditolak','Dilanjutkan','Diverifikasi','Terverifikasi')
            ORDER BY b.created_at DESC
            LIMIT $2 OFFSET $3;
        `;

        const result = await pool.query(query, [userid, limit, offset]);

        // Query count terpisah untuk performa lebih baik
        const countQuery = `SELECT COUNT(*) FROM ppatk_bookingsspd WHERE userid = $1`;
        const countResult = await pool.query(countQuery, [userid]);
        
        res.json({
            success: true,
            data: result.rows,
            pagination: {
                total: parseInt(countResult.rows[0].count),
                page,
                totalPages: Math.ceil(countResult.rows[0].count / limit)
            }
        });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});
///
app.get('/api/ppatk_get-booking-data/:nobooking', async (req, res) => {
    const { nobooking } = req.params;
    const { userid } = req.session.user;

    if (!userid) {
        return res.status(401).json({
            success: false,
            message: 'User tidak terautentikasi'
        });
    }

    try {
        // Query lengkap dengan JOIN ke semua tabel terkait
        const query = `
            SELECT 
            b.nobooking, b.userid, b.jenis_wajib_pajak, b.nobooking, b.noppbb, b.namawajibpajak, b.alamatwajibpajak,
            b.namapemilikobjekpajak, b.alamatpemilikobjekpajak, b.tanggal, b.tahunajb, b.kabupatenkotawp, b.kecamatanwp,
            b.kelurahandesawp, b.rtrwwp, b.npwpwp, b.kodeposwp, b.kabupatenkotaop, b.kecamatanop, b.kelurahandesaop,
            b.rtrwop, b.npwpop, b.kodeposop, b.trackstatus, b.akta_tanah_path, b.sertifikat_tanah_path, b.pelengkap_path, b.nama, b.created_at,
                o.letaktanahdanbangunan, o.rt_rwobjekpajak, o.status_kepemilikan, 
                o.keterangan, o.nomor_sertifikat, o.tanggal_perolehan,
                o.tanggal_pembayaran, o.nomor_bukti_pembayaran,
                pp.luas_tanah, pp.luas_bangunan,
                vu.special_field, vu.telepon,
                pv.*
            FROM ppatk_bookingsspd b
            LEFT JOIN ppatk_objek_pajak o ON b.nobooking = o.nobooking
            LEFT JOIN ppatk_penghitungan_njop pp ON b.nobooking = pp.nobooking
            LEFT JOIN verified_users vu ON vu.userid = b.userid
            LEFT JOIN ppatk_validasi_tambahan pv ON b.nobooking = pv.nobooking
            WHERE b.nobooking = $1 AND b.userid = $2
            LIMIT 1;
        `;

        const result = await pool.query(query, [nobooking, userid]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Data booking tidak ditemukan atau tidak memiliki akses'
            });
        }

        const bookingData = result.rows[0];

        // Format data sesuai kebutuhan form
        const responseData = {
            success: true,
            booking: {
                // Data pemohon (dari verified_users)
                nama_pemohon: bookingData.special_field,
                no_telepon: bookingData.telepon,
                // Data wajib pajak (dari ppatk_bookingsspd)
                nama_wajib_pajak: bookingData.namawajibpajak,
                kelurahan: bookingData.kelurahandesawp,
                kecamatan: bookingData.kecamatanwp,
                kabupaten_kota: bookingData.kabupatenkotawp,
                alamat_wajib_pajak: bookingData.alamatwajibpajak,
                nop: bookingData.noppbb,
                atas_nama: bookingData.namapemilikobjekpajak,
                // Data objek pajak
                Alamatop: bookingData.letaktanahdanbangunan,
                lainnya: bookingData.keterangan,
                // Data NJOP
                luas_tanah: bookingData.luas_tanah || 0,
                luas_bangunan: bookingData.luas_bangunan || 0
            }
        };

        res.json(responseData);

    } catch (error) {
        console.error("Error fetching booking data:", error);
        res.status(500).json({ 
            success: false, 
            message: 'Terjadi kesalahan server saat mengambil data booking' 
        });
    }
});
///
// API UNTUK STATUS VALIDASI PPATK //
app.post('/api/save-ppatk-additional-data', async (req, res) => {
    try {
        const { userid } = req.session.user;
        const { 
            nobooking,
            alamat_pemohon,
            kampungop,
            kelurahanop,
            kecamatanopj,
        } = req.body;

        if (!userid) {
            return res.status(401).json({ 
                success: false, 
                message: 'User tidak terautentikasi' 
            });
        }

        // Check if booking belongs to user
        const bookingCheck = await pool.query(
            'SELECT userid FROM ppatk_bookingsspd WHERE nobooking = $1',
            [nobooking]
        );

        if (bookingCheck.rows.length === 0 || bookingCheck.rows[0].userid !== userid) {
            return res.status(403).json({ 
                success: false, 
                message: 'Tidak memiliki akses ke data ini' 
            });
        }

        // Save to additional data table
        const result = await pool.query(`
        UPDATE ppatk_validasi_tambahan SET
                alamat_pemohon = $1,
                kampungop = $2,
                kelurahanop = $3,
                kecamatanopj = $4,
                updated_at = NOW()
            WHERE nobooking = $5
            RETURNING *
        `, [alamat_pemohon, kampungop,
            kelurahanop, kecamatanopj, nobooking ]);

        res.json({ 
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Error saving additional data:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Gagal menyimpan data tambahan' 
        });
    }
});
//

app.post('/api/ppatk_upload-input_validasisspd',
  (req, res, next) => {
    // Middleware untuk menangani PDF
    pdfDUpload.single('pdfDokumen')(req, res, (err) => {
      if (err) return next(err);
      
      // Middleware untuk menangani gambar-gambar
      imgDUpload.fields([
        { name: 'aktaTanah', maxCount: 1 },
        { name: 'sertifikatTanah', maxCount: 1 },
        { name: 'pelengkap', maxCount: 1 }
      ])(req, res, next);
    });
  }, async (req, res) => {
    const { userid } = req.session.user; // Ambil userId dari session atau body request (sesuai implementasi frontend)

    if (!userid) {
        return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    // Memastikan ada file yang di-upload
    if (!req.files || !req.files.aktaTanah || !req.files.sertifikatTanah || !req.files.pelengkap) {
        return res.status(400).json({ success: false, message: 'No files uploaded or missing files.' });
    }

    // Pastikan nobooking yang dikirim dari frontend ada di body
    const { nobooking } = req.body;  // Menarik nobooking yang dipilih dari frontend

    if (!nobooking) {
        return res.status(400).json({ success: false, message: 'No booking selected' });
    }

    // Menyimpan jalur file ke dalam database
    const aktaTanahPath = req.files.aktaTanah ? req.files.aktaTanah[0].path : null;
    const sertifikatTanahPath = req.files.sertifikatTanah ? req.files.sertifikatTanah[0].path : null;
    const pelengkapPath = req.files.pelengkap ? req.files.pelengkap[0].path : null;

    // Debugging: Console log untuk melihat apakah file path sudah benar
    console.log('Uploaded files paths:');
    console.log('Akta Tanah Path:', aktaTanahPath);
    console.log('Sertifikat Tanah Path:', sertifikatTanahPath);
    console.log('File Pelengkap Path:', pelengkapPath);

    try {
        // Cek apakah nobooking yang dipilih ada di ppatk_bookingsspd
        const result = await pool.query('SELECT * FROM ppatk_bookingsspd WHERE nobooking = $1 AND userid = $2', [nobooking, userid]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'No booking not found in database' });
        }

        // Menyimpan file paths ke dalam database
        const updateQuery = `
            UPDATE ppatk_bookingsspd 
            SET 
                akta_tanah_path = $1,
                sertifikat_tanah_path = $2,
                pelengkap_path = $3
            WHERE nobooking = $4
            RETURNING *;
        `;

        const values = [aktaTanahPath, sertifikatTanahPath, pelengkapPath, nobooking];

        // Debugging: Console log untuk melihat query dan values yang digunakan
        console.log('Updating booking with No. Booking:', nobooking);
        console.log('Update Query:', updateQuery);
        console.log('Values to update:', values);

        const resultUpdate = await pool.query(updateQuery, values);

        // Debugging: Cek apakah data berhasil di-update di database
        if (resultUpdate.rowCount > 0) {
            console.log('File paths successfully updated in the database:', resultUpdate.rows[0]);
            res.json({ success: true, message: 'Files uploaded and paths saved in database.',
                data:{
                    akta_tanah_path: result.rows[0].akta_tanah_path,
                    sertifikat_tanah_path:result.rows[0].sertifikat_tanah_path,
                    pelengkap_path:result.rows[0].pelengkap_path
                }
             });
        } else {
            console.log('No booking found for the given NoBooking.');
            res.status(404).json({ success: false, message: 'No booking found for the given NoBooking.' });
        }
    } catch (error) {
        console.error('Error saving file paths to database:', error);
        res.status(500).json({ success: false, message: 'Failed to save file paths.' });
    }
});
///
//
/*
app.post('/api/ppatk_upload-signatures', ttdVerifMiddleware.fields([
    { name: 'signature1', maxCount: 1 },  // Tanda tangan Wajib Pajak
    { name: 'signature2', maxCount: 1 }   // Tanda tangan PPATK
]), async (req, res) => {
    // Logger yang lebih terstruktur
    const logger = {
        info: (...args) => console.log('[INFO]', ...args),
        error: (...args) => console.error('[ERROR]', ...args),
        debug: (...args) => console.debug('[DEBUG]', ...args)
    };

    logger.info('Memulai proses upload tanda tangan...');
    
    try {
        // 1. Validasi Session dan User
        logger.debug('Session data:', req.session);
        const { userid } = req.session.user || {};
        
        if (!userid) {
            logger.error('UserID tidak ditemukan di session');
            return res.status(401).json({ 
                success: false, 
                message: 'Autentikasi diperlukan' 
            });
        }

        // 2. Validasi Request Body
        logger.debug('Request body:', req.body);
        const { nobooking } = req.body;
        
        if (!nobooking) {
            logger.error('NoBooking tidak ditemukan di request body');
            return res.status(400).json({ 
                success: false, 
                message: 'Nomor Booking diperlukan',
                error_code: 'MISSING_BOOKING_NUMBER'
            });
        }

        // 3. Validasi File Upload
        logger.debug('Files yang diterima:', req.files);
        
        if (!req.files || !req.files.signature2) {
            logger.error('File tanda tangan tidak lengkap', {
                signature1: !!req.files?.signature1,
                signature2: !!req.files?.signature2
            });
            
            return res.status(400).json({ 
                success: false, 
                message: 'Tanda tangan PPAT harus diunggah',
                error_code: 'INCOMPLETE_SIGNATURES'
            });
        }

        // 4. Normalisasi Path File (cross-platform)
        const normalizePath = (filePath) => filePath.replace(/\\/g, '/');
        
        const signature1Path = req.files.signature1 
            ? normalizePath(req.files.signature1[0].path) 
            : null;
        const signature2Path = normalizePath(req.files.signature2[0].path);
        
        logger.debug('Detail file upload:', {
            ttd_wp: req.files.signature1?.[0] ? {
                path: signature1Path,
                name: req.files.signature1[0].originalname,
                size: req.files.signature1[0].size
            } : null,
            ttd_ppatk: {
                path: signature2Path,
                name: req.files.signature2[0].originalname,
                size: req.files.signature2[0].size
            }
        });

        // 5. Verifikasi Data di Database
        logger.debug('Memverifikasi booking dan user...');
        
        const [bookingCheck, userData] = await Promise.all([
            pool.query(
                'SELECT 1 FROM ppatk_bookingsspd WHERE nobooking = $1 AND userid = $2', 
                [nobooking, userid]
            ),
            pool.query(
                'SELECT userid, nama FROM verified_users WHERE userid = $1', 
                [userid]
            )
        ]);

        if (bookingCheck.rows.length === 0) {
            logger.error('Booking tidak valid', { nobooking, userid });
            return res.status(404).json({
                success: false,
                message: 'Nomor Booking tidak valid',
                error_code: 'INVALID_BOOKING'
            });
        }

        if (userData.rows.length === 0) {
            logger.error('User tidak ditemukan', { userid });
            return res.status(404).json({
                success: false,
                message: 'Data user tidak ditemukan',
                error_code: 'USER_NOT_FOUND'
            });
        }

        const { nama } = userData.rows[0];
        logger.debug('Data valid:', { nobooking, userid, nama });

        // 6. Simpan ke Database
        logger.debug('Menyimpan tanda tangan ke database...');
        
        const insertQuery = `
            INSERT INTO ppatk_sign (
                nobooking, 
                userid, 
                nama, 
                path_ttd_wp, 
                path_ttd_ppatk
            ) VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `;

        const insertParams = [
            nobooking,
            userid,
            nama,
            signature1Path,
            signature2Path
        ];

        logger.debug('Executing query:', { query: insertQuery, params: insertParams });
        
        const insertResult = await pool.query(insertQuery, insertParams);

        if (insertResult.rows.length === 0) {
            logger.error('Gagal menyimpan data tanda tangan');
            throw new Error('INSERT operation failed');
        }

        logger.info('Tanda tangan berhasil disimpan', { 
            id: insertResult.rows[0].id,
            nobooking 
        });

        // 7. Response Sukses
        return res.json({ 
            success: true, 
            message: 'Tanda tangan berhasil diunggah',
            data: {
                nobooking,
                user: { userid, nama },
                signatures: {
                    wajib_pajak: signature1Path ? {
                        path: signature1Path,
                        url: `/uploads/${path.basename(signature1Path)}`
                    }: null,
                    ppatk: {
                        path: signature2Path,
                        url: `/uploads/${path.basename(signature2Path)}`
                    }
                },
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        logger.error('Error proses upload:', {
            message: error.message,
            stack: error.stack,
            ...(error.code && { code: error.code })
        });

        // Cleanup file jika error terjadi setelah upload
        if (req.files) {
            try {
                logger.debug('Cleaning up uploaded files...');
                const cleanupPromises = [
                    req.files.signature1?.[0]?.path && fs.promises.unlink(req.files.signature1[0].path),
                    req.files.signature2?.[0]?.path && fs.promises.unlink(req.files.signature2[0].path)
                ].filter(Boolean);
                
                await Promise.all(cleanupPromises);
            } catch (cleanupError) {
                logger.error('Gagal membersihkan file:', cleanupError);
            }
        }

        const errorResponse = {
            success: false,
            message: 'Terjadi kesalahan sistem',
            error_code: 'SERVER_ERROR'
        };

        if (process.env.NODE_ENV === 'development') {
            errorResponse.debug = {
                message: error.message,
                ...(error.code && { code: error.code }),
                stack: error.stack
            };
        }

        return res.status(500).json(errorResponse);
    }
});
*/
// ============================ \\
///
async function generateRegistrationNumber() {
    try {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1; // January is 0
        
        // [OPTIMASI DATABASE] - Pastikan index sudah dibuat
        // CREATE INDEX idx_reg_year ON terima_berkas_sspd (no_registrasi) 
        // WHERE no_registrasi ~ '^[0-9]{4}O[0-9]{5}$';

        // Cek tahun terakhir dari data created_at
        const lastEntry = await pool.query('SELECT created_at FROM terima_berkas_sspd ORDER BY created_at DESC LIMIT 1');
        const lastEntryYear = lastEntry.rows[0] ? new Date(lastEntry.rows[0].created_at).getFullYear() : currentYear;
        
        // Logika tahun berganti
        if (lastEntryYear < currentYear) {
            console.log(`[SYSTEM] Tahun berganti dari ${lastEntryYear} ke ${currentYear}. Nomor registrasi direset.`);
        }

        // Cari nomor registrasi terakhir dari tahun yang sama
        const lastRegQuery = `
            SELECT no_registrasi 
            FROM terima_berkas_sspd 
            WHERE no_registrasi ~ $1
            ORDER BY no_registrasi DESC 
            LIMIT 1
        `;
        const regexPattern = `^${currentYear}O[0-9]{5}$`;
        const lastRegResult = await pool.query(lastRegQuery, [regexPattern]);
        
        let nextNumber = 1; // Reset setiap tahun baru
        
        if (lastRegResult.rows.length > 0) {
            const lastReg = lastRegResult.rows[0].no_registrasi;
            const lastNumber = parseInt(lastReg.match(/O(\d{5})$/)[1]);
            nextNumber = lastNumber + 1;
            
            // Peringatan akhir tahun jika nomor hampir habis
            if (currentMonth === 12 && nextNumber >= 99900) {
                console.warn(`[WARNING] Nomor registrasi tahun ${currentYear} hampir penuh. Terakhir: ${nextNumber}`);
            }

            if (nextNumber > 99999) {
                throw new Error(`Nomor registrasi tahun ${currentYear} sudah penuh (${nextNumber-1}/99999). Hubungi administrator.`);
            }
        }
        
        const newRegNumber = `${currentYear}O${nextNumber.toString().padStart(5, '0')}`;
        console.log(`[INFO] Generated new registration number: ${newRegNumber}`);
        return newRegNumber;
    } catch (error) {
        console.error('[ERROR] Error generating registration number:', error);
        throw new Error('Gagal menghasilkan nomor registrasi. Silakan coba lagi atau hubungi administrator.');
    }
}
//
app.post('/api/ppatk_ltb-process', async (req, res) => {
    const { nobooking, trackstatus, userid, nama } = req.body;

    try {
        // Memastikan userid valid
        const userCheckQuery = 'SELECT * FROM verified_users WHERE userid = $1';
        const userCheckResult = await pool.query(userCheckQuery, [userid]);

        if (userCheckResult.rows.length === 0) {
            return res.status(400).json({ success: false, message: 'User ID tidak ditemukan.' });
        }
        // Pastikan nobooking, trackstatus, dan userid ada dan valid
        if (!nobooking || !trackstatus || !userid || !nama) {
            return res.status(400).json({ success: false, message: 'Data yang diperlukan tidak lengkap.' });
        }
        const allowedStatuses = ['Diolah', 'Diterima', 'Ditolak'];
        if (!allowedStatuses.includes(trackstatus)) {
            return res.status(400).json({ success: false, message: 'Status tidak valid.' });
        }

        // 1. Cek apakah nobooking ada di ppatk_bookingsspd
        const checkNobookingQuery = `
        SELECT 
        pb.*, bp.*, o.*, vu.*, pv.*
        FROM 
            ppatk_bookingsspd pb
        LEFT JOIN 
            ppatk_bphtb_perhitungan bp ON pb.nobooking = bp.nobooking
        LEFT JOIN 
            ppatk_objek_pajak o ON pb.nobooking = o.nobooking
        LEFT JOIN
            verified_users vu ON vu.nama = pb.nama
        LEFT JOIN
            ppatk_validasi_tambahan pv ON pb.nobooking = pv.nobooking
        WHERE 
            pb.nobooking = $1;
        `;
        const checkResult = await pool.query(checkNobookingQuery, [nobooking]);
        if (checkResult.rows.length === 0) {
            return res.status(400).json({ success: false, message: 'No Booking tidak ditemukan.' });
        }

        const rowData = checkResult.rows[0];
        if (!rowData.akta_tanah_path || !rowData.sertifikat_tanah_path || !rowData.pelengkap_path) {
            return res.status(400).json({
                success: false,
                message: 'File yang diperlukan belum di-upload atau tidak lengkap. Pastikan Akta Tanah, Sertifikat Tanah, dan File Pelengkap telah di-upload.'
            });
        }
        if (!rowData.alamat_pemohon || !rowData.kampungop || !rowData.kelurahanop || !rowData.kecamatanopj) {
            const missingFields = [];
            if (!rowData.alamat_pemohon) missingFields.push("alamat_pemohon");
            if (!rowData.kampungop) missingFields.push("kampungop");
            if (!rowData.kelurahanop) missingFields.push("kelurahanop");
            if (!rowData.kecamatanopj) missingFields.push("kecamatanopj");
            return res.status(400).json({
                success: false,
                message: `Data alamat pemohon belum lengkap. Field yang wajib diisi: ${missingFields.join(', ')}`
            });
        }
        // Generate nomor registrasi
        const noRegistrasi = await generateRegistrationNumber();

        // 2. Update trackstatus menjadi status yang baru pada ppatk_bookingsspd
        const updateQuery = 'UPDATE ppatk_bookingsspd SET trackstatus = $1 WHERE nobooking = $2 RETURNING *';
        const updateValues = [trackstatus, nobooking];
        const updateResult = await pool.query(updateQuery, updateValues);

        if (updateResult.rows.length > 0) {
            // 3. Menyimpan data ke tabel terima_berkas_sspd setelah status diperbarui
            const insertQuery = `
                INSERT INTO terima_berkas_sspd 
                (nobooking, tanggal_terima, status, trackstatus, userid, namawajibpajak, namapemilikobjekpajak, divisi, nama, jenis_wajib_pajak, no_registrasi)
                VALUES 
                ($1, CURRENT_DATE, 'Diterima', $2, $3, $4, $5, 'LTB', $6, 'Badan Usaha', $7);
            `;
            const insertValues = [
                nobooking, 
                trackstatus, 
                userid, 
                rowData.namawajibpajak, 
                rowData.namapemilikobjekpajak,
                rowData.nama,
                noRegistrasi
            ];
            const insertResult = await pool.query(insertQuery, insertValues);

            if (insertResult.rowCount > 0) {
            // Modify this part in your endpoint to trigger the notification:
            sendNotificationToLtb(`Data dengan No. Booking ${nobooking} berhasil diproses dan statusnya diperbarui menjadi "${trackstatus}".`);
                console.log(`Data dengan No. Booking ${nobooking} telah diproses oleh LTB dan status diubah menjadi ${trackstatus}.`);

                res.status(200).json({
                    success: true,
                    message: `Data dengan No. Booking ${nobooking} berhasil diproses oleh LTB.`,
                    no_registrasi: noRegistrasi
                });
            } else {
                res.status(400).json({ success: false, message: 'Gagal menyimpan data ke tabel terima_berkas_sspd.' });
            }
        } else {
            res.status(400).json({ success: false, message: 'Gagal mengubah status data.' });
        }
    } catch (error) {
        console.error('Error processing data:', error.message);
        res.status(500).json({ success: false, message: 'Terjadi kesalahan saat memproses data.' });
    }
});
/////////////////////                               ////////////////////////////////////////////////////
// Endpoint untuk menghasilkan PDF (membuat tampilannya menjadi lebih baik, serta menampilkan nama dari pembuat sspd)
app.get('/api/ppatk_generate-pdf-badan/:nobooking', async (req, res) => {
    const { nobooking } = req.params; // Ambil nobooking dari URL parameter\
    console.log('nobooking:', nobooking);

    try {
        const trackingresult = await pool.query(`
            SELECT userid, nama FROM ppatk_bookingsspd WHERE nobooking = $1
        `, [nobooking]);

        if (trackingresult.rows.length === 0) {
            return res.status(404).json({ message: 'Data untuk nobooking ini tidak ditemukan' });
        }

        const creator = trackingresult.rows[0];
        // Pastikan bahwa kita menggunakan userid pembuat untuk menggenerate PDF, bukan userid login
        const { userid, nama } = creator; // Ambil userid dan nama pembuat (bukan user login)

        // Verifikasi jika data yang dihasilkan adalah milik pembuat
        if (!userid || !nama) {
            return res.status(400).json({ success: false, message: 'User ID dan nama pembuat is required' });
        }

        // Ambil data dari database untuk nobooking tertentu berdasarkan userid
        const result = await pool.query(`
            SELECT DISTINCT
            pb.nobooking, pb.noppbb, pb.userid, pb.jenis_wajib_pajak, pb.namawajibpajak, pb.alamatwajibpajak, 
            pb.namapemilikobjekpajak, pb.alamatpemilikobjekpajak, pb.tanggal, pb.tahunajb, 
            pb.kabupatenkotawp, pb.kecamatanwp, pb.kelurahandesawp, pb.rtrwwp, 
            pb.npwpwp, pb.kodeposwp, pb.kabupatenkotaop, pb.kecamatanop, pb.kelurahandesaop, pb.rtrwop, 
            pb.npwpop, pb.kodeposop, pb.akta_tanah_path, pb.sertifikat_tanah_path, pb.pelengkap_path, 
            pb.trackstatus, 
            bp.nilaiperolehanobjekpajaktidakkenapajak, bp.bphtb_yangtelah_dibayar, 
            o.harga_transaksi, o.letaktanahdanbangunan, o.rt_rwobjekpajak, o.status_kepemilikan, o.keterangan, 
            o.nomor_sertifikat, o.tanggal_perolehan, o.tanggal_pembayaran, o.nomor_bukti_pembayaran, o.kelurahandesalp, o.kecamatanlp, o.jenis_perolehan,
            vb.nama, vb.special_field,
            pp.luas_tanah, pp.njop_tanah, pp.luas_bangunan, pp.njop_bangunan, pp.luasxnjop_tanah, pp.luasxnjop_bangunan, pp.total_njoppbb,
            ps.path_ttd_ppatk, ps.path_ttd_wp,
            substring(ps.path_ttd_wp from '\.([^\.]*)$') as wp_ext,
            substring(ps.path_ttd_ppatk from '\.([^\.]*)$') as ppatk_ext
        FROM 
            ppatk_bookingsspd pb
        LEFT JOIN 
            ppatk_bphtb_perhitungan bp ON pb.nobooking = bp.nobooking
        LEFT JOIN 
            ppatk_objek_pajak o ON pb.nobooking = o.nobooking
        LEFT JOIN
            verified_users vb ON vb.nama = pb.nama AND pb.userid = vb.userid
        LEFT JOIN
            ppatk_penghitungan_njop pp ON pb.nobooking = pp.nobooking 
        LEFT JOIN
            ppatk_sign ps ON pb.nobooking = ps.nobooking
            WHERE 
                pb.userid = $1 AND vb.nama = $2 AND pb.nobooking = $3`, [userid, nama, nobooking]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Data not found' });
        }
        const data = result.rows[0]; // Ambil data pertama (karena nobooking harus unik)
        //
        
        // Membuat PDF menggunakan pdfkit
        const doc = new PDFKitDocument({ margin: 30, size: 'A4' });

        // Menggunakan font Helvetica untuk seluruh teks
        doc.font('Helvetica');
        // Menyiapkan header untuk response agar browser tahu ini adalah PDF
        res.setHeader('Content-Type', 'application/pdf');
        const disposition = req.query.download ? 'attachment' : 'inline';
        res.setHeader('Content-Disposition', `${disposition}; filename="${nobooking}_document.pdf"`);

        // Mengirimkan PDF ke browser 
        doc.pipe(res);  // Pipe langsung ke response (res) untuk mengirim PDF
        
        

        // Menambahkan logo di kiri header
        const logoPath = 'public/asset/Logobappenda_pdf.png'; // Ganti dengan path logo Anda
        const pageWidth = 595; // Lebar halaman PDF (A4 dalam titik)
        const logoWidth = pageWidth * 0.11; // Menentukan lebar logo menjadi 20% dari lebar halaman PDF
        doc.image(logoPath, 35, 30, { width: logoWidth }); // Menggunakan ukuran dinamis berdasarkan halaman

        // Menambahkan teks "BAPPENDA" di kanan header
        doc.font('Helvetica-Bold').fontSize(16).text('SURAT SETORAN PAJAK DAERAH', 200, 40, { width: 450 });
        doc.font('Helvetica-Bold').fontSize(16).text('BEA PEROLEHAN HAK ATAS TANAH DAN BANGUNAN', 130, 60, { width: 450 });
        doc.font('Helvetica-Bold').fontSize(16).text('(SSPD - BPHTB)', 260, 80, { width: 450 });
        // Menambahkan garis pemisah di bawah header
        doc.moveTo(0, 105)
           .lineTo(700, 105)
           .stroke();
        doc.font('Helvetica-Bold').fontSize(9).text('Badan Pengelolaan Pendapatan Daerah Kabupaten Bogor', 40, 110, { width: 450 });
        const leftX = 50;   // Posisi X untuk label (kiri)
        const rightX = 150; // Posisi X untuk data (kanan)

        // vertical kiri
        doc.moveTo(30, 120)
           .lineTo(30, 545)
           .stroke();
        doc.moveTo(560, 120)
           .lineTo(560, 545)
           .stroke();   
        // horizontal
        doc.moveTo(0, 120)
           .lineTo(700, 120)
           .stroke();
        // font pertama untuk data wp
        doc.font('Helvetica-Bold').fontSize(10)
        .text('No. Booking', leftX, 125)
        .text('No. NPWP', leftX, 140)
        .text('Nama Wajib Pajak', leftX, 155)
        .text('Alamat Wajib Pajak', leftX, 170)
        .text('Kabupaten/Kota', leftX, 195)
        .text('Kecamatan', leftX, 210)
        .text('Tahun AJB', leftX, 225)
        .text('Kelurahan/Desa', 320, 195)
        .text('RT/RW', 320, 210)
        .text('Kodepos', 320, 225);
        doc.font('Helvetica').fontSize(10)
        .text(':', rightX - 10, 125)
           .text(data.nobooking, rightX, 125)
           .text(':', rightX - 10, 140)
           .text(data.npwpwp, rightX, 140)
           .text(':', rightX - 10, 155)
           .text(data.namawajibpajak, rightX, 155)
           .text(':', rightX - 10, 170)
           .text(data.alamatwajibpajak, rightX, 170)
           .text(':', rightX - 10, 195)
           .text(data.kabupatenkotawp, rightX, 195)
           .text(':', rightX - 10, 210)
           .text(data.kecamatanwp, rightX, 210)
           .text(':', rightX - 10, 225)
           .text(data.tahunajb, rightX, 225)
           .text(':', 420 - 10, 195)
           .text(data.kelurahandesawp, 420, 195)
           .text(':', 420 - 10, 210)
           .text(data.rtrwwp, 420, 210)
           .text(':', 420 - 10, 225)
           .text(data.kodeposwp, 420, 225);
           // End font-1
        // Menambahkan label dan data untuk informasi lainnya
        doc.fontSize(10).text(`Jenis Wajib Pajak     : Badan Usaha`, 320, 125);

        function formatTanggal(tanggalString) {
        const [day, month, year] = tanggalString.split('-');
        const bulan = [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];
        return `${day} ${bulan[parseInt(month) - 1]} ${year}`;
        }

        // Contoh penggunaan di PDFKit
        const tanggalPembayaran = data.tanggal_pembayaran;
        const tanggalPerolehan = data.tanggal_perolehan;
        const tanggalFormattedB = formatTanggal(tanggalPembayaran);
        const tanggalFormattedO = formatTanggal(tanggalPerolehan);

        // Menambahkan garis pemisah setelah data Wajib Pajak
        doc.moveTo(30, 235).lineTo(560, 235).stroke();
        doc.font('Helvetica-Bold').fontSize(10)
        .text('Nomor Objek Pajak(NOP) PBB', leftX, 245)
        .text('Objek Tanah dan/atau Bangunan', leftX, 260)
        .text('Keterangan', leftX, 295)
        .text('RT/RW', leftX, 310)
        .text('Status Kepemilikan', leftX, 325)
        .text('Nomor Bukti Pembayaran', 320, 295)
        .text('Tanggal Perolehan', 320, 310)
        .text('Tanggal Pembayaran', 320, 325);
        doc.font('Helvetica').fontSize(10)
            .text(':', 230 - 10, 245)
           .text(data.noppbb, 230, 245)
           .text(':', 230 - 10, 260)
           .text(data.letaktanahdanbangunan, 230, 260)
           .text(':', rightX - 10, 295)
           .text(data.keterangan, rightX, 295)
           .text(':', rightX - 10, 310)
           .text(data.rt_rwobjekpajak, rightX, 310)
           .text(':', rightX - 10, 325)
           .text(data.status_kepemilikan, rightX, 325)
           .text(':', 460 - 10, 295)
           .text(data.nomor_bukti_pembayaran, 460, 295)
           .text(':', 460 - 10, 310)
           .text(`${tanggalFormattedO}`, 460, 310)
           .text(':', 460 - 10, 325)
           .text(`${tanggalFormattedB}`, 460, 325);
        /////

        doc.font('Helvetica-Bold').fontSize(10).text('Nomor Sertifikat', 320, 350)
        .text(':', 410 - 10, 350)
        .text(data.nomor_sertifikat, 410, 350);
        doc.font('Helvetica-Bold').fontSize(10).text('Perhitungan NJOP PBB:', 40, 350, { width: 450 });
            // Fungsi konversi format tanggal
/////////////////////////////////////////////////////////
                // Data tabel yang akan ditampilkan (dengan perhitungan otomatis untuk Luas * NJOP PBB/m2)
        const tableData = [['BPHTB', 'Luas/m²', 'NJOP PBB', 'Luas × NJOP PBB/m²'],
        ['Tanah (Bumi)', formatNumber(data.luas_tanah), formatCurrency(data.njop_tanah), formatCurrency(data.luasxnjop_tanah)],
        ['Bangunan', formatNumber(data.luas_bangunan), formatCurrency(data.njop_bangunan), formatCurrency(data.luasxnjop_bangunan)] ];

        // Buat tabel
        const totalTanah = parseFloat(data.luasxnjop_tanah) || 0;
        const totalBangunan = parseFloat(data.luasxnjop_bangunan) || 0;
        const grandTotal = totalBangunan + totalTanah;
        createTable(doc, tableData, { 
            totals: {
              tanah: totalTanah,
              bangunan: totalBangunan,
              grandTotal: grandTotal
            }
          });
function createTable(doc, data, options = {}) {
    // Konfigurasi tabel
    const config = {
        startX: 40,
        startY: 360,
        cellPadding: 4,
        rowHeight: 20,
        colWidths: [100, 80, 120, 180],
        ...options
    };

    let currentY = config.startY;
    const tableWidth = config.colWidths.reduce((a, b) => a + b, 0);

// 1. GARIS ATAS HEADER (full width)
    doc.moveTo(config.startX, currentY)
       .lineTo(config.startX + tableWidth, currentY)
       .stroke();

    // 2. HEADER (kolom 1-4)
    doc.font('Helvetica-Bold');
    data[0].forEach((cell, i) => {
        doc.text(cell, 
            config.startX + config.colWidths.slice(0, i).reduce((a, b) => a + b, 0),
            currentY + config.cellPadding,
            { width: config.colWidths[i], align: 'center' }
        );
    });
    
    // 3. GARIS BAWAH HEADER (full width)
    currentY += config.rowHeight;
    doc.moveTo(config.startX, currentY)
       .lineTo(config.startX + tableWidth, currentY)
       .stroke();

    // 4. ISI DATA (kolom 1-4)
    doc.font('Helvetica');
    for (let i = 1; i < data.length; i++) {
        data[i].forEach((cell, j) => {
            doc.text(
                cell,
                config.startX + config.colWidths.slice(0, j).reduce((a, b) => a + b, 0) + 5,
                currentY + config.cellPadding,
                { width: config.colWidths[j] - 10, align: j === 0 ? 'left' : 'right' }
            );
        });
        currentY += config.rowHeight;
    }

    // 5. GARIS VERTIKAL UNTUK BARIS 1 & 2 (kolom 1-4)
    let currentX = config.startX;
    const dataEndY = currentY; // Garis vertikal berakhir di sini untuk kolom 1-2
    
    // Kolom 1
    doc.moveTo(currentX, config.startY)
       .lineTo(currentX, dataEndY)
       .stroke();
    
    // Kolom 2
    currentX += config.colWidths[0];
    doc.moveTo(currentX, config.startY)
       .lineTo(currentX, dataEndY)
       .stroke();
    
    // Kolom 3 & 4 akan dilanjutkan sampai baris 3

    // 6. BAGIAN TOTAL (hanya kolom 3 & 4)
    if (options.totals) {
        const col3StartX = config.startX + config.colWidths[0] + config.colWidths[1];
        const col4EndX = config.startX + tableWidth;

        // Garis horizontal di atas total (hanya kolom 3-4)
        doc.moveTo(col3StartX, currentY)
           .lineTo(col4EndX, currentY)
           .stroke();
        
        // Text TOTAL NILAI (hanya di kolom 3-4)
        doc.font('Helvetica-Bold')
           .text('TOTAL NILAI', 
               col3StartX + 5,
               currentY + config.cellPadding,
               { width: config.colWidths[2], align: 'center' })
           .text(formatCurrency(options.totals.grandTotal), 
               col3StartX + config.colWidths[2] + 5,
               currentY + config.cellPadding,
               { width: config.colWidths[3] - 10, align: 'right' });
        
        currentY += config.rowHeight;

        // GARIS VERTIKAL KOLOM 3 & 4 (lanjut sampai baris 3)
        doc.moveTo(520, 360)
           .lineTo(520, 440)
           .stroke();
        doc.moveTo(40, 420)
           .lineTo(520, 420)
           .stroke();
        currentX = col3StartX;
        doc.moveTo(currentX, config.startY)
           .lineTo(currentX, currentY)
           .stroke();
        
        currentX += config.colWidths[2];
        doc.moveTo(currentX, config.startY)
           .lineTo(currentX, currentY)
           .stroke();

        // GARIS BAWAH (hanya kolom 3-4)
        doc.moveTo(col3StartX, currentY)
           .lineTo(config.startX + tableWidth, currentY)
           .stroke();
    }

    doc.y = currentY + 20;
    return { endY: currentY };
}
doc.font('Helvetica').fontSize(10).text(
  `Jenis Perolehan:   ${data.jenis_perolehan}`, 
  80, 
  445
);
doc.font('Helvetica').fontSize(10).text(
  `Harga Transaksi/Nilai Pasar:   ${formatCurrency(data.harga_transaksi)}`, 
  230, 
  445
);doc.moveTo(260 + 100, 455)
       .lineTo(520,455)
       .stroke();
doc.moveTo(30, 465)
.lineTo(560,465)
.stroke();
const hargaTransaksi = parseFloat(data.harga_transaksi) || 0;

// Fungsi untuk membandingkan dan mendapatkan nilai terbesar
function getNilaiTerbesar(grandTotal, hargaTransaksi) {
    // Bersihkan format currency jika ada (misal: "Rp1,000,000" -> 1000000)
    const cleanGrandTotal = typeof grandTotal === 'string' 
        ? parseFloat(grandTotal.replace(/[^\d]/g, '')) 
        : grandTotal;
    
    const cleanHargaTransaksi = typeof hargaTransaksi === 'string' 
        ? parseFloat(hargaTransaksi.replace(/[^\d]/g, '')) 
        : hargaTransaksi;
    
    return Math.max(cleanGrandTotal, cleanHargaTransaksi);
}
const nilaiTerbesar = getNilaiTerbesar(grandTotal, hargaTransaksi);
const npoptkp = parseFloat(data.nilaiperolehanobjekpajaktidakkenapajak) || 0;
const nilaidata_NPOPKP = Math.max(0, nilaiTerbesar - npoptkp);
const pajakTerutang = nilaidata_NPOPKP * 0.05;
const kurangBayar = Math.max(0, pajakTerutang - data.bphtb_yangtelah_dibayar);
///////////////////////////////////////////////////////////////////////////////////
    doc.font('Helvetica-Bold').fontSize(10).text('Penghitungan BPHTB', 40, 470);
    doc.font('Helvetica').fontSize(8).text('(Harga diisi berdasarkan penghitungan Wajib Pajak)', 40 + 105, 471.5);
        doc.moveTo(30, 480)
       .lineTo(560, 480)
       .moveTo(405, 480)
       .lineTo(405, 545)
        .moveTo(415, 480)
       .lineTo(415, 545)
       .stroke();
    doc.fontSize(9)
    .text('1. Nilai Perolehan Objek Pajak (NPOP) ', 40, 485)
    .text('2. Nilai Perolehan Objek Pajak Tidak Kena Pajak (NPOPTKP)', 40, 495)
    .text('3. Nilai Perolehan Objek Pajak Kena Pajak (NPOPKP)', 40, 505)
    .text('4. Bea Perolehan Hak atas Tanah dan Bangunan yang terutang', 40, 515)
    .text('5. Bea Perolehan Hak atas Tanah dan Bangunan yang telah dibayar', 40, 525)
    .text('6. Bea Perolehan Hak atas Tanah dan Bangunan yang kurang dibayar', 40, 535);
    doc.fontSize(9)
    .text(`${formatCurrency(nilaiTerbesar)}`, 420, 485)
    .text(`${formatCurrency(data.nilaiperolehanobjekpajaktidakkenapajak)}`, 420, 495)
    .text(`${formatCurrency(nilaidata_NPOPKP)}`, 420, 505)
    .text(`${formatCurrency(pajakTerutang)}`, 420, 515)
    .text(`${formatCurrency(data.bphtb_yangtelah_dibayar)}`, 420, 525)
    .text(`${formatCurrency(kurangBayar)}`, 420, 535);
    doc.fontSize(8)
    .text('1', 407, 485)
    .text('2', 407, 495)
    .text('3', 407, 505)
    .text('4', 407, 515)
    .text('5', 407, 525)
    .text('6', 407, 535);

    doc.moveTo(320, 480)
    .lineTo(320,545)
    .moveTo(320, 493)
    .lineTo(560,493)
    .moveTo(320, 503)
    .lineTo(560,503)
    .moveTo(320, 513)
    .lineTo(560,513)
    .moveTo(320, 523)
    .lineTo(560,523)
    .moveTo(320, 533)
    .lineTo(560,533)
    .stroke();

    doc.fontSize(9)
    .text('angka 1 - angka 2', 323, 505)
    .text('5% x angka 3', 323, 515)
    .text('angka 4 - angka 5', 323, 535);
    doc.moveTo(0, 545)
       .lineTo(700,545)
       .stroke();

// 6. Section Pemilihan dengan CHECKBOX
        const selectionStartY = 550; // Posisi setelah tabel
        
        doc.font('Helvetica-Bold')
           .fontSize(10)
           .text('Jumlah Setoran Berdasarkan:', 40, selectionStartY)
           .moveTo(0, selectionStartY + 10)
           .lineTo(700, selectionStartY + 10)
           .stroke();

        // Fungsi checkbox
        function drawCheckbox(x, y, checked) {
            doc.rect(x, y, 12, 12).stroke();
            if (checked) {
                doc.font('ZapfDingbats')
                   .text('4', x + 2, y)
                   .font('Helvetica');
            }
        }

        // Data pemilihan
        const pemilihan = data.pemilihan;
        const options = [
            { 
                label: 'a. Penghitungan Wajib Pajak',
                value: 'penghitung_wajib_pajak',
                yPos: selectionStartY + 20,
                details: null
            },
            { 
                label: 'b. STPD BPHTB/SKPDB KURANG BAYAR*)',
                value: 'stpd_kurangbayar',
                yPos: selectionStartY + 35,
                details: {
                    nomor: data.nomorstpd,
                    tanggal: data.tanggalstpd
                }
            },
            { 
                label: 'c. Pengurangan dihitung sendiri menjadi:',
                value: 'dihitungsendiri',
                yPos: selectionStartY + 50,
                details: {
                    persen: data.angkapersen,
                    keterangan: data.keterangandihitungsendiri
                }
            },
            { 
                label: 'd. ' + (data.isiketeranganlainnya || '.........'),
                value: 'lainnyapenghitungwp',
                yPos: selectionStartY + 65,
                details: null
            }
        ];

        // Render checkbox
        options.forEach(opt => {
            const isChecked = pemilihan === opt.value;
            drawCheckbox(40, opt.yPos, isChecked);
            
            doc.font('Helvetica')
               .fontSize(9)
               .text(opt.label, 60, opt.yPos - 2);
            
            if (isChecked && opt.details) {
                if (opt.value === 'stpd_kurangbayar') {
                    doc.text(`Nomor: ${opt.details.nomor || '______'}`, 300, opt.yPos + 35)
                       .text(`Tanggal: ${opt.details.tanggal || '______'}`, 400, opt.yPos + 35);
                } else if (opt.value === 'dihitungsendiri') {
                    doc.text(`${opt.details.persen || '___'}% berdasarkan ${opt.details.keterangan || '......'}`, 
                        300, opt.yPos + 50);
                }
            }
        });
        doc.text('Nomor: ______', 300, selectionStartY + 35)
           .text('Tanggal: ______', 400, selectionStartY + 35)
           .text('% berdasarkan ......', 300, selectionStartY + 50);
///////////////////////////////////////////////////////////////////////////////////////////////////
        // ===== BAGIAN TERBILANG BEA PEROLEHAN HAK ATAS TANAH =====
        const startY = 630; // Posisi setelah tabel BPHTB
        
        // Judul Section
        doc.font('Helvetica')
           .fontSize(10)
           .text('Jumlah Yang Disetorkan:', 40, 630);

        // Fungsi terbilang versi lengkap (support triliun)
        function terbilang(angka) {
            if (angka === 0 || !angka) return 'Nol';
            
            const satuan = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 
                          'Tujuh', 'Delapan', 'Sembilan'];
            const belasan = ['Sepuluh', 'Sebelas', 'Dua Belas', 'Tiga Belas', 
                           'Empat Belas', 'Lima Belas', 'Enam Belas', 
                           'Tujuh Belas', 'Delapan Belas', 'Sembilan Belas'];
            
            function convertLessThanMillion(num) {
                if (num < 10) return satuan[num];
                if (num < 20) return belasan[num - 10];
                if (num < 100) {
                    const puluhan = Math.floor(num / 10);
                    const sisa = num % 10;
                    return satuan[puluhan] + (puluhan === 1 ? ' Puluh ' : ' Puluh ') + 
                           (sisa > 0 ? satuan[sisa] : '');
                }
                if (num < 200) return 'Seratus ' + convertLessThanMillion(num - 100);
                if (num < 1000) {
                    const ratusan = Math.floor(num / 100);
                    const sisa = num % 100;
                    return satuan[ratusan] + ' Ratus ' + convertLessThanMillion(sisa);
                }
                if (num < 2000) return 'Seribu ' + convertLessThanMillion(num - 1000);
                if (num < 1000000) {
                    const ribuan = Math.floor(num / 1000);
                    const sisa = num % 1000;
                    return convertLessThanMillion(ribuan) + ' Ribu ' + convertLessThanMillion(sisa);
                }
                return '';
            }
            
            let result = '';
            const triliun = Math.floor(angka / 1000000000000);
            const sisaTriliun = angka % 1000000000000;
            
            if (triliun > 0) {
                result += convertLessThanMillion(triliun) + ' Triliun ';
            }
            
            const milyar = Math.floor(sisaTriliun / 1000000000);
            const sisaMilyar = sisaTriliun % 1000000000;
            
            if (milyar > 0) {
                result += convertLessThanMillion(milyar) + ' Milyar ';
            }
            
            const juta = Math.floor(sisaMilyar / 1000000);
            const sisaJuta = sisaMilyar % 1000000;
            
            if (juta > 0) {
                result += convertLessThanMillion(juta) + ' Juta ';
            }
            
            result += convertLessThanMillion(sisaJuta);
            
            // Bersihkan spasi ganda dan trim
            return result.replace(/\s+/g, ' ').trim();
        }

        // Format khusus untuk mata uang
        function terbilangRupiah(angka) {
            if (angka === 0 || !angka) return 'Nol Rupiah';
            const terbilangAngka = terbilang(angka);
            return terbilangAngka + ' Rupiah';
        }

        // Ambil nilai dari database
        const nilaiBea = parseFloat(data.bphtb_yangtelah_dibayar) || 0;
        
        // Tampilkan dalam PDF
        doc.font('Helvetica')
           .fontSize(10)
           .text(`${formatCurrency(nilaiBea)}`, 45, 645, { width: 250 })
           .text(`Dengan huruf:`, 250, 630, { width: 500 })
           .text(`${terbilangRupiah(nilaiBea)}`, 255, startY + 15);

        // tampilan nilai border (berdasar angka)
        doc.moveTo(40, 640)
       .lineTo(230,640)
       .moveTo(40, 655)
       .lineTo(230,655)
       .moveTo(40, 640)
       .lineTo(40,655)
       .moveTo(230, 640)
       .lineTo(230,655)
       .stroke();
        // tampilan nilai border (berdasar huruf)
        doc.moveTo(40 + 210, 640)
       .lineTo(380 + 210,640)
       .moveTo(40  + 210, 655)
       .lineTo(380  + 210,655)
       .moveTo(40  + 210, 640)
       .lineTo(40  + 210,655)
       .moveTo(380  + 210, 640)
       .lineTo(380  + 210,655)
       .stroke();
        doc.moveTo(0, 660)
       .lineTo(700,660)
       .stroke();

///////////////////////////////////////////////////////////////////////////////////////////////
    const signatureYPosition = 670; // Posisi vertikal mulai
    const leftMargin = 30; // Margin kiri
    const signatureWidth = 80; // Lebar tanda tangan
    const gapBetween = 24; // Jarak antara kolom tanda tangan
    const columnWidth = signatureWidth + 30;
    const fontSize = 8;
    const lineHeight = 10;
// Fungsi helper untuk teks center
function drawCenteredText(doc, text, x, y, columnWidth) {
    doc.fontSize(fontSize);
    const textWidth = doc.widthOfString(text);
    const startX = x + (columnWidth - textWidth) / 2;
    doc.text(text, startX, y);
}

 const col1X = leftMargin;
drawCenteredText(doc, `${data.kabupatenkotawp}, tgl ${data.tanggal}`, col1X, signatureYPosition, columnWidth);
drawCenteredText(doc, 'WAJIB PAJAK/PENYETOR', col1X, signatureYPosition + lineHeight, columnWidth);


drawCenteredText(doc, `${data.namawajibpajak || '........................'}`, 
                col1X, signatureYPosition + 20, columnWidth);
drawCenteredText(doc, 'Nomor Validasi', col1X, signatureYPosition + 90, columnWidth);
drawCenteredText(doc, '...............', col1X, signatureYPosition + 105, columnWidth);

// 2. Kolom PPAT/Notaris
const col2X = col1X + columnWidth + gapBetween;
drawCenteredText(doc, 'PPAT/PPATS/NOTARIS', col2X, signatureYPosition, columnWidth);
drawCenteredText(doc, `${data.nama || '........................'}`, col2X, signatureYPosition + 10, columnWidth);

if (data.path_ttd_ppatk) {
    doc.image(data.path_ttd_ppatk, col2X + (columnWidth - signatureWidth)/2, signatureYPosition + 15, {
        width: signatureWidth
    });
} else {
    doc.moveTo(col2X + (columnWidth - signatureWidth)/2, signatureYPosition + 50)
       .lineTo(col2X + (columnWidth - signatureWidth)/2 + signatureWidth, signatureYPosition + 50)
       .stroke();
}

drawCenteredText(doc, `${data.special_field || '........................'}`, 
                col2X, signatureYPosition + 70, columnWidth);

// 3. Kolom Tempat Pembayaran
const col3X = col2X + columnWidth + gapBetween;
drawCenteredText(doc, 'DITERIMA OLEH:', col3X, signatureYPosition, columnWidth);
drawCenteredText(doc, 'TEMPAT PEMBAYARAN BPHTB', col3X, signatureYPosition + 10, columnWidth);
drawCenteredText(doc, 'tanggal : .........', col3X, signatureYPosition + 20, columnWidth);

doc.moveTo(col3X + (columnWidth - signatureWidth)/2, signatureYPosition + 50)
   .lineTo(col3X + (columnWidth - signatureWidth)/2 + signatureWidth, signatureYPosition + 50)
   .stroke();

drawCenteredText(doc, '(................................)', 
                col3X, signatureYPosition + 70, columnWidth);

// 4. Kolom BAPPEDA
const col4X = col3X + columnWidth + gapBetween + 20;
drawCenteredText(doc, 'Telah Diverifikasi', col4X, signatureYPosition, columnWidth);
drawCenteredText(doc, 'BADAN PENDAPATAN DAERAH', col4X, signatureYPosition + 10, columnWidth);

const stampWidth = signatureWidth + 30;
doc.rect(col4X + (columnWidth - stampWidth)/2, signatureYPosition + 30, stampWidth, 50)
   .stroke();

drawCenteredText(doc, '(................................)', 
                col4X, signatureYPosition + 70, columnWidth);

// Garis pemisah footer
doc.moveTo(0, signatureYPosition + 85)
   .lineTo(700, signatureYPosition + 85)
   .stroke();
   
   
   // Menyelesaikan dokumen PDF
        doc.end();
///
// Ubah fungsi helper menjadi lebih robust
    function formatCurrency(amount) {
        if (amount == null) return 'Rp 0.00'; // Handle null/undefined
        const num = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
        return 'Rp ' + num.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
    }
    function formatNumber(num) {
        if (num == null) return '0.00'; // Handle null/undefined
        const number = typeof num === 'string' ? parseFloat(num) : Number(num);
        return number.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
    } catch (error) {
        console.warn('Logo not found, proceeding without logo');
        console.error('Error generating PDF:', error);
        res.status(500).json({ message: 'Error generating PDF' });
    }
});
////
/////////////////////////////////////////////////////////////////////////////////////////////
// API untuk mengupdate trackstatus menjadi 'Dihapus'
app.put('/api/ppatk_update-trackstatus/:nobooking', async (req, res) => {
    const { nobooking } = req.params;

    try {
        // Update status track menjadi 'Dihapus'
        const result = await pool.query('UPDATE ppatk_bookingsspd SET trackstatus = $1 WHERE nobooking = $2', ['Dihapus', nobooking]);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Data not found' });
        }

        res.json({ success: true, message: 'Data status berhasil diubah menjadi Dihapus' });
    } catch (error) {
        console.error('Error updating trackstatus:', error);
        res.status(500).json({ message: 'Error updating trackstatus' });
    }
});

///
// (belum selesai)
app.get('/api/admin/ltb-processed', async (_req, res) => {
    try {
        // Query untuk mendapatkan data dengan status "Diolah" dari LTB yang ada di tabel terima_berkas_sspd
        const query = `
            SELECT 
                pb.nobooking, 
                pb.userid, 
                vu.nama AS nama_wajib_pajak, 
                tbs.tanggal_terima, 
                tbs.status, 
                tbs.trackstatus, 
                tbs.pengirim_ltb
            FROM ppatk_bookingsspd pb
            JOIN verified_users vu ON pb.userid = vu.userid
            LEFT JOIN terima_berkas_sspd tbs ON pb.nobooking = tbs.nobooking
            WHERE tbs.trackstatus = 'Diproses'  -- Hanya mengambil data yang sudah diproses
        `;

        const result = await pool.query(query);

        if (result.rows.length > 0) {
            res.status(200).json({
                success: true,
                bookingData: result.rows
            });
        } else {
            res.status(200).json({
                success: true,
                message: 'Tidak ada data yang diproses oleh LTB.'
            });
        }
    } catch (error) {
        console.error('Error fetching processed data:', error);
        res.status(500).json({ success: false, message: 'Gagal memuat data yang diproses oleh LTB.' });
    }
});
//
app.get('/api/ppatk/generate-pdf-mohon-validasi/:nobooking', async (req, res) => {
    const { nobooking } = req.params; // Ambil nobooking dari URL parameter\
    const { pengirim } = req.query;
    
    console.log('nobooking:', nobooking);
    try {
        const bookingQuery = await pool.query(`
            SELECT 
                pb.*, 
                vu.nama AS nama_pengirim,
                vu.userid AS id_pengirim
            FROM ppatk_bookingsspd pb
            LEFT JOIN verified_users vu ON pb.userid = vu.userid
            WHERE pb.nobooking = $1
        `, [nobooking]);

        if (bookingQuery.rows.length === 0) {
            return res.status(404).json({ message: 'Data tidak ditemukan' });
        }

        const bookingData = bookingQuery.rows[0];
        const pengirimData = {
            nama: pengirim || bookingData.nama_pengirim || '',
            userid: bookingData.id_pengirim || ''
        };
        const trackingresult = await pool.query(`
            SELECT userid, nama FROM ppatk_bookingsspd WHERE nobooking = $1
        `, [nobooking]);
        if (trackingresult.rows.length === 0) {
            return res.status(404).json({ message: 'Data untuk nobooking ini tidak ditemukan' });
        }
        const parafv = req.session.user.special_parafv
        const creator = trackingresult.rows[0];
        const { userid, nama } = creator;
        if (!userid || !nama) {
            return res.status(400).json({ success: false, message: 'User ID dan nama pembuat is required' });
        }
        const result = await pool.query(`
            SELECT DISTINCT
            pb.nobooking,pb.tanggal, pb.namawajibpajak, pb. alamatwajibpajak, pb.kelurahandesawp, pb.kecamatanwp, pb.kabupatenkotawp, pb.noppbb, pb.namapemilikobjekpajak,
            vu.special_field, vu.telepon, vu.nama, vu.userid,
            po.letaktanahdanbangunan, po.keterangan,
            pp.luas_tanah, pp.luas_bangunan,
            vt.alamat_pemohon, vt.kampungop, vt.kelurahanop, vt.kecamatanopj,
            pv.nama_pengirim
        FROM 
            ppatk_bookingsspd pb
        LEFT JOIN 
            verified_users vu ON  vu.userid = pb.userid
        LEFT JOIN 
            ppatk_objek_pajak po ON pb.nobooking = po.nobooking
        LEFT JOIN
            ppatk_penghitungan_njop pp ON pb.nobooking = pp.nobooking 
        LEFT JOIN
            ppatk_validasi_tambahan vt ON pb.nobooking = vt.nobooking
        LEFT JOIN
            peneliti_verifikasi pv ON pb.nobooking = pv.nobooking
            WHERE 
                pb.userid = $1 AND pb.nobooking = $2`, [userid, nobooking]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Data not found' });
        }
        const data = result.rows[0]; // Ambil data pertama (karena nobooking harus unik)
        //
        data.parafv = parafv
        
        // Membuat PDF menggunakan pdfkit
        const doc = new PDFKitDocument({ margin: 30, size: 'A4' });

        // Menggunakan font Helvetica untuk seluruh teks
        doc.font('Helvetica');
        // Menyiapkan header untuk response agar browser tahu ini adalah PDF
        res.setHeader('Content-Type', 'application/pdf');
        const disposition = req.query.download ? 'attachment' : 'inline';
        const title = `Permohonan Validasi ${nobooking}`;
        res.setHeader('Content-Disposition', `${disposition}; filename="permohonan Validasi_${nobooking}_document.pdf"; title="${title}"`);

        // Mengirimkan PDF ke browser 
        doc.pipe(res);  // Pipe langsung ke response (res) untuk mengirim PDF

        // Coordinates Setup
                const leftColumnX = 20;
                const middleColumnX = 150;
                const rightColumnX = 200;
                let currentY = 50;

                // Font Configuration
                const boldFont = 'Helvetica-Bold';
                const normalFont = 'Helvetica';
                const fontSize = 12;

        // Header Dokumen dengan Background Color
        const headerHeight = 60;
        const footerHeight = 30;

        doc.fillColor('#696969')
        .rect(0, headerHeight - 10, 612, footerHeight)
        .fill();
        doc.fillColor('black');

        doc.font(boldFont).fontSize(14)
        .text('FORMULIR PERMOHONAN PENELITIAN SSPD BPHTB',leftColumnX, 60, {align: 'center',width: 500});
        currentY = headerHeight + footerHeight + 10; // Update posisi Y
        
        doc.font(normalFont).fontSize(fontSize)
           .text('Lamp  : 1 (satu) set', leftColumnX, currentY)
           .text('Perihal : Penyampaian SSPD BPHTB untuk Diteliti', leftColumnX, currentY + 10);
        currentY += 50;

        // Tujuan Surat
        doc.text(`Yth. Kepala Dinas ${data.parafv || '______'}`, leftColumnX, currentY)
           .text('Kabupaten Bogor', leftColumnX, currentY + 10);
        currentY += 30;

        // Data Pemohon
        doc.text('Yang bertanda tangan di bawah ini :', leftColumnX, currentY);
        currentY += 20;

        // Nama Pembhon
        doc.font(normalFont).text('Nama Pemohon', leftColumnX, currentY)
           .font(normalFont).text(':', middleColumnX - 10, currentY)
           .text(nama || '______', middleColumnX, currentY);
        currentY += 12;

        // Alamat
        doc.font(normalFont).text('Alamat', leftColumnX, currentY)
           .font(normalFont).text(':', middleColumnX - 10, currentY)
           .text(data.alamat_pemohon || '______', middleColumnX, currentY);
        currentY += 12;

        // No. Telp
        doc.font(normalFont).text('No. Telepon', leftColumnX, currentY)
           .font(normalFont).text(':', middleColumnX - 10, currentY)
           .text(data.telepon || '______', middleColumnX, currentY);
        currentY += 30;

        // Data Wajib Pajak
        doc.font(normalFont).text('Nama Wajib Pajak', leftColumnX, currentY)
           .font(normalFont).text(':', middleColumnX - 10, currentY)
           .text(data.namawajibpajak || '______', middleColumnX, currentY);
        currentY += 12;

        doc.font(normalFont).text('Alamat', leftColumnX, currentY)
           .font(normalFont).text(':', middleColumnX - 10, currentY)
           .text(data.alamatwajibpajak || '______', middleColumnX, currentY);
        currentY += 12;

        doc.font(normalFont).text('Desa / Kelurahan', leftColumnX, currentY)
           .font(normalFont).text(':', middleColumnX - 10, currentY)
           .text(data.kelurahandesawp || '______', middleColumnX, currentY);
        currentY += 12;

        doc.font(normalFont).text('Kecamatan', leftColumnX, currentY)
           .font(normalFont).text(':', middleColumnX - 10, currentY)
           .text(data.kecamatanwp || '______', middleColumnX, currentY);
        currentY += 12;

        doc.font(normalFont).text('Kabupaten/Kota', leftColumnX, currentY)
           .font(normalFont).text(':', middleColumnX - 10, currentY)
           .text(data.kabupatenkotawp || '______', middleColumnX, currentY);
        currentY += 20;

        // Keterangan Permohonan
        doc.text('Bersama ini disampaikan SSPD BPHTB untuk diteliti atas perolehan hak atas tanah dan/atau bangunan sebagai berikut :', 
                leftColumnX, currentY, { width: 500 });
        currentY += 40;

        // Data Objek Pajak - NOP
        doc.font(normalFont).text('NOP', leftColumnX, currentY)
           .font(normalFont).text(':', middleColumnX - 10, currentY)
           .text(data.noppbb || '______', middleColumnX, currentY);
        currentY += 12;

        // Atas Nama
        doc.font(normalFont).text('Atas Nama', leftColumnX, currentY)
           .font(normalFont).text(':', middleColumnX - 10, currentY)
           .text(data.namapemilikobjekpajak || '______', middleColumnX, currentY);
        currentY += 12;

        // Luas Tanah/Bangunan
        doc.font(normalFont).text('Luas', leftColumnX, currentY)
           .font(normalFont).text(':', middleColumnX - 10, currentY)
           .text(`Tanah ${data.luas_tanah || '______'}m²   Bangunan ${data.luas_bangunan || '______'}m²`, middleColumnX, currentY);
        currentY += 12;

        // Alamat
        doc.font(normalFont).text('Alamat', leftColumnX, currentY)
           .font(normalFont).text(':', middleColumnX - 10, currentY)
           .text(data.letaktanahdanbangunan || '______', middleColumnX, currentY);
        currentY += 12;

        // Lokasi Detail
        doc.font(normalFont).text('Kampung', 150, currentY)
           .font(normalFont).text(':', 250 - 10, currentY)
           .text(data.kampungop || '_______________', 250, currentY);
        currentY += 12;

        doc.font(normalFont).text('Desa/Kelurahan', 150, currentY)
           .font(normalFont).text(':', 250 - 10, currentY)
           .text(data.kelurahanop || '_______________', 250, currentY);
        currentY += 12;

        doc.font(normalFont).text('Kecamatan', 150, currentY)
           .font(normalFont).text(':', 250 - 10, currentY)
           .text(`${data.kecamatanopj || '_______________'}Kabupaten Bogor`, 250, currentY);
        currentY += 20;

        // Bagian Lampiran
        doc.font(boldFont).text('Terlampir dokumen sebagai berikut :', leftColumnX, currentY);
        currentY += 15;

        doc.font(normalFont).fontSize(12)
        .text('a.', 20, 475)
        .text('SSPD BPHTB yang telah diregistrasi.', 32, 475)
        .text('b.', 20, 488)
        .text('Fotocopy KTP Pemohon/Wajib Pajak, apabila dikuasakan disertakan Surat Kuasa dan fotocopy KTP', 32, 488)
        .text('penerima kuasa.', 32, 501)
        .text('c.', 20, 514)
        .text('Foto Copy SPPT PBB dan STTS Terakhir.', 32, 514)
        .text('d.', 20, 527)
        .text('Surat Setoran Bank/bukti penerimaan bank.', 32, 527)
        .text('e.', 20, 540)
        .text('Dokumen yang membuktikan/menunjukan terjadinya perolehan hak atas tanah dan/atau bangunan', 32, 540)
        .text('yang dijadikan dasar pembuatan akta.', 32, 553)
        .text('f.', 20, 566)
        .text('Bukti tidak memiliki tunggakan PBB.', 32, 566)
        .text('g.', 20, 579)
        .text('Fotocopy Sertifikat Tanah.', 32, 579)
        .text('h.', 20, 592).text(data.keterangan || '______', 32, 592);
        currentY += 140;
        function formatTanggal(tanggalString) {
        const [day, month, year] = tanggalString.split('-');
        const bulan = [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];
        return `${day} ${bulan[parseInt(month) - 1]} ${year}`;
        }
        const tanggalformatted = data.tanggal;
        const tanggalF = formatTanggal(tanggalformatted);
        // Tanggal dan Tempat
        doc.fontSize(12).text('Cibinong,', rightColumnX + 210, currentY).text(`${tanggalF}` ||`______ 20__`, rightColumnX + 265, currentY);
        currentY += 20;
        doc.text('Petugas Penerima Berkas,', leftColumnX + 10, currentY)
        .text('Pemohon,', rightColumnX + 240, currentY);
        currentY += 60;

        // Fungsi untuk menghitung posisi x agar teks berada di tengah garis
        const centerAboveLine = (text, lineStartX, lineLength) => {
        const textWidth = doc.widthOfString(text);
        return lineStartX + (lineLength - textWidth) / 2;
        };

        // Posisi dan panjang garis untuk kolom kiri
        const leftLineStartX = leftColumnX + 10;  // Start garis kiri
        const leftLineLength = 150;               // Panjang garis kiri

        // Posisi dan panjang garis untuk kolom kanan 
        const rightLineStartX = rightColumnX + 200; // Start garis kanan
        const rightLineLength = 150;               // Panjang garis kanan

        // Hitung posisi tengah untuk masing-masing teks
        const leftTextX = centerAboveLine(data.nama_pengirim || '_____________________', leftLineStartX, leftLineLength);
        const rightTextX = centerAboveLine(data.special_field || '_____________________', rightLineStartX, rightLineLength);

        // Tambahkan teks di atas garis
        doc.text(data.nama_pengirim, leftTextX, currentY)
        .text(data.special_field, rightTextX, currentY);

        // Finalisasi PDF
        doc.end();

    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Gagal menghasilkan dokumen PDF',
            error: error.message 
        });
    }
});


// End PPATK Endpoint //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////`     Start LTB (Loket Terima Berkas) Endpoint       `//////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// (belum selesai)
app.get('/api/ltb_get-ltb-berkas', async (req, res) => {
  // Cek apakah pengguna sudah login dan apakah divisinya LTB
  if (!req.session.user || req.session.user.divisi !== 'LTB') {
    return res.status(403).json({
      success: false,
      message: 'Akses ditolak. Hanya pengguna dengan divisi LTB yang dapat mengakses data ini.'
    });
  }

  try {
    const ltbDataQuery = `
      SELECT DISTINCT ON (t.no_registrasi)
        t.*, b.*, o.*, bp.*, pp.*, pv.*, vu.*
      FROM 
        terima_berkas_sspd t
      LEFT JOIN ppatk_bookingsspd b ON t.nobooking = b.nobooking
      LEFT JOIN ppatk_objek_pajak o ON t.nobooking = o.nobooking
      LEFT JOIN ppatk_bphtb_perhitungan bp ON t.nobooking = bp.nobooking
      LEFT JOIN ppatk_penghitungan_njop pp ON t.nobooking = pp.nobooking
      LEFT JOIN ppatk_validasi_tambahan pv ON t.nobooking = pv.nobooking
      LEFT JOIN verified_users vu ON b.userid = vu.userid
      WHERE 
        t.trackstatus = 'Diolah' AND t.status = 'Diterima' 
        ORDER BY t.no_registrasi ASC;
    `;

    const result = await pool.query(ltbDataQuery);

    if (result.rows.length > 0) {
      res.status(200).json({
        success: true,
        data: result.rows
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'No data found for LTB.'
      });
    }

  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching data.'
    });
  }
});


////
app.get('/api/getCreatorByBooking/:nobooking', async (req, res) => {
    const { nobooking } = req.params;

    try {
        const result = await pool.query(`
            SELECT userid, nama FROM ppatk_bookingsspd WHERE nobooking = $1
        `, [nobooking]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Data pembuat tidak ditemukan' });
        }

        const creator = result.rows[0];
        res.json(creator); // Mengembalikan userid dan nama pembuat
    } catch (error) {
        console.error('Error fetching creator by nobooking:', error);
        res.status(500).json({ message: 'Error fetching creator data' });
    }
});
////
app.get('/api/getCreatorMohonValidasi/:nobooking', async (req, res) => {
    const { nobooking } = req.params;

    // 1. Validasi Input
    if (!nobooking || nobooking.trim().length === 0) {
        return res.status(400).json({ 
            success: false,
            error: 'Parameter nobooking diperlukan' 
        });
    }

    try {
        // 2. Query Database
        const result = await pool.query(`
            SELECT userid, nama 
            FROM ppatk_bookingsspd 
            WHERE nobooking = $1
        `, [nobooking.trim()]);

        // 3. Handle Hasil Query
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Data pembuat tidak ditemukan' 
            });
        }

        // 4. Response Sukses
        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Error fetching creator by nobooking:', error);
        
        // 5. Error Handling Lebih Baik
        res.status(500).json({ 
            success: false,
            error: 'Terjadi kesalahan server',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});
//
app.post('/api/ltb_ltb-reject', async (req, res) => {
    const { nobooking, trackstatus, rejectionReason, userid } = req.body;

    try {
        // Memastikan userid valid
        const userCheckQuery = 'SELECT * FROM verified_users WHERE userid = $1';
        const userCheckResult = await pool.query(userCheckQuery, [userid]);

        if (userCheckResult.rows.length === 0) {
            return res.status(400).json({ success: false, message: 'User ID tidak ditemukan.' });
        }
        // Validasi data yang diterima
        if (!nobooking || !trackstatus || !rejectionReason || !userid) {
            return res.status(400).json({ success: false, message: 'Data yang diperlukan tidak lengkap.' });
        }
        console.log(req.body);  // Log data yang diterima

        // Memperbarui trackstatus di ppatk_bookingsspd menjadi 'Ditolak'
        const updateTrackQuery = 'UPDATE ppatk_bookingsspd SET trackstatus = $1 WHERE nobooking = $2';
        const updateTrackValues = ['Ditolak', nobooking];
        const updateTrackResult = await pool.query(updateTrackQuery, updateTrackValues);

        if (updateTrackResult.rowCount === 0) {
            return res.status(400).json({ success: false, message: 'No Booking tidak ditemukan.' });
        }

        // Memperbarui status di terima_berkas_sspd
        const deleteTerimaBerkasQuery = `UPDATE terima_berkas_sspd set status=$2 WHERE nobooking = $1`;
        const deleteTerimaBerkasValues = [nobooking, "Ditolak"];
        await pool.query(deleteTerimaBerkasQuery, deleteTerimaBerkasValues);
        // Kirim email pemberitahuan penolakan
        const userName = userCheckResult.rows[0].nama;  // Ambil nama pengguna dari database
        await sendRejectionEmail(userid, nobooking, userName, rejectionReason);  // Mengirim email penolakan

        res.status(200).json({
            success: true,
            message: `Dokumen dengan No. Booking ${nobooking} telah ditolak dan dihapus dari terimaberkas_sspd.`
        });
    } catch (error) {
        console.error('Terjadi kesalahan:', error);
        res.status(500).json({ success: false, message: 'Terjadi kesalahan saat memproses penolakan.' });
    }
});
// Fungsi untuk mengirimkan email pemberitahuan penolakan
async function sendRejectionEmail(_userId, nobooking, userName, rejectionReason) {
    try {
        // Menarik userid pengguna dari divisi PPATK berdasarkan nobooking
        const userQuery = 'SELECT userid FROM ppatk_bookingsspd WHERE nobooking = $1';
        const userResult = await pool.query(userQuery, [nobooking]);

        if (userResult.rows.length === 0) {
            console.log(`No Booking ${nobooking} tidak ditemukan.`);
            return;
        }

        const userId = userResult.rows[0].userid; // Dapatkan userId dari divisi PPATK berdasarkan nobooking

        // Menarik email pengguna PPATK berdasarkan userId
        const emailQuery = 'SELECT email FROM verified_users WHERE userid = $1';
        const emailResult = await pool.query(emailQuery, [userId]);

        if (emailResult.rows.length === 0) {
            console.log(`Email untuk userId ${userId} tidak ditemukan.`);
            return;
        }

        const userEmail = emailResult.rows[0].email; // Ambil email dari hasil query
        console.log(`Mengirim email pemberitahuan penolakan ke: ${userEmail}`);

        // Menyiapkan transporter untuk mengirimkan email
        const transporter = nodemailer.createTransport({
            service: 'gmail', // Gunakan layanan email yang Anda pilih (misalnya Gmail)
            auth: {
                user: process.env.EMAIL_USER, // Pengguna email dari environment variables (pastikan sudah diatur)
                pass: process.env.EMAIL_PASS  // Password email (pastikan sudah diatur di environment variables)
            }
        });

        // Menyiapkan isi email
        const mailOptions = {
            from: process.env.EMAIL_USER,  // Gantilah dengan email pengirim yang sudah diatur di environment variables
            to: userEmail,  // Gantilah dengan email yang diambil dari database
            subject: 'Pemberitahuan Penolakan SSPP',
            text: `Hallo ${userName},\n\nSSPD kamu kami tolak dikarenakan: "${rejectionReason}".\n\nTerima kasih atas perhatian Anda.`
        };

        // Mengirimkan email
        await transporter.sendMail(mailOptions);
        console.log('Email pemberitahuan berhasil dikirim.');

    } catch (error) {
        console.error('Gagal mengirim email pemberitahuan:', error);
    }
}
// rejection end
///
//
// Endpoint untuk mendapatkan data pesanan dari database
app.get('/api/get-orders', async (_req, res) => {
    try {
      const result = await pool.query('SELECT nobooking, nama, jenis_wajib_pajak FROM terima_berkas_sspd');
      
      // Mengirimkan data pesanan sebagai response JSON
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching orders:', error);
      res.status(500).json({ success: false, message: 'Terjadi kesalahan saat mengambil data pesanan.' });
    }
  });
//        

///
app.post('/api/ltb_send-to-peneliti', async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');

        // Destructure dengan validasi
        const { 
            no_registrasi,
            nobooking, 
            userid,
            nama_pengirim, 
            namawajibpajak, 
            namapemilikobjekpajak, 
            tanggal_terima, 
            status = 'Diajukan',
            trackstatus = 'Dilanjutkan',
            keterangan 
        } = req.body;

        if (!no_registrasi || !nobooking || !userid) {
            throw new Error('Data no_registrasi, nobooking, dan userid wajib diisi atau tidak ditemukan');
        }
        if (!nama_pengirim) {
            throw new Error ('Nama pengirim tidak ditemukan, atau tidak sesuai dengan data divisi')
        }

        // 1. Update trackstatus di tabel ppatk
        const updatePpatkQuery = `
            UPDATE ppatk_bookingsspd 
            SET trackstatus = $1 
            WHERE nobooking = $2 
            RETURNING *`;
        const updatePpatkResult = await client.query(updatePpatkQuery, [trackstatus, nobooking]);
        
        if (updatePpatkResult.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ 
                success: false, 
                message: 'Data tidak ditemukan di tabel ppatk_bookingsspd' 
            });
        }

        // 2. Insert ke tabel peneliti (dengan no_registrasi)
        const insertPenelitiQuery = `
            INSERT INTO peneliti_verifikasi (
                no_registrasi,
                nobooking, 
                nama_pengirim, 
                userid, 
                namawajibpajak, 
                namapemilikobjekpajak, 
                tanggal_terima, 
                status, 
                trackstatus, 
                pengirim_ltb
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
            RETURNING *`;
        
        await client.query(insertPenelitiQuery, [
            no_registrasi,
            nobooking, 
            nama_pengirim,
            userid, 
            namawajibpajak, 
            namapemilikobjekpajak, 
            tanggal_terima, 
            status, 
            trackstatus, 
            pengirim_ltb
        ]);

        // 3. Update status di tabel sumber (bukan delete)
       const deleteSourceQuery = `
            DELETE FROM terima_berkas_sspd 
            WHERE nobooking = $1 
            RETURNING no_registrasi`;

        const deleteResult = await client.query(deleteSourceQuery, [nobooking]);

        // 4. Dapatkan info pembuat untuk notifikasi (optimasi dengan JOIN)
        const creatorInfoQuery = `
            SELECT v.email, v.nama 
            FROM ppatk_bookingsspd p
            JOIN verified_users v ON p.userid = v.userid
            WHERE p.nobooking = $1`;
        
        const creatorInfoResult = await client.query(creatorInfoQuery, [nobooking]);
        
        if (creatorInfoResult.rows.length > 0) {
            const { email, nama } = creatorInfoResult.rows[0];
            await sendPenelitiNotificationEmail(
                email, 
                nama, 
                nobooking, 
                status, 
                trackstatus, 
                keterangan
            );
        } else {
            console.warn(`Info creator tidak ditemukan untuk nobooking ${nobooking}`);
        }

        await client.query('COMMIT');
        
        res.json({ 
            success: true, 
            message: 'Data berhasil diproses',
            data: {
                no_registrasi,
                nobooking,
                new_status: status,
                trackstatus
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error in send-to-peneliti:', error);
        
        const errorResponse = {
            success: false,
            message: error.message || 'Gagal memproses permintaan'
        };

        if (process.env.NODE_ENV === 'development') {
            errorResponse.error_details = {
                stack: error.stack,
                original_error: error
            };
        }

        res.status(500).json(errorResponse);
    } finally {
        client.release();
    }
});

// Fungsi email yang disempurnakan
async function sendPenelitiNotificationEmail(creatorEmail, creatorName, nobooking, status, trackstatus, keterangan) {
    try {
        const transporter = nodemailer.createTransport({
            service: process.env.EMAIL_SERVICE || 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        const mailOptions = {
            from: `"PPATK Notifikasi" <${process.env.EMAIL_USER}>`,
            to: creatorEmail,
            subject: `[PPATK] Status Berkas ${nobooking}`,
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                    <h2 style="color: #2c3e50;">Halo, ${creatorName}</h2>
                    <p>Status berkas Anda dengan detail berikut telah diperbarui:</p>
                    
                    <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
                        <tr>
                            <td style="padding: 8px; border: 1px solid #ddd; width: 30%;"><strong>No. Booking</strong></td>
                            <td style="padding: 8px; border: 1px solid #ddd;">${nobooking}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Status</strong></td>
                            <td style="padding: 8px; border: 1px solid #ddd;">${status}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Track Status</strong></td>
                            <td style="padding: 8px; border: 1px solid #ddd;">${trackstatus}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Keterangan</strong></td>
                            <td style="padding: 8px; border: 1px solid #ddd;">${keterangan}</td>
                        </tr>
                    </table>
                    
                    <p>Berkas ini telah dipindahkan ke tim peneliti untuk verifikasi lebih lanjut.</p>
                    <p style="color: #7f8c8d; font-size: 0.9em;">Email ini dikirim secara otomatis, mohon tidak membalas.</p>
                </div>
            `,
            text: `Halo ${creatorName},\n\nStatus berkas Anda dengan No. Booking ${nobooking} telah diperbarui:\n\nStatus: ${status}\nTrack Status: ${trackstatus}\nKeterangan: ${keterangan || '-'}\n\nBerkas ini telah diberikan ke tim peneliti.`
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email terkirim:', info.messageId);
        return true;
    } catch (error) {
        console.error('Gagal mengirim email:', error);
        throw error; // Biarkan error ditangani oleh caller
    }
}

//
//
// End LTB (Loket Terima Berkas) Endpoint //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Start Peneliti Endpoint //
// Peneliti bagian Verifikasi Endpoint //
app.get('/api/peneliti_get-berkas-fromltb', async (req, res) => {
    console.log('[1] Memulai proses peneliti_get-berkas-fromltb');
    console.log('[2] Memeriksa session user:', {
        sessionUser: req.session.user,
        sessionId: req.sessionID
    });


    // Cek apakah pengguna sudah login dan apakah divisinya LTB
    if (!req.session.user || req.session.user.divisi !== 'Peneliti') {
        return res.status(403).json({
            success: false,
            message: 'Akses ditolak. Hanya pengguna dengan divisi Peneliti yang dapat mengakses data ini.'
        });
    }

    try {
        const penelitiUserId = req.session.user.userid;
        // Query untuk mengambil data yang hanya untuk divisi Peneliti
        console.log('[4] User yang terautentikasi:', {
            userId: penelitiUserId,
            division: req.session.user.divisi
        });

        console.log('[5] Menyiapkan query database...');
        const penelitiDataQuery = `
SELECT DISTINCT ON (p.no_registrasi)
    p.*,
    b.*,
    v.tanda_tangan_path AS peneliti_tanda_tangan_path
FROM 
    peneliti_verifikasi p
LEFT JOIN ppatk_bookingsspd b ON p.nobooking = b.nobooking
LEFT JOIN verified_users v ON v.userid = $1
WHERE 
    p.trackstatus = 'Dilanjutkan' 
    ORDER BY p.no_registrasi ASC;
        `;

         console.log('[6] Mengeksekusi query dengan parameter:', {
            query: penelitiDataQuery,
            parameters: [penelitiUserId]
        });
        const result = await pool.query(penelitiDataQuery, [penelitiUserId]);
        
        console.log('[7] Hasil query database:', {
            rowCount: result.rowCount,
            sampleData: result.rows.length > 0 ? result.rows[0] : null
        })
        if (result.rows.length > 0) {
            res.status(200).json({
                success: true,
                data: result.rows
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'No data found for Peneliti'
            });
        }   } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while fetching data.'
        });
    }
});
////
app.get('/api/getCreatorByBooking/:nobooking', async (req, res) => {
    const { nobooking } = req.params;

    try {
        const result = await pool.query(`
            SELECT userid, nama FROM ppatk_bookingsspd WHERE nobooking = $1
        `, [nobooking]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Data pembuat tidak ditemukan' });
        }

        const creator = result.rows[0];
        res.json(creator); // Mengembalikan userid dan nama pembuat
    } catch (error) {
        console.error('Error fetching creator by nobooking:', error);
        res.status(500).json({ message: 'Error fetching creator data' });
    }
});
//
//// (pengerjaan bagian ini)
app.get('/api/peneliti/check-signature', async (req, res) => {
    if (!req.session.user) {
        return res.status(403).json({ success: false, message: 'Akses ditolak.' });
    }

    try {
        const result = await pool.query(
            `SELECT tanda_tangan_blob IS NOT NULL AS has_signature 
             FROM verified_users 
             WHERE userid = $1`,
            [req.session.user.userid]
        );

        res.status(200).json({
            success: true,
            has_signature: result.rows[0]?.has_signature || false
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Gagal memeriksa tanda tangan.' });
    }
});
////
app.get('/api/get-tanda-tangan', async (req, res) => {
    // Validate session first
    if (!req.session.user) {
        return res.status(401).json({ 
            success: false,
            message: 'Anda harus login terlebih dahulu' 
        });
    }

    // Get userid from session instead of query parameter for security
    const { userid, divisi } = req.session.user;
    
    // Only allow Peneliti division to access signatures
    if (divisi !== 'Peneliti') {
        return res.status(403).json({ 
            success: false,
            message: 'Hanya divisi Peneliti yang dapat mengakses tanda tangan' 
        });
    }

    try {
        // Get signature with additional verification that the user matches
        const query = `
            SELECT tanda_tangan_blob, tanda_tangan_path
            FROM verified_users 
            WHERE userid = $1
            AND EXISTS (
                SELECT 1 FROM verified_users 
                WHERE userid = $1 
                AND divisi = 'Peneliti'
            )
        `;
        
        const result = await pool.query(query, [userid]);

        if (!result.rows[0]?.tanda_tangan_blob) {
            return res.status(404).json({ 
                success: false, 
                message: 'Tanda tangan tidak ditemukan atau Anda tidak memiliki akses' 
            });
        }

        // Set cache control headers (cache for 1 day, must-revalidate)
        res.setHeader('Cache-Control', 'private, max-age=86400, must-revalidate');
        res.setHeader('Content-Type', result.rows[0].tanda_tangan_mime || 'image/jpeg');
        
        // Send the binary data
        res.send(result.rows[0].tanda_tangan_blob);

    } catch (error) {
        console.error('[GET TANDA TANGAN ERROR]', error);
        res.status(500).json({ 
            success: false, 
            message: 'Gagal mengambil tanda tangan',
            error: process.env.NODE_ENV === 'development' ? error.message : null
        });
    }
});
///////////
// Add this to your existing backend routes
app.post('/api/peneliti/transfer-signature', async (req, res) => {
    if (!req.session.user) {
        return res.status(403).json({ success: false, message: 'Akses ditolak.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Get all approved records that need signature transfer
        const query = `
            SELECT pv.id, pv.userid, vu.tanda_tangan_path, vu.tanda_tangan_blob
            FROM peneliti_verifikasi pv
            JOIN verified_users vu ON pv.userid = vu.userid
            WHERE pv.persetujuan = 'Iya' 
            AND (pv.ttd_peneliti_blob IS NULL OR pv.ttd_peneliti_mime IS NULL)
            AND vu.tanda_tangan_blob IS NOT NULL
        `;

        const { rows } = await client.query(query);

        // 2. Process each record
        for (const row of rows) {
            await client.query(
                `UPDATE peneliti_verifikasi 
                 SET ttd_peneliti_mime = $1, ttd_peneliti_blob = $2 
                 WHERE id = $3`,
                [row.tanda_tangan_path, row.tanda_tangan_blob, row.id]
            );
        }

        await client.query('COMMIT');

        res.status(200).json({
            success: true,
            message: `Berhasil transfer ${rows.length} tanda tangan`,
            count: rows.length
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error transferring signatures:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal transfer tanda tangan',
            error: error.message
        });
    } finally {
        client.release();
    }
});
////
app.post('/api/peneliti_update-berdasarkan-pemilihan', async (req, res) => {
    // Validate request structure
    console.log('[1] Memulai proses update data peneliti');
    console.log('[2] Request body awal:', JSON.stringify(req.body, null, 2));
    if (!req.body.data) {
        return res.status(400).json({
            success: false,
            message: 'Data payload tidak valid'
        });
    }

    const {
        userid,
        nobooking,
        pemilihan,
        nomorstpd,
        tanggalstpd,
        angkapersen,
        keterangandihitungSendiri,
        isiketeranganlainnya,
        persetujuanVerif,
        tanda_tangan_blob // Base64 encoded signature
    } = req.body.data;

     console.log('[4] Data yang diterima:', {
        userid,
        nobooking,
        pemilihan,
        nomorstpd,
        tanggalstpd,
        angkapersen,
        keterangandihitungSendiri,
        isiketeranganlainnya,
        persetujuanVerif,
        tanda_tangan_blob: tanda_tangan_blob ? 'exists (hidden for security)' : null
    });
    // Basic validation
    if (!userid || !nobooking || !pemilihan || persetujuanVerif === undefined) {
        return res.status(400).json({
            success: false,
            message: 'Data yang diperlukan tidak lengkap'
        });
    }

    // Validate if approved but no signature
    if (persetujuanVerif === 'ya' && !tanda_tangan_blob) {
        return res.status(400).json({
            success: false,
            message: 'Tanda tangan diperlukan untuk dokumen yang disetujui'
        });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 2. Validate selection type
        const validPemilihanValues = ['penghitung_wajib_pajak', 'stpd_kurangbayar', 'dihitungsendiri', 'lainnyapenghitungwp'];
        if (!validPemilihanValues.includes(pemilihan)) {
            throw new Error('Jenis pemilihan tidak valid');
        }

        // 3. Validate selection-specific data
        const validationErrors = [];
        
        if (pemilihan === 'stpd_kurangbayar') {
            if (!nomorstpd) validationErrors.push('Nomor STPD diperlukan');
            if (!tanggalstpd) validationErrors.push('Tanggal STPD diperlukan');
        } 
        else if (pemilihan === 'dihitungsendiri') {
            if (isNaN(angkapersen) || angkapersen < 0 || angkapersen > 100) {
                validationErrors.push('Persentase harus antara 0-100');
            }
            if (!keterangandihitungSendiri) validationErrors.push('Keterangan penghitungan diperlukan');
        } 
        else if (pemilihan === 'lainnyapenghitungwp') {
            if (!isiketeranganlainnya) validationErrors.push('Keterangan lainnya diperlukan');
        }

        if (validationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Validasi gagal',
                errors: validationErrors
            });
        }

        // 4. Update verification data
        const updateQuery = `
            UPDATE peneliti_verifikasi
            SET 
                pemilihan = $1,
                nomorstpd = $2,
                tanggalstpd = $3,
                angkapersen = $4,
                keterangandihitungSendiri = $5,
                isiketeranganlainnya = $6,
                persetujuan = $7,
                ttd_peneliti_mime = $9,
                ttd_peneliti_blob = $10
            WHERE nobooking = $8
            RETURNING *;
        `;

        const result = await client.query(updateQuery, [
            pemilihan,
            nomorstpd || null,
            tanggalstpd || null,
            angkapersen || null,
            keterangandihitungSendiri || null,
            isiketeranganlainnya || null,
            persetujuanVerif === 'ya',
            nobooking,
            'image/jpeg', // or get from verified_users
            tanda_tangan_blob ? Buffer.from(tanda_tangan_blob.split(',')[1], 'base64') : null
        ]);

        if (result.rowCount === 0) {
            throw new Error('Data tidak ditemukan');
        }

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Data berhasil diperbarui',
            data: {
                nobooking,
                status: persetujuanVerif === 'ya' ? 'Disetujui' : 'Ditolak',
                updated_at: new Date().toISOString()
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[UPDATE ERROR]', error);
        
        res.status(500).json({
            success: false,
            message: error.message || 'Gagal memperbarui data',
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    } finally {
        client.release();
    }
});
////
app.post('/api/peneliti_send-to-paraf', async (req, res) => {
    // Menyertakan status dan trackstatus dalam destructuring
    const { nobooking, userid, namawajibpajak, namapemilikobjekpajak, status, trackstatus, keterangan, no_registrasi } = req.body;

    try {
        const updateQueryPPATK = `
        UPDATE ppatk_bookingsspd
        SET trackstatus = $1
        WHERE nobooking = $2
        RETURNING *;
        `;
        const updateValuesPAT = [trackstatus, nobooking];
        const updateResultPAT = await pool.query(updateQueryPPATK, updateValuesPAT);
                // Jika tidak ada data yang diupdate, maka return error
                if (updateResultPAT.rowCount === 0) {
                    return res.status(400).json({ success: false, message: 'Data tidak ditemukan untuk diupdate.' });
                }

                const updateQueryPV = `
        UPDATE peneliti_verifikasi
        SET trackstatus = $1
        WHERE nobooking = $2
        RETURNING *;
        `;
        const updateValuesPV = [trackstatus, nobooking];
        const updateResultPV = await pool.query(updateQueryPV, updateValuesPV);
                // Jika tidak ada data yang diupdate, maka return error
                if (updateResultPV.rowCount === 0) {
                    return res.status(400).json({ success: false, message: 'Data tidak ditemukan untuk diupdate.' });
                }
        // Step 2: Pindahkan data ke tabel 'peneliti_data'
        const insertQuery = `
            INSERT INTO peneliti_clear_to_paraf (nobooking, userid, namawajibpajak, namapemilikobjekpajak, status, trackstatus, keterangan, no_registrasi)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *;
        `;
        const insertValues = [nobooking, userid, namawajibpajak, namapemilikobjekpajak, status, trackstatus, keterangan, no_registrasi];
        const insertResult = await pool.query(insertQuery, insertValues);

        const userQuery = 'SELECT userid FROM ppatk_bookingsspd WHERE nobooking = $1';
        const userResult = await pool.query(userQuery, [nobooking]);

        if (userResult.rows.length === 0) {
            console.log(`No Booking ${nobooking} tidak ditemukan.`);
            return res.status(400).json({ success: false, message: 'Pembuat dokumen tidak ditemukan.' });
        }

        const creatorUserid = userResult.rows[0].userid;
        // Ambil email pembuat berdasarkan userid
        const emailQuery = 'SELECT email, nama FROM verified_users WHERE userid = $1';
        const emailResult = await pool.query(emailQuery, [creatorUserid]);

        if (emailResult.rows.length === 0) {
            console.log(`Email untuk userId ${creatorUserid} tidak ditemukan.`);
            return res.status(400).json({ success: false, message: 'Email pembuat tidak ditemukan.' });
        }

        const creatorEmail = emailResult.rows[0].email;
        const creatorName = emailResult.rows[0].nama;

        // Kirim email pemberitahuan ke pembuat dokumen
        await sendPenelitiVerifikasiEmail(creatorEmail, creatorName, nobooking, status, trackstatus, keterangan);
        // Step 4: Response sukses jika semua langkah berhasil
        res.json({ success: true, message: 'Data berhasil dikirim ke peneliti dan status diperbarui.' });

    } catch (error) {
        console.error('Error sending data to peneliti:', error);
        res.status(500).json({ success: false, message: 'Gagal mengirim data ke peneliti.' });
    }
});
// Fungsi untuk mengirimkan email pemberitahuan ke pembuat dokumen
async function sendPenelitiVerifikasiEmail(creatorEmail, creatorName, nobooking, status, trackstatus) {
    try {
        // Menyiapkan transporter untuk mengirimkan email
        const transporter = nodemailer.createTransport({
            service: 'gmail', // Gunakan layanan email yang Anda pilih (misalnya Gmail)
            auth: {
                user: process.env.EMAIL_USER, // Pengguna email dari environment variables (pastikan sudah diatur)
                pass: process.env.EMAIL_PASS  // Password email (pastikan sudah diatur di environment variables)
            }
        });

        // Menyiapkan isi email
        const mailOptions = {
            from: process.env.EMAIL_USER,  // Gantilah dengan email pengirim yang sudah diatur di environment variables
            to: creatorEmail,  // Email pembuat
            subject: 'Pemberitahuan Pengiriman Data ke Peneliti',
            text: `Hallo ${creatorName},\n\nData Anda dengan No. Booking ${nobooking} telah dipindahkan ke peneliti dan statusnya telah diperbarui menjadi "${status}".\n\nTrack status saat ini: ${trackstatus}.\n\nTerima kasih atas perhatian Anda.`
        };

        // Mengirimkan email
        await transporter.sendMail(mailOptions);
        console.log('Email pemberitahuan berhasil dikirim.');

    } catch (error) {
        console.error('Gagal mengirim email pemberitahuan:', error);
    }
}
////
/////////////////// //masuk kebagian paraf kasie//  /////////////////////////////////////////////////
//
app.get('/api/peneliti/get-berkas-till-verif', async (req, res) => {
    // 1. Enhanced Session Validation
    if (!req.session.user || !req.session.user.userid) {
        return res.status(401).json({
            success: false,
            code: 'UNAUTHENTICATED',
            message: 'Authentication required',
            timestamp: new Date().toISOString()
        });
    }

    if (req.session.user.divisi !== 'Peneliti') {
        return res.status(403).json({
            success: false,
            code: 'UNAUTHORIZED',
            message: 'Forbidden: Researcher access only',
            timestamp: new Date().toISOString()
        });
    }
    const requestId = crypto.randomUUID();
    const startTime = process.hrtime();

    try {
        const penelitiUserId = req.session.user.userid;
        
        // Query yang diperbaiki untuk mengambil data blob tanda tangan
        const queryText = `
            SELECT DISTINCT ON (pc.no_registrasi)
                pc.no_registrasi,
                pc.nobooking,
                pc.userid,
                pc.trackstatus,
                b.noppbb,
                b.tahunajb,
                b.namawajibpajak,
                b.namapemilikobjekpajak,
                b.akta_tanah_path, b.sertifikat_tanah_path, b.pelengkap_path,
                pc.status,
                v.tanda_tangan_blob,  -- Ambil data blob
                v.tanda_tangan_path
            FROM peneliti_clear_to_paraf pc
            LEFT JOIN ppatk_bookingsspd b ON pc.nobooking = b.nobooking
            LEFT JOIN verified_users v ON v.userid = $1
            WHERE pc.trackstatus = 'Diverifikasi'
            ORDER BY pc.no_registrasi ASC
            LIMIT 1000;
        `;

        const result = await pool.query({
            text: queryText,
            values: [penelitiUserId]
        });

        // Transformasi data dengan menambahkan URL tanda tangan jika ada
        const transformedData = result.rows.map(row => {
            // Buat URL tanda tangan jika ada blob
            let signatureUrl = null;
            if (row.tanda_tangan_blob) {
                // Konversi blob ke Base64
                const base64Signature = Buffer.from(row.tanda_tangan_blob).toString('base64');
                signatureUrl = `data:${row.tanda_tangan_path || 'image/png'};base64,${base64Signature}`;
            }

            return {
                no_registrasi: row.no_registrasi || 'N/A',
                nobooking: row.nobooking || 'N/A',
                noppbb: row.noppbb || 'N/A',
                tahunajb: row.tahunajb || 'N/A',
                userid: row.userid || penelitiUserId,
                namawajibpajak: row.namawajibpajak || 'Nama Tidak Tersedia',
                namapemilikobjekpajak: row.namapemilikobjekpajak || 'Nama Tidak Tersedia',
                status: row.status || 'UNKNOWN',
                trackstatus: row.trackstatus || 'UNKNOWN',
                tanda_tangan_url: signatureUrl,  // Gunakan URL yang baru dibuat
                akta_tanah_path: row.akta_tanah_path,
                sertifikat_tanah_path: row.sertifikat_tanah_path,
                pelengkap_path: row.pelengkap_path,
                _metadata: {
                    isValid: !!(row.no_registrasi && row.nobooking),
                    source: 'database',
                    hasSignature: !!signatureUrl
                }
            };
        });

        const duration = process.hrtime(startTime);
        const response = {
            success: true,
            data: transformedData,
            meta: {
                count: transformedData.length,
                validCount: transformedData.filter(item => item._metadata.isValid).length,
                duration: `${(duration[0] * 1000 + duration[1] / 1e6).toFixed(2)}ms`,
                requestId,
                generatedAt: new Date().toISOString()
            }
        };

        return res.json(response);
    } catch (error) {
        // 5. Structured Error Handling
        const errorResponse = {
            success: false,
            code: 'SERVER_ERROR',
            message: 'Internal server error',
            requestId,
            timestamp: new Date().toISOString(),
            _error: process.env.NODE_ENV === 'development' ? {
                name: error.name,
                message: error.message,
                stack: error.stack
            } : undefined
        };

        if (error.timeout) {
            errorResponse.code = 'TIMEOUT';
            errorResponse.message = 'Database request timeout';
            return res.status(408).json(errorResponse);
        }

        console.error(`[${requestId}] Database error:`, error);
        return res.status(500).json(errorResponse);
    }
});
//
// Add this to your existing backend routes
app.post('/api/peneliti/paraf-transfer-signature', async (req, res) => {
    if (!req.session.user) {
        return res.status(403).json({ success: false, message: 'Akses ditolak.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Get all approved records that need signature transfer
        const query = `
            SELECT pc.id, pc.userid, vu.tanda_tangan_path, vu.tanda_tangan_blob
            FROM peneliti_clear_to_paraf pc
            JOIN verified_users vu ON pc.userid = vu.userid
            WHERE pc.persetujuan = 'Iya' 
            AND (pc.ttd_paraf_blob IS NULL OR pc.ttd_paraf_mime IS NULL)
            AND vu.tanda_tangan_blob IS NOT NULL
        `;

        const { rows } = await client.query(query);

        // 2. Process each record
        for (const row of rows) {
            await client.query(
                `UPDATE peneliti_clear_to_paraf 
                 SET ttd_paraf_mime = $1, ttd_paraf_blob = $2 
                 WHERE id = $3`,
                [row.tanda_tangan_path, row.tanda_tangan_blob, row.id]
            );
        }

        await client.query('COMMIT');

        res.status(200).json({
            success: true,
            message: `Berhasil transfer ${rows.length} tanda tangan`,
            count: rows.length
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error transferring signatures:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal transfer tanda tangan',
            error: error.message
        });
    } finally {
        client.release();
    }
});
///////////////
app.post('/api/peneliti_update-ttd-paraf', async (req, res) => {
    if (!req.body.data) {
        return res.status(400).json({
            success: false,
            message: 'Data payload tidak valid'
        });
    }

    const {
        userid,
        nobooking,
        persetujuanParaf,
        tanda_tangan_blob // Base64 encoded signature
    } = req.body.data;

     console.log('[4] Data yang diterima:', {
        userid,
        nobooking,
        persetujuanParaf,
        tanda_tangan_blob: tanda_tangan_blob ? 'exists (hidden for security)' : null
    });
    // Basic validation
    if (!userid || !nobooking || persetujuanParaf === undefined) {
        return res.status(400).json({
            success: false,
            message: 'Data yang diperlukan tidak lengkap'
        });
    }

    // Validate if approved but no signature
    if (persetujuanParaf === 'ya' && !tanda_tangan_blob) {
        return res.status(400).json({
            success: false,
            message: 'Tanda tangan diperlukan untuk dokumen yang disetujui'
        });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const updateQuery = `
            UPDATE peneliti_clear_to_paraf
            SET 
                persetujuan = $1,
                ttd_paraf_mime = $3,
                ttd_paraf_blob = $4
            WHERE nobooking = $2
            RETURNING *;
        `;

        const result = await client.query(updateQuery, [
            persetujuanParaf === 'ya',
            nobooking,
            'image/jpeg', // or get from verified_users
            tanda_tangan_blob ? Buffer.from(tanda_tangan_blob.split(',')[1], 'base64') : null
        ]);

        if (result.rowCount === 0) {
            throw new Error('Data tidak ditemukan');
        }

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Data berhasil diperbarui',
            data: {
                nobooking,
                status: persetujuanParaf === 'ya' ? 'Disetujui' : 'Ditolak',
                updated_at: new Date().toISOString()
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[UPDATE ERROR]', error);
        
        res.status(500).json({
            success: false,
            message: error.message || 'Gagal memperbarui data',
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    } finally {
        client.release();
    }
});
////
// Endpoint untuk memvalidasi nobooking
app.get('/api/validate-nobooking/:nobooking', async (req, res) => {
    const { nobooking } = req.params;  // Mendapatkan nobooking dari URL parameter
    
    try {
        // Cek apakah nobooking ada di tabel peneliti_clear_to_paraf
        const query = 'SELECT * FROM peneliti_clear_to_paraf WHERE nobooking = $1';
        const result = await pool.query(query, [nobooking]);

        if (result.rows.length > 0) {
            // Mengembalikan status validasi sukses jika nobooking ditemukan
            res.status(200).json({ success: true, isValid: true });
        } else {
            // Mengembalikan status gagal jika nobooking tidak ditemukan
            res.status(200).json({ success: true, isValid: false });
        }
    } catch (error) {
        console.error('Error validating nobooking:', error);
        res.status(500).json({ success: false, message: 'Terjadi kesalahan saat memvalidasi nobooking.' });
    }
});
////

//////////////////////////////////////////////      ENDPOST       ////////////////////////////////////////////////////////////////////////
// Endpoint untuk menghasilkan PDF (membuat tampilannya menjadi lebih baik, serta menampilkan nama dari pembuat sspd) 
/////BAGIAN INI YANG NANTINYA DISELESAIKAN  
app.get('/api/peneliti_lanjutan-generate-pdf-badan/:nobooking', async (req, res) => {
    const { nobooking } = req.params; // Ambil nobooking dari URL parameter\
    const { signature } = req.body;
    console.log('Menerima permintaan untuk nobooking:', nobooking);

    try {
        const trackingresult = await pool.query(`
            SELECT userid, nama FROM ppatk_bookingsspd WHERE nobooking = $1
        `, [nobooking]);

        if (trackingresult.rows.length === 0) {
            return res.status(404).json({ message: 'Data untuk nobooking ini tidak ditemukan' });
        }

        const creator = trackingresult.rows[0];
        // Pastikan bahwa kita menggunakan userid pembuat untuk menggenerate PDF, bukan userid login
        const { userid, nama } = creator; // Ambil userid dan nama pembuat (bukan user login)

        // Verifikasi jika data yang dihasilkan adalah milik pembuat
        if (!userid || !nama) {
            return res.status(400).json({ success: false, message: 'User ID dan nama pembuat is required' });
        }

        const special_parafv = req.session.user.special_parafv;
        // Ambil data dari database untuk nobooking tertentu berdasarkan userid
        const result = await pool.query(`
            SELECT DISTINCT
            pb.*, bp.*, o.*,
            vb.nama,
            pp.*,
            ps.path_ttd_ppatk, ps.path_ttd_wp,
            substring(ps.path_ttd_wp from '\.([^\.]*)$') as wp_ext,
            substring(ps.path_ttd_ppatk from '\.([^\.]*)$') as ppatk_ext,
            pv.pemilihan, pv.tanggal_terima, pv.nomorstpd, pv.tanggalstpd, pv.angkapersen, pv.keterangandihitungsendiri,
            pv.isiketeranganlainnya, pv.ttd_peneliti_blob, pv.ttd_peneliti_mime, pc.ttd_paraf_blob, pc.ttd_paraf_mime,
            vb.tanda_tangan_blob,
            pvs.path_ttd_verif_pen,
            tpk.sign_paraf, tpk.signfile_path,
            vb.special_parafv
        FROM 
            ppatk_bookingsspd pb
        LEFT JOIN 
            ppatk_bphtb_perhitungan bp ON pb.nobooking = bp.nobooking
        LEFT JOIN 
            ppatk_objek_pajak o ON pb.nobooking = o.nobooking
        LEFT JOIN
            verified_users vb ON vb.nama = pb.nama AND pb.userid = vb.userid
        LEFT JOIN
            ppatk_penghitungan_njop pp ON pb.nobooking = pp.nobooking 
        LEFT JOIN
            ppatk_sign ps ON pb.nobooking = ps.nobooking
        LEFT JOIN
            peneliti_verifikasi pv ON pb.nobooking = pv.nobooking
        LEFT JOIN
            peneliti_verif_sign pvs ON pb.nobooking = pvs.nobooking
        LEFT JOIN
            peneliti_clear_to_paraf pc ON pb.nobooking = pc.nobooking
        LEFT JOIN
            ttd_paraf_kasie tpk ON pb.nobooking = tpk.nobooking
            WHERE 
                pb.userid = $1 AND vb.nama = $2 AND pb.nobooking = $3`, [userid, nama, nobooking]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Data not found' });
        }
        const data = result.rows[0];
        data.special_parafv = special_parafv;
        
        //
        
        // Membuat PDF menggunakan pdfkit
        const doc = new PDFKitDocument({ margin: 30, size: 'A4' });

        // Menggunakan font Helvetica untuk seluruh teks
        doc.font('Helvetica');
        // Menyiapkan header untuk response agar browser tahu ini adalah PDF
        res.setHeader('Content-Type', 'application/pdf');
        const disposition = req.query.download ? 'attachment' : 'inline';
        res.setHeader('Content-Disposition', `${disposition}; filename="${nobooking}_Terstempel.pdf"`);

        // Mengirimkan PDF ke browser 
        doc.pipe(res);  // Pipe langsung ke response (res) untuk mengirim PDF
        
        if (signature) {
            try {
                const signatureBytes = Uint8Array.from(
                    atob(signature.split(',')[1]),
                    c => c.charCodeAt(0)
                );
                const signatureImage = await pdfDoc.embedJpg(signatureBytes);
                page.drawImage(signatureImage, {
                    x: 400,
                    y: 100,
                    width: 150,
                    height: 50
                });
            } catch (sigError) {
                console.error('Error embedding signature:', sigError);
            }
        }


        // Menambahkan logo di kiri header
        const logoPath = 'public/asset/Logobappenda_pdf.png'; // Ganti dengan path logo Anda
        const pageWidth = 595; // Lebar halaman PDF (A4 dalam titik)
        const logoWidth = pageWidth * 0.11; // Menentukan lebar logo menjadi 20% dari lebar halaman PDF
        doc.image(logoPath, 35, 30, { width: logoWidth }); // Menggunakan ukuran dinamis berdasarkan halaman

        // Menambahkan teks "BAPPENDA" di kanan header
        doc.font('Helvetica-Bold').fontSize(16).text('SURAT SETORAN PAJAK DAERAH', 200, 40, { width: 450 });
        doc.font('Helvetica-Bold').fontSize(16).text('BEA PEROLEHAN HAK ATAS TANAH DAN BANGUNAN', 130, 60, { width: 450 });
        doc.font('Helvetica-Bold').fontSize(16).text('(SSPD - BPHTB)', 260, 80, { width: 450 });
        // Menambahkan garis pemisah di bawah header
        doc.moveTo(0, 105)
           .lineTo(700, 105)
           .stroke();

        // Pembuat
        //

        // Menambahkan label dan data dengan lebar kolom tetap untuk memastikan teks sejajar
        const leftX = 40;   // Posisi X untuk label (kiri)
        const rightX = 150; // Posisi X untuk data (kanan)

        // vertical kiri
        doc.moveTo(30, 115)
           .lineTo(30, 330)
           .stroke();
        doc.moveTo(560, 115)
           .lineTo(560, 330)
           .stroke();   
        // horizontal
        doc.moveTo(0, 115)
           .lineTo(700, 115)
           .stroke();
        // font pertama untuk data wp
        doc.font('Helvetica').fontSize(10)
        .text('No. Registrasi', leftX, 120)
        .text('Tahun AJB', leftX, 135)
        .text('Nama Wajib Pajak', leftX, 150)
        .text('Alamat Wajib Pajak', leftX, 165)
        .text('Kabupaten/Kota', leftX, 190)
        .text('Kecamatan', leftX, 205)
        .text('Kode Camat', leftX, 220)
        .text('No. NPWP', leftX, 235)
        .text('Kelurahan/Desa', 320, 190)
        .text('RT/RW', 320, 205)
        .text('Kodepos', 320, 220);
        doc.fontSize(10)
        .text(':', rightX - 10, 120)
           .text(data.nobooking, rightX, 120)
           .text(':', rightX - 10, 135)
           .text(data.tahunajb, rightX, 135)
           .text(':', rightX - 10, 150)
           .text(data.namawajibpajak, rightX, 150)
           .text(':', rightX - 10, 165)
           .text(data.alamatwajibpajak, rightX, 165)
           .text(':', rightX - 10, 190)
           .text(data.kabupatenkotawp, rightX, 190)
           .text(':', rightX - 10, 205)
           .text(data.kecamatanwp, rightX, 205)
           .text(':', rightX - 10, 235)
           .text(data.npwpwp, rightX, 235)
           .text(':', 420 - 10, 190)
           .text(data.kelurahandesawp, 420, 190)
           .text(':', 420 - 10, 205)
           .text(data.rtrwwp, 420, 205)
           .text(':', 420 - 10, 220)
           .text(data.kodeposwp, 420, 220);
           // End font-1
        // Menambahkan label dan data untuk informasi lainnya
        doc.fontSize(10)
        .text(`Jenis Wajib Pajak      : Badan Usaha`, 320, 120)
        .text(`Tanggal AJB              : ${data.tanggal}`, 320, 135);
            // font-2
        // Menambahkan garis pemisah setelah data Wajib Pajak
        doc.moveTo(30, 245).lineTo(560, 245).stroke();
        doc.fontSize(10)
        .text('Nama Pemilik Objek Pajak', leftX, 250)
        .text('Alamat Pemilik Objek Pajak', leftX, 265)
        .text('Kabupaten/Kota', leftX, 290)
        .text('Kecamatan', leftX, 305)
        .text('No. NPWP', leftX, 320)
        .text('Kelurahan/Desa', 320, 290)
        .text('RT/RW', 320, 305)
        .text('Kodepos', 320, 320);
        doc.fontSize(10)
           .text(':', 190 - 10, 250)
           .text(data.namapemilikobjekpajak, 190, 250)
           .text(':', 190 - 10, 265)
           .text(data.alamatpemilikobjekpajak, 190, 265)
           .text(':', rightX - 10, 290)
           .text(data.kabupatenkotaop, rightX, 290)
           .text(':', rightX - 10, 305)
           .text(data.kecamatanop, rightX, 305)
           .text(':', rightX - 10, 320)
           .text(data.npwpop, rightX, 320)
           .text(':', 420 - 10, 290)
           .text(data.kelurahandesaop, 420, 290)
           .text(':', 420 - 10, 305)
           .text(data.rtrwop, 420, 305)
           .text(':', 420 - 10, 320)
           .text(data.kodeposop, 420, 320);
        
        doc.moveTo(0, 330)
        .lineTo(700, 330)
        .stroke();
        /////
        doc.font('Helvetica').fontSize(9)
        .text('Nomor Objek Pajak(NOP)', leftX, 335)
        .text('Letak Tanah dan/atau Bangunan', leftX, 345)
        .text('Keterangan', leftX, 355)
        .text('RT/RW', leftX, 365)
        .text('Status Kepemilikan', leftX, 375)
        .text('Nomor Sertifikat', leftX, 385)
        .text('Nomor Bukti Pembayaran', 280, 365)
        .text('Tanggal Perolehan', 280, 375)
        .text('Tanggal Pembayaran', 280, 385);
        doc.font('Helvetica').fontSize(9)
            .text(':', 190 - 10, 335)
           .text(data.noppbb, 190, 335)
           .text(':', 190 - 10, 345)
           .text(data.letaktanahdanbangunan, 190, 345)
           .text(':', rightX - 10, 355)
           .text(data.keterangan, rightX, 355)
           .text(':', rightX - 10, 365)
           .text(data.rt_rwobjekpajak, rightX, 365)
           .text(':', rightX - 10, 375)
           .text(data.status_kepemilikan, rightX, 375)
           .text(':', rightX - 10, 385)
           .text(data.nomor_sertifikat, rightX, 385)
           .text(':', 400 - 10, 365)
           .text(data.nomor_bukti_pembayaran, 400, 365)
           .text(':', 400 - 10, 375)
           .text(data.tanggal_perolehan, 400, 375)
           .text(':', 400 - 10, 385)
           .text(data.tanggal_pembayaran, 400, 385);
/////////////////////////////////////////////////////////
                // Data tabel yang akan ditampilkan (dengan perhitungan otomatis untuk Luas * NJOP PBB/m2)
        const tableData = [['BPHTB', 'Luas/m²', 'NJOP PBB', 'Luas × NJOP PBB/m²'],
        ['Tanah (Bumi)', formatNumber(data.luas_tanah), formatCurrency(data.njop_tanah), formatCurrency(data.luasxnjop_tanah)],
        ['Bangunan', formatNumber(data.luas_bangunan), formatCurrency(data.njop_bangunan), formatCurrency(data.luasxnjop_bangunan)] ];

        // Buat tabel
        const totalTanah = parseFloat(data.luasxnjop_tanah) || 0;
        const totalBangunan = parseFloat(data.luasxnjop_bangunan) || 0;
        const grandTotal = totalBangunan + totalTanah;
        createTable(doc, tableData, { 
            totals: {
              tanah: totalTanah,
              bangunan: totalBangunan,
              grandTotal: grandTotal
            }
          });
function createTable(doc, data, options = {}) {
    // Konfigurasi tabel
    const config = {
        startX: 40,
        startY: 400,
        cellPadding: 4,
        rowHeight: 20,
        colWidths: [100, 80, 120, 180],
        ...options
    };

    let currentY = config.startY;
    const tableWidth = config.colWidths.reduce((a, b) => a + b, 0);

// 1. GARIS ATAS HEADER (full width)
    doc.moveTo(config.startX, currentY)
       .lineTo(config.startX + tableWidth, currentY)
       .stroke();

    // 2. HEADER (kolom 1-4)
    doc.font('Helvetica-Bold');
    data[0].forEach((cell, i) => {
        doc.text(cell, 
            config.startX + config.colWidths.slice(0, i).reduce((a, b) => a + b, 0),
            currentY + config.cellPadding,
            { width: config.colWidths[i], align: 'center' }
        );
    });
    
    // 3. GARIS BAWAH HEADER (full width)
    currentY += config.rowHeight;
    doc.moveTo(config.startX, currentY)
       .lineTo(config.startX + tableWidth, currentY)
       .stroke();

    // 4. ISI DATA (kolom 1-4)
    doc.font('Helvetica');
    for (let i = 1; i < data.length; i++) {
        data[i].forEach((cell, j) => {
            doc.text(
                cell,
                config.startX + config.colWidths.slice(0, j).reduce((a, b) => a + b, 0) + 5,
                currentY + config.cellPadding,
                { width: config.colWidths[j] - 10, align: j === 0 ? 'left' : 'right' }
            );
        });
        currentY += config.rowHeight;
    }

    // 5. GARIS VERTIKAL UNTUK BARIS 1 & 2 (kolom 1-4)
    let currentX = config.startX;
    const dataEndY = currentY; // Garis vertikal berakhir di sini untuk kolom 1-2
    
    // Kolom 1
    doc.moveTo(currentX, config.startY)
       .lineTo(currentX, dataEndY)
       .stroke();
    
    // Kolom 2
    currentX += config.colWidths[0];
    doc.moveTo(currentX, config.startY)
       .lineTo(currentX, dataEndY)
       .stroke();
    
    // Kolom 3 & 4 akan dilanjutkan sampai baris 3

    // 6. BAGIAN TOTAL (hanya kolom 3 & 4)
    if (options.totals) {
        const col3StartX = config.startX + config.colWidths[0] + config.colWidths[1];
        const col4EndX = config.startX + tableWidth;

        // Garis horizontal di atas total (hanya kolom 3-4)
        doc.moveTo(col3StartX, currentY)
           .lineTo(col4EndX, currentY)
           .stroke();
        
        // Text TOTAL NILAI (hanya di kolom 3-4)
        doc.font('Helvetica-Bold')
           .text('TOTAL NILAI', 
               col3StartX + 5,
               currentY + config.cellPadding,
               { width: config.colWidths[2], align: 'center' })
           .text(formatCurrency(options.totals.grandTotal), 
               col3StartX + config.colWidths[2] + 5,
               currentY + config.cellPadding,
               { width: config.colWidths[3] - 10, align: 'right' });
        
        currentY += config.rowHeight;

        // GARIS VERTIKAL KOLOM 3 & 4 (lanjut sampai baris 3)
        doc.moveTo(520, 400)
           .lineTo(520, 480)
           .stroke();
        doc.moveTo(40, 460)
           .lineTo(520, 460)
           .stroke();
        currentX = col3StartX;
        doc.moveTo(currentX, config.startY)
           .lineTo(currentX, currentY)
           .stroke();
        
        currentX += config.colWidths[2];
        doc.moveTo(currentX, config.startY)
           .lineTo(currentX, currentY)
           .stroke();

        // GARIS BAWAH (hanya kolom 3-4)
        doc.moveTo(col3StartX, currentY)
           .lineTo(config.startX + tableWidth, currentY)
           .stroke();
    }

    doc.y = currentY + 20;
    return { endY: currentY };
}
doc.font('Helvetica').fontSize(10).text(
  `Harga Transaksi/Nilai Pasar:   ${formatCurrency(data.harga_transaksi)}`, 
  230, 
  485 
);
const hargaTransaksi = parseFloat(data.harga_transaksi) || 0;

// Fungsi untuk membandingkan dan mendapatkan nilai terbesar
function getNilaiTerbesar(grandTotal, hargaTransaksi) {
    // Bersihkan format currency jika ada (misal: "Rp1,000,000" -> 1000000)
    const cleanGrandTotal = typeof grandTotal === 'string' 
        ? parseFloat(grandTotal.replace(/[^\d]/g, '')) 
        : grandTotal;
    
    const cleanHargaTransaksi = typeof hargaTransaksi === 'string' 
        ? parseFloat(hargaTransaksi.replace(/[^\d]/g, '')) 
        : hargaTransaksi;
    
    return Math.max(cleanGrandTotal, cleanHargaTransaksi);
}
const nilaiTerbesar = getNilaiTerbesar(grandTotal, hargaTransaksi);
const npoptkp = parseFloat(data.nilaiperolehanobjekpajaktidakkenapajak) || 0;
const nilaidata_NPOPKP = Math.max(0, nilaiTerbesar - npoptkp);
const pajakTerutang = nilaidata_NPOPKP * 0.05;
doc.moveTo(260 + 100, 495)
       .lineTo(520,495)
       .stroke();

    doc.moveTo(0, 505)
       .lineTo(700,505)
       .stroke();
///////////////////////////////////////////////////////////////////////////////////
    doc.font('Helvetica-Bold').fontSize(11).text('Penghitungan BPHTB', leftX, 510);
    doc.font('Helvetica').fontSize(8).text('(Harga diisi berdasarkan penghitungan Wajib Pajak)', leftX + 115, 511.5);
        doc.moveTo(0, 520)
       .lineTo(700, 520)
       .moveTo(430, 520)
       .lineTo(430, 575)
        .moveTo(440, 520)
       .lineTo(440, 575)
       .stroke();
    doc.fontSize(9)
    .text('1. Nilai Perolehan Objek Pajak (NPOP) ', leftX, 525)
    .text('2. Nilai Perolehan Objek Pajak Tidak Kena Pajak (NPOPTKP)', leftX, 535)
    .text('3. Nilai Perolehan Objek Pajak Kena Pajak (NPOPKP)', leftX, 545)
    .text('4. Bea Perolehan Hak atas Tanah dan Bangunan yang terutang', leftX, 555)
    .text('5. Bea Perolehan Hak atas Tanah dan Bangunan yang harus dibayar', leftX, 565);
    doc.fontSize(9)
    .text(`${formatCurrency(nilaiTerbesar)}`, 450, 525)
    .text(`${formatCurrency(data.nilaiperolehanobjekpajaktidakkenapajak)}`, 450, 535)
    .text(`${formatCurrency(nilaidata_NPOPKP)}`, 450, 545)
    .text(`${formatCurrency(pajakTerutang)}`, 450, 555)
    .text(`${formatCurrency(data.bphtb_yangtelah_dibayar)}`, 450, 565);
    doc.fontSize(8)
    .text('1', 432, 525)
    .text('2', 432, 535)
    .text('3', 432, 545)
    .text('4', 432, 555)
    .text('5', 432, 565)

        doc.moveTo(340, 520)
    .lineTo(340,575)
    .moveTo(340, 533)
    .lineTo(700,533)
    .moveTo(340, 543)
    .lineTo(700,543)
    .moveTo(340, 553)
    .lineTo(700,553)
    .moveTo(340, 563)
    .lineTo(700,563)
    .stroke();

    doc.fontSize(9)
    .text('angka 1 - angka 2', 350, 545)
    .text('5% x angka 3', 350, 555);
    doc.moveTo(0, 575)
       .lineTo(700,575)
       .stroke();

/////
const { ttd_peneliti_blob, ttd_peneliti_mime } = data;

// 1. Pastikan BLOB dan MIME tersedia
if (ttd_peneliti_blob && ttd_peneliti_mime) {
    try {
        // Asumsikan ttd_peneliti_blob sudah berupa Buffer (default PostgreSQL)
        doc.image(ttd_peneliti_blob, 380, 620, { 
            width: 120,
            height: 60,
            align: 'center'
        });
    } catch (err) {
        console.error('Gagal memuat gambar:', err);
        doc.text('[Tanda Tangan Tidak Tersedia]', 380, 620);
    }
} else {
    doc.text('[Tanda Tangan Kosong]', 380, 620);
}
const { ttd_paraf_blob, ttd_paraf_mime } = data;

// 1. Pastikan BLOB dan MIME tersedia
if (ttd_paraf_blob && ttd_paraf_mime) {
    try {
        // Asumsikan ttd_peneliti_blob sudah berupa Buffer (default PostgreSQL)
        doc.image(ttd_paraf_blob, 360, 700, { 
            width: 120,
            height: 60,
            align: 'center'
        });
    } catch (err) {
        console.error('Gagal memuat gambar:', err);
        doc.text('[Tanda Tangan Tidak Tersedia]', 360, 700);
    }
} else {
    doc.text('[Tanda Tangan Kosong]', 360, 700);
}

/////////

// 6. Section Pemilihan dengan CHECKBOX
        const selectionStartY = 580; // Posisi setelah tabel
        
        doc.font('Helvetica-Bold')
           .fontSize(10)
           .text('D. Jumlah Setoran Berdasarkan :', 40, selectionStartY)
           .moveTo(40, selectionStartY + 10)
           .lineTo(550, selectionStartY + 10)
           .stroke();

        // Fungsi checkbox
        const checkboxStartY = 580; // Posisi awal
        const checkboxX = 50; // Posisi horizontal
        let currentY = checkboxStartY;

        const drawCheckbox = (x, y, checked) => {
            doc.rect(x, y, 12, 12).stroke();  // Gambar kotak centang
            if (checked) {
                // Menggunakan font Zapfdingbats yang sudah tersedia di PDFKit
                doc.font('ZapfDingbats').text('4', x + 2, y + 10);  // '4' adalah posisi untuk simbol checkmark dalam Zapfdingbats
            }
        };

const pemilihan = data.pemilihan;
    
        // Daftar opsi
        const options = [
            {
                label: 'a. Penghitungan Wajib Pajak',
                value: 'penghitung_wajib_pajak',
                checked: pemilihan === 'penghitung_wajib_pajak'
            },
            {
                label: 'b. STPD BPHTB/SKPDB KURANG BAYAR*)',
                value: 'stpd_kurangbayar',
                checked: pemilihan === 'stpd_kurangbayar',
                details: pemilihan === 'stpd_kurangbayar' ? {
                    nomor: data.nomorstpd,
                    tanggal: data.tanggalstpd
                } : null
            },
            {
                label: 'c. Pengurangan dihitung sendiri menjadi:',
                value: 'dihitungsendiri',
                checked: pemilihan === 'dihitungsendiri',
                details: pemilihan === 'dihitungsendiri' ? {
                    persen: data.angkapersen,
                    keterangan: data.keterangandihitungsendiri
                } : null
            },
            {
                label: 'd. ' + (data.isiketeranganlainnya || '.........'),
                value: 'lainnyapenghitungwp',
                checked: pemilihan === 'lainnyapenghitungwp'
            }
        ];

        currentY += 20; // Jarak ke checkbox pertama

        // Render semua checkbox
        options.forEach((opt, index) => {
            // Gambar checkbox (+15 untuk setiap item berikutnya)
            drawCheckbox(checkboxX, currentY + (index * 15), opt.checked);
            
            // Teks label
            doc.font('Helvetica')
               .fontSize(10)
               .text(opt.label, checkboxX + 20, currentY + (index * 15) - 2);
            
            // Detail tambahan jika dipilih
            if (opt.checked && opt.details) {
                if (opt.value === 'stpd_kurangbayar') {
                    doc.text(`Nomor: ${opt.details.nomor || '______'}`, checkboxX + 250, currentY + (index * 10))
                       .text(`Tanggal: ${opt.details.tanggal || '______'}`, checkboxX + 360, currentY + (index * 10));
                } 
                else if (opt.value === 'dihitungsendiri') {
                    doc.text(`${opt.details.persen || '___'}% Berdasarkan ${opt.details.keterangan || 'Berdasarkan ......'}`,
                        checkboxX + 250, currentY + (index * 15));
                }
            }
        }); doc.text('Nomor: ______', checkboxX + 250, 610)
            .text('Tanggal: ______', checkboxX + 360, 610)
            .text('% berdasarkan ......', checkboxX + 250, 630);
///////////////////////////////////////////////////////////////////////////////////////////////////
        // ===== BAGIAN TERBILANG BEA PEROLEHAN HAK ATAS TANAH =====
        const startY = 660; // Posisi setelah tabel BPHTB
        
        // Judul Section
        doc.font('Helvetica')
           .fontSize(10)
           .text('Jumlah Yang Disetorkan:', 40, startY);

        // Fungsi terbilang versi lengkap (support triliun)
        function terbilang(angka) {
            if (angka === 0 || !angka) return 'Nol';
            
            const satuan = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 
                          'Tujuh', 'Delapan', 'Sembilan'];
            const belasan = ['Sepuluh', 'Sebelas', 'Dua Belas', 'Tiga Belas', 
                           'Empat Belas', 'Lima Belas', 'Enam Belas', 
                           'Tujuh Belas', 'Delapan Belas', 'Sembilan Belas'];
            
            function convertLessThanMillion(num) {
                if (num < 10) return satuan[num];
                if (num < 20) return belasan[num - 10];
                if (num < 100) {
                    const puluhan = Math.floor(num / 10);
                    const sisa = num % 10;
                    return satuan[puluhan] + (puluhan === 1 ? ' Puluh ' : ' Puluh ') + 
                           (sisa > 0 ? satuan[sisa] : '');
                }
                if (num < 200) return 'Seratus ' + convertLessThanMillion(num - 100);
                if (num < 1000) {
                    const ratusan = Math.floor(num / 100);
                    const sisa = num % 100;
                    return satuan[ratusan] + ' Ratus ' + convertLessThanMillion(sisa);
                }
                if (num < 2000) return 'Seribu ' + convertLessThanMillion(num - 1000);
                if (num < 1000000) {
                    const ribuan = Math.floor(num / 1000);
                    const sisa = num % 1000;
                    return convertLessThanMillion(ribuan) + ' Ribu ' + convertLessThanMillion(sisa);
                }
                return '';
            }
            
            let result = '';
            const triliun = Math.floor(angka / 1000000000000);
            const sisaTriliun = angka % 1000000000000;
            
            if (triliun > 0) {
                result += convertLessThanMillion(triliun) + ' Triliun ';
            }
            
            const milyar = Math.floor(sisaTriliun / 1000000000);
            const sisaMilyar = sisaTriliun % 1000000000;
            
            if (milyar > 0) {
                result += convertLessThanMillion(milyar) + ' Milyar ';
            }
            
            const juta = Math.floor(sisaMilyar / 1000000);
            const sisaJuta = sisaMilyar % 1000000;
            
            if (juta > 0) {
                result += convertLessThanMillion(juta) + ' Juta ';
            }
            
            result += convertLessThanMillion(sisaJuta);
            
            // Bersihkan spasi ganda dan trim
            return result.replace(/\s+/g, ' ').trim();
        }

        // Format khusus untuk mata uang
        function terbilangRupiah(angka) {
            if (angka === 0 || !angka) return 'Nol Rupiah';
            const terbilangAngka = terbilang(angka);
            return terbilangAngka + ' Rupiah';
        }

        // Ambil nilai dari database
        const nilaiBea = parseFloat(pajakTerutang) || 0;
        
        // Tampilkan dalam PDF
        doc.font('Helvetica')
           .fontSize(10)
           .text(`${formatCurrency(nilaiBea)}`, 45, startY + 15, { width: 250 })
           .text(`Dengan huruf:`, 250, startY, { width: 500 })
           .text(`${terbilangRupiah(nilaiBea)}`, 255, startY + 15);

        // tampilan nilai border (berdasar angka)
        doc.moveTo(40, 670)
       .lineTo(230,670)
       .moveTo(40, 685)
       .lineTo(230,685)
       .moveTo(40, 670)
       .lineTo(40,685)
       .moveTo(230, 670)
       .lineTo(230,685)
       .stroke();
        // tampilan nilai border (berdasar huruf)
        doc.moveTo(40 + 210, 670)
       .lineTo(300 + 210,670)
       .moveTo(40  + 210, 685)
       .lineTo(300  + 210,685)
       .moveTo(40  + 210, 670)
       .lineTo(40  + 210,685)
       .moveTo(300  + 210, 670)
       .lineTo(300  + 210,685)
       .stroke();
        doc.moveTo(0, 690)
       .lineTo(700,690)
       .stroke();




///////////////////////////////////////////////////////////////////////////////////////////////
    const signatureYPosition = 700; // Posisi vertikal mulai
    const leftMargin = 40; // Margin kiri
    const signatureWidth = 80; // Lebar tanda tangan
    const gapBetween = 20; // Jarak antara kolom tanda tangan
    const columnWidth = signatureWidth + 30;
    const fontSize = 7;
    const lineHeight = 10;
    const width = 80;
    const height = 80;

// Fungsi helper untuk teks center
function drawCenteredText(doc, text, x, y, columnWidth) {
    doc.fontSize(fontSize);
    const textWidth = doc.widthOfString(text);
    const startX = x + (columnWidth - textWidth) / 2;
    doc.text(text, startX, y);
}

 const col1X = leftMargin;
drawCenteredText(doc, `${data.kabupatenkotawp}, tgl ${data.tanggal}`, col1X, signatureYPosition, columnWidth);
drawCenteredText(doc, 'WAJIB PAJAK/PENYETOR', col1X, signatureYPosition + lineHeight, columnWidth);

// Tanda tangan atau garis
const signatureHeight = 60; // Tinggi tanda tangan diperkecil
if (data.path_ttd_wp) {
    doc.image(data.path_ttd_wp, 
        col1X + (columnWidth - signatureWidth)/2, 
        signatureYPosition + lineHeight * 2, 
        { width: signatureWidth, height: signatureHeight }
    );
} else {
    doc.moveTo(col1X + (columnWidth - signatureWidth)/2, signatureYPosition + lineHeight * 2 + 15)
       .lineTo(col1X + (columnWidth - signatureWidth)/2 + signatureWidth, signatureYPosition + lineHeight * 2 + 15)
       .stroke();
}

drawCenteredText(doc, `${data.namawajibpajak || '........................'}`, 
                col1X, signatureYPosition + 70, columnWidth);

// 2. Kolom PPAT/Notaris
const col2X = col1X + columnWidth + gapBetween;
drawCenteredText(doc, 'MENGETAHUI', col2X, signatureYPosition, columnWidth);
drawCenteredText(doc, 'PPAT/NOTARIS', col2X, signatureYPosition + 10, columnWidth);

if (data.path_ttd_ppatk) {
    doc.image(data.path_ttd_ppatk, col2X + (columnWidth - signatureWidth)/2, signatureYPosition + 15, {
        width: signatureWidth
    });
} else {
    doc.moveTo(col2X + (columnWidth - signatureWidth)/2, signatureYPosition + 50)
       .lineTo(col2X + (columnWidth - signatureWidth)/2 + signatureWidth, signatureYPosition + 50)
       .stroke();
}

drawCenteredText(doc, `${data.nama || '........................'}`, 
                col2X, signatureYPosition + 70, columnWidth);

// 3. Kolom Tempat Pembayaran
const col3X = col2X + columnWidth + gapBetween;
drawCenteredText(doc, 'DITERIMA OLEH:', col3X, signatureYPosition, columnWidth);
drawCenteredText(doc, 'TEMPAT PEMBAYARAN BPHTB', col3X, signatureYPosition + 10, columnWidth);
drawCenteredText(doc, `${data.tanggal_terima || 'tanggal : .........'}`, col3X, signatureYPosition + 20, columnWidth);


drawCenteredText(doc, `${data.nama_pemverifikasi || '(................................)'}`, 
                col3X, signatureYPosition + 70, columnWidth);

// 4. Kolom BAPPEDA
const col4X = col3X + columnWidth + gapBetween + 20;
drawCenteredText(doc, 'Telah Diverifikasi', col4X, signatureYPosition, columnWidth);
drawCenteredText(doc, 'BADAN PENDAPATAN DAERAH', col4X, signatureYPosition + 10, columnWidth);

drawCenteredText(doc, `${data.special_parafv || '(................................)'}`, 
                col4X, signatureYPosition + 70, columnWidth);
if (data.signfile_path) {
    doc.image(data.signfile_path, 
        col4X + (columnWidth - signatureWidth)/2, 
        signatureYPosition + lineHeight * 2, 
        { width: signatureWidth, height: signatureHeight }
    );
} else {
    doc.moveTo(col4X + (columnWidth - signatureWidth)/2, signatureYPosition + lineHeight * 2 + 15)
       .lineTo(col4X + (columnWidth - signatureWidth)/2 + signatureWidth, signatureYPosition + lineHeight * 2 + 15)
       .stroke();
}

   // Menyelesaikan dokumen PDF
        doc.end();
///
// Ubah fungsi helper menjadi lebih robust
    function formatCurrency(amount) {
        if (amount == null) return 'Rp0.00'; // Handle null/undefined
        const num = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
        return 'Rp' + num.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
    }
    function formatNumber(num) {
        if (num == null) return '0.00'; // Handle null/undefined
        const number = typeof num === 'string' ? parseFloat(num) : Number(num);
        return number.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
    } catch (error) {
        console.warn('Logo not found, proceeding without logo');
        console.error('Error generating PDF:', error);
        res.status(500).json({ message: 'Error generating PDF' });
    }
});
////////////////////////////////////////////////////////////////////
app.post('/api/peneliti_send-to-ParafValidate', async (req, res) => {
    const { nobooking, userid, namawajibpajak, namapemilikobjekpajak, status, trackstatus, keterangan } = req.body;

    try {
        // Fungsi untuk menghasilkan nomor validasi unik
        const generateUniqueValidationNumber = async () => {
            const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let isValid = false;
            let validationNumber;
            
            while (!isValid) {
                // Generate bagian pertama (5 angka + 3 huruf)
                let part1 = '';
                for (let i = 0; i < 5; i++) {
                    part1 += characters.charAt(Math.floor(Math.random() * 36));
                }
                for (let i = 0; i < 3; i++) {
                    part1 += characters.charAt(Math.floor(Math.random() * 26));
                }
                
                // Generate bagian kedua (3 karakter acak)
                let part2 = '';
                for (let i = 0; i < 3; i++) {
                    part2 += characters.charAt(Math.floor(Math.random() * 36));
                }
                
                validationNumber = `${part1}-${part2}`;
                
                // Periksa keunikan nomor validasi di database
                const checkQuery = 'SELECT no_validasi FROM paraf_validate WHERE no_validasi = $1';
                const checkResult = await pool.query(checkQuery, [validationNumber]);
                
                if (checkResult.rows.length === 0) {
                    isValid = true;
                }
            }
            
            return validationNumber;
        };

        // Generate nomor validasi unik
        const no_validasi = await generateUniqueValidationNumber();

        // Update tabel ppatk_bookingsspd
        const updateQueryPPATK = `
            UPDATE ppatk_bookingsspd
            SET trackstatus = $1
            WHERE nobooking = $2
            RETURNING *;
        `;
        const updateValuesPAT = [trackstatus, nobooking];
        const updateResultPAT = await pool.query(updateQueryPPATK, updateValuesPAT);
        
        if (updateResultPAT.rowCount === 0) {
            return res.status(400).json({ success: false, message: 'Data tidak ditemukan untuk diupdate.' });
        }

        // Update tabel peneliti_clear_to_paraf
        const updateQueryPV = `
            UPDATE peneliti_clear_to_paraf
            SET trackstatus = $1
            WHERE nobooking = $2
            RETURNING *;
        `;
        const updateValuesPV = [trackstatus, nobooking];
        const updateResultPV = await pool.query(updateQueryPV, updateValuesPV);
        
        if (updateResultPV.rowCount === 0) {
            return res.status(400).json({ success: false, message: 'Data tidak ditemukan untuk diupdate.' });
        }

        // Insert data ke tabel paraf_validate dengan nomor validasi
        const insertQuery = `
            INSERT INTO paraf_validate (nobooking, userid, namawajibpajak, namapemilikobjekpajak, status, trackstatus, keterangan, no_validasi)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *;
        `;
        const insertValues = [nobooking, userid, namawajibpajak, namapemilikobjekpajak, status, trackstatus, keterangan, no_validasi];
        const insertResult = await pool.query(insertQuery, insertValues);

        const userQuery = 'SELECT userid FROM ppatk_bookingsspd WHERE nobooking = $1';
        const userResult = await pool.query(userQuery, [nobooking]);

        if (userResult.rows.length === 0) {
            console.log(`No Booking ${nobooking} tidak ditemukan.`);
            return res.status(400).json({ success: false, message: 'Pembuat dokumen tidak ditemukan.' });
        }

        const creatorUserid = userResult.rows[0].userid;
        const emailQuery = 'SELECT email, nama FROM verified_users WHERE userid = $1';
        const emailResult = await pool.query(emailQuery, [creatorUserid]);

        if (emailResult.rows.length === 0) {
            console.log(`Email untuk userId ${creatorUserid} tidak ditemukan.`);
            return res.status(400).json({ success: false, message: 'Email pembuat tidak ditemukan.' });
        }

        const creatorEmail = emailResult.rows[0].email;
        const creatorName = emailResult.rows[0].nama;

        // Kirim email pemberitahuan ke pembuat dokumen
        await sendParafVEmail(creatorEmail, creatorName, nobooking, status, trackstatus, keterangan);
        
        // Response sukses dengan nomor validasi
        res.json({ 
            success: true, 
            message: 'Data berhasil dikirim ke LSB dan status diperbarui.',
            no_validasi: no_validasi
        });

    } catch (error) {
        console.error('Error sending data to peneliti:', error);
        res.status(500).json({ success: false, message: 'Gagal mengirim data ke LSB.' });
    }
});
// Fungsi untuk mengirimkan email pemberitahuan ke pembuat dokumen
async function sendParafVEmail(creatorEmail, creatorName, nobooking, status, trackstatus) {
    try {
        // Menyiapkan transporter untuk mengirimkan email
        const transporter = nodemailer.createTransport({
            service: 'gmail', // Gunakan layanan email yang Anda pilih (misalnya Gmail)
            auth: {
                user: process.env.EMAIL_USER, // Pengguna email dari environment variables (pastikan sudah diatur)
                pass: process.env.EMAIL_PASS  // Password email (pastikan sudah diatur di environment variables)
            }
        });

        // Menyiapkan isi email
        const mailOptions = {
            from: process.env.EMAIL_USER,  // Gantilah dengan email pengirim yang sudah diatur di environment variables
            to: creatorEmail,  // Email pembuat
            subject: 'Pemberitahuan Pengiriman Data ke Paraf Validasi',
            text: `Hallo ${creatorName},\n\nData Anda dengan No. Booking ${nobooking} telah dipindahkan ke peneliti dan statusnya telah diperbarui menjadi "${status}".\n\nTrack status saat ini: ${trackstatus}.\n\nTerima kasih atas perhatian Anda.`
        };

        // Mengirimkan email
        await transporter.sendMail(mailOptions);
        console.log('Email pemberitahuan berhasil dikirim.');

    } catch (error) {
        console.error('Gagal mengirim email pemberitahuan:', error);
    }
}
// End Peneliti Endpoint //
// START PARAF VALIDASI ENDPOINT //
app.get('/api/paraf/get-berkas-till-clear', async (req, res) => {
    // Validasi session dan divisi
    if (!req.session.user || req.session.user.divisi !== 'Peneliti Validasi') {
        return res.status(403).json({
            success: false,
            message: 'Akses ditolak. Hanya pengguna dengan divisi Paraf Validasi yang dapat mengakses data ini.'
        });
    }

    try {
        const ParafVUserId = req.session.user.userid;
        
        // Query yang diperbaiki
        const query = `
            SELECT 
                pv.nobooking,
                pv.no_validasi,
                b.noppbb,
                b.tahunajb,
                b.namawajibpajak,
                b.namapemilikobjekpajak,
                b.akta_tanah_path,
                b.sertifikat_tanah_path,
                b.pelengkap_path,
                pc.no_registrasi,  -- Ambil no_registrasi dari peneliti_clear_to_paraf
                pv.status,
                pv.trackstatus,
                vu.tanda_tangan_path AS peneliti_tanda_tangan_path
            FROM 
                paraf_validate pv
            JOIN 
                ppatk_bookingsspd b ON pv.nobooking = b.nobooking
            JOIN 
                peneliti_clear_to_paraf pc ON pv.nobooking = pc.nobooking
            LEFT JOIN 
                verified_users vu ON vu.userid = $1
            WHERE 
                pc.trackstatus = 'Terverifikasi'
            ORDER BY 
                pv.no_validasi DESC
            LIMIT 100;
        `;
        
        const result = await pool.query(query, [ParafVUserId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Tidak ada data yang ditemukan'
            });
        }

        // Transformasi data
        const transformedData = result.rows.map(row => ({
            ...row,
            peneliti_tanda_tangan_path: row.peneliti_tanda_tangan_path 
                ? `/signatures/${row.peneliti_tanda_tangan_path}`
                : null
        }));

        return res.status(200).json({
            success: true,
            data: transformedData
        });

    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});
// =================
app.get('/api/Validasi/generate-pdf/:nobooking', async (req, res) => {
  if (!validateNoBooking(req.params.nobooking)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Format nobooking tidak valid' 
    });
  }

  try {
    // Query data from database
    const { rows } = await pool.query(`
      SELECT 
        pb.*, bp.*, o.*, pp.*, vb.nama, vb.special_field,
        pav.no_validasi, pv.ttd_peneliti_blob, pc.ttd_paraf_blob
      FROM ppatk_bookingsspd pb
      LEFT JOIN ppatk_bphtb_perhitungan bp ON pb.nobooking = bp.nobooking
      LEFT JOIN ppatk_objek_pajak o ON pb.nobooking = o.nobooking
      LEFT JOIN ppatk_penghitungan_njop pp ON pb.nobooking = pp.nobooking
      LEFT JOIN verified_users vb ON pb.userid = vb.userid AND pb.nama = vb.nama
      LEFT JOIN paraf_validate pav ON pb.nobooking = pav.nobooking
      LEFT JOIN peneliti_verifikasi pv ON pb.nobooking = pv.nobooking
      LEFT JOIN peneliti_clear_to_paraf pc ON pb.nobooking = pc.nobooking
      WHERE pb.nobooking = $1
      FOR UPDATE`, [req.params.nobooking]);

    if (rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Data tidak ditemukan' 
      });
    }

    const data = rows[0];
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="BUKTI_VALIDASI_${req.params.nobooking}.pdf"`);
    
    // Pipe the PDF to response
    doc.pipe(res);
    
    // Add content to PDF
    doc.fontSize(14).text('BUKTI VALIDASI', { align: 'center' });
    doc.fontSize(12).text('PELAPORAN SURAT SETORAN PAJAK DAERAH', { align: 'center' });
    doc.fontSize(12).text('BEA PEROLEHAN HAK ATAS TANAH DAN BANGUNAN', { align: 'center' });
    doc.fontSize(12).text('(SSPD-BPHTB)', { align: 'center' });
    doc.moveDown();
    
    doc.fontSize(12).text('BADAN PENGELOLAAN PENDAPATAN DAERAH KABUPATEN BOGOR', { align: 'center' });
    doc.moveDown(2);
    
    // Section A: Wajib Pajak
    doc.fontSize(10).text(`A. 1. Nama Wajib Pajak    : ${data.nama || ''}`);
    doc.text(`2. NPWPD/KTP        : ${data.npwpwp || ''}`);
    doc.text(`3. Alamat Wajib Pajak : ${data.alamatwajibpajak || ''}    4. RT / RW    : ${data.rtrwwp || ''}`);
    doc.text(`5. Desa / Kelurahan  : ${data.kelurahandesawp || ''}                  6. Kecamatan  : ${data.kecamatanwp || ''}`);
    doc.text(`7. Kabupaten / Kota  : ${data.kabupatenkotawp || ''}            8. Kode Pos   : ${data.kodeposwp || ''}`);
    doc.moveDown();
    
    // Section B: Objek Pajak
    doc.text(`B. 1. NOP PBB           : ${data.noppbb || ''}`);
    doc.text(`2. Objek Lokasi Pajak : ${data.letaktanahdanbangunan || ''}    3. RT / RW    : ${data.rt_rwobjekpajak || ''}`);
    doc.text(`4. Desa / Kelurahan   : ${data.kelurahandesalp || ''}            5. Kecamatan  : ${data.kecamatanlp || ''}`);
    doc.text(`6. Kabupaten          : BOGOR                  7. Kode Pos   :`);
    doc.moveDown();
    
    // Perhitungan NJOP PBB table
    doc.text('Perhitungan NJOP PBB :');
    doc.moveDown(0.5);
    
    // Calculate values
    const luasTanahXnjopTanah = (data.luas_tanah || 0) * (data.njop_tanah || 0);
    const luasBangunanXnjopBangunan = (data.luas_bangunan || 0) * (data.njop_bangunan || 0);
    const totalNilai = luasTanahXnjopTanah + luasBangunanXnjopBangunan;
    
    // Table header
    doc.text('Objek Pajak', 50, doc.y, { width: 100 });
    doc.text('Luas', 150, doc.y, { width: 50 });
    doc.text('NJOP PBB / m2', 200, doc.y, { width: 100 });
    doc.text('Luas x NJOP PBB /m2', 300, doc.y, { width: 100 });
    doc.moveDown();
    
    // Table rows
    doc.text('Tanah (Bumi)', 50, doc.y, { width: 100 });
    doc.text(`${data.luas_tanah || 0} m2`, 150, doc.y, { width: 50 });
    doc.text(`Rp ${formatNumber(data.njop_tanah || 0)}`, 200, doc.y, { width: 100 });
    doc.text(`Rp ${formatNumber(luasTanahXnjopTanah)}`, 300, doc.y, { width: 100 });
    doc.moveDown();
    
    doc.text('Bangunan', 50, doc.y, { width: 100 });
    doc.text(`${data.luas_bangunan || 0} m2`, 150, doc.y, { width: 50 });
    doc.text(`Rp ${formatNumber(data.njop_bangunan || 0)}`, 200, doc.y, { width: 100 });
    doc.text(`Rp ${formatNumber(luasBangunanXnjopBangunan)}`, 300, doc.y, { width: 100 });
    doc.moveDown();
    
    doc.text(`14. Rp ${formatNumber(totalNilai)}`, { align: 'right' });
    doc.moveDown();
    
    // Additional fields
    doc.text(`15. Jenis Perolehan hak atas tanah dan/atau bangunan : ${data.jenis_perolehan || ''}`);
    doc.text(`16. Harga transaksi / Nilai pasar : Rp ${formatNumber(data.harga_transaksi || 0)}`);
    doc.moveDown();
    doc.text(`17. Nomor Sertifikat Tanah : ${data.nomor_sertifikat || ''}`);
    doc.moveDown();
    
    // Section C: Perhitungan BPHTB
    doc.text('C. PENGHTUNGAN BPHTB : Dalam Rupiah');
    doc.moveDown(0.5);
    
    // NPOP (akan diisi manual)
    doc.text('1. Nilai Perolehan Objek Pajak (NPOP)', 50, doc.y, { width: 300 });
    doc.text('', 350, doc.y, { width: 100 }); // Kosongkan untuk diisi manual
    doc.moveDown();
    
    // NPOPTKP
    doc.text('2. Nilai Perolehan Objek Pajak Tidak Kena Pajak (NPOPTKP)', 50, doc.y, { width: 300 });
    doc.text(`Rp ${formatNumber(data.nilaiPerolehanObjekPajakTidakKenaPajak || 0)}`, 350, doc.y, { width: 100 });
    doc.moveDown();
    
    // NPOPKP (akan diisi manual)
    doc.text('3. Nilai Perolehan Objek Pajak Kena Pajak (NPOPKP)', 50, doc.y, { width: 300 });
    doc.text('', 350, doc.y, { width: 100 }); // Kosongkan untuk diisi manual
    doc.moveDown();
    
    // BPHTB terutang (akan diisi manual)
    doc.text('4. Bea Perolehan Hak atas Tanah dan Bangunan yang terutang', 50, doc.y, { width: 300 });
    doc.text('', 350, doc.y, { width: 100 }); // Kosongkan untuk diisi manual
    doc.moveDown();
    
    // Pengurangan
    doc.text('5. Pengurangan 0,00 %', 50, doc.y, { width: 300 });
    doc.text('0', 350, doc.y, { width: 100 });
    doc.moveDown();
    
    // Denda (akan diisi manual)
    doc.text('6. Denda 0,00', 50, doc.y, { width: 300 });
    doc.text('0,00', 350, doc.y, { width: 100 });
    doc.moveDown();
    
    // BPHTB harus dibayar (akan diisi manual)
    doc.text('7. Bea Perolehan Hak atas Tanah dan Bangunan yang harus dibayar', 50, doc.y, { width: 300 });
    doc.text('', 350, doc.y, { width: 100 }); // Kosongkan untuk diisi manual
    doc.moveDown();
    
    // BPHTB telah dibayar
    doc.text('8. Bea Perolehan Hak atas Tanah dan Bangunan yang telah dibayar', 50, doc.y, { width: 300 });
    doc.text(`Rp ${formatNumber(data.bphtb_yangtelah_dibayar || 0)}`, 350, doc.y, { width: 100 });
    doc.moveDown();
    
    // BPHTB kurang dibayar (akan diisi manual)
    doc.text('9. Bea Perolehan Hak atas Tanah dan Bangunan yang kurang dibayar', 50, doc.y, { width: 300 });
    doc.text('0,00', 350, doc.y, { width: 100 });
    doc.moveDown(2);
    
    // Section D
    doc.text('D. Jumlah Setoran berdasarkan Perhitungan WP dan :');
    doc.moveDown();
    doc.text(`No Booking: ${data.nobooking || ''}`);
    doc.text(`Tgl Bayar: ${formatDate(data.tanggal_pembayaran) || ''}`);
    doc.text(`No Validasi: ${data.no_validasi || ''}`);
    doc.text(`PPAT / PPATS: ${data.special_field || ''}`);
    doc.moveDown(2);
    
    // Footer
    doc.text('Cibinong, ' + formatDate(new Date()), { align: 'right' });
    doc.moveDown(3);
    doc.text('Mengetahui,', { align: 'left' });
    doc.moveDown(3);
    doc.text('Kepala Bidang Pelayanan dan Penetapan', { align: 'left' });
    doc.moveDown(3);
    doc.text('BAMBANG SUJANA, S.E., M.SI', { align: 'left' });
    doc.text('197110082006041012', { align: 'left' });
    
    // Finalize the PDF
    doc.end();
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Gagal menghasilkan dokumen PDF' 
    });
  }
});

// Helper functions
function validateNoBooking(noBooking) {
  // Implement your validation logic here
  return true;
}

function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  const options = { day: 'numeric', month: 'long', year: 'numeric' };
  return d.toLocaleDateString('id-ID', options);
}
// END PARAF VALIDASI ENDPOINT //
// Start LSB (Loket Serah Berkas) Endpoint //
app.get('/api/LSB_berkas_complete', async (req, res) => {
    // Cek apakah pengguna sudah login dan apakah divisinya Peneliti
    if (!req.session.user || req.session.user.divisi !== 'LSB') {
        return res.status(403).json({
            success: false,
            message: 'Akses ditolak. Hanya pengguna dengan divisi Loket Serah Berkas yang dapat mengakses data ini.'
        });
    }

    try {
        // Query untuk mengambil data peneliti yang sudah diverifikasi dengan filter yang lebih efisien
        const query = `
            SELECT DISTINCT
            sb.nobooking,  sb.status, sb.trackstatus, sb.namawajibpajak, sb.namapemilikobjekpajak,
            b.userid, b.akta_tanah_path, b.sertifikat_tanah_path, b.pelengkap_path, b.tahunajb, b.noppbb
            FROM lsb_serah_berkas sb
            LEFT JOIN ppatk_bookingsspd b ON sb.nobooking = b.nobooking
            WHERE sb.trackstatus = 'Terverifikasi';
        `;
        
        const result = await pool.query(query);
        
        if (result.rows.length > 0) {
            return res.status(200).json({
                success: true,
                data: result.rows
            });
        } else {
            return res.status(404).json({
                success: false,
                message: 'No data found for Peneliti'
            });
        }
    } catch (error) {
        console.error('Error fetching data:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while fetching data.'
        });
    }
});
///////////////////////////////////////////////
/*
app.post('/api/LSB_upload-filestempel', uploadStempelFile.fields([
    { name: 'FileStempel', maxCount: 1 }
]), async (req, res) => {
    console.log('[1] Mulai proses upload file stempel');
    
    try {
        // Parse data JSON dari FormData
        const requestData = JSON.parse(req.body.data);
        const { userid, nobooking } = requestData;

        // Validasi
        if (!userid || !nobooking) {
            return res.status(400).json({ 
                success: false, 
                message: 'User ID dan No Booking diperlukan' 
            });
        }

        // Proses file
        if (!req.files || !req.files.FileStempel) {
            return res.status(400).json({ 
                success: false, 
                message: 'File stempel diperlukan' 
            });
        }
        
        const fileStempelPath = req.files.FileStempel[0].path;
        
        // Verifikasi booking
        const bookingResult = await pool.query(
            'SELECT * FROM peneliti_verifikasi WHERE nobooking = $1', 
            [nobooking]
        );
        
        if (bookingResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Booking tidak ditemukan' 
            });
        }

        // Update data ke kedua tabel dalam transaksi
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            // Update tabel pertama
            const updateResultLSB = await client.query(
                `UPDATE lsb_serah_berkas 
                 SET file_withstempel_path = $1
                 WHERE nobooking = $2
                 RETURNING *`,
                [fileStempelPath, nobooking]
            );

            // Update tabel kedua
            const updateResultPAT = await client.query(
                `UPDATE ppatk_bookingsspd 
                 SET file_withstempel_path = $1
                 WHERE nobooking = $2
                 RETURNING *`,
                [fileStempelPath, nobooking]
            );

            await client.query('COMMIT');
            
            // Hanya satu response yang dikirim
            res.json({ 
                success: true,
                file_path: fileStempelPath,
                message: 'File stempel berhasil diupload dan database diperbarui',
                updated_rows: {
                    lsb: updateResultLSB.rowCount,
                    ppatk: updateResultPAT.rowCount
                }
            });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('[ERROR] Detail error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Terjadi kesalahan server',
            errorDetails: error.message 
        });
    }
});
*/
// END LSB (Loket Serah Berkas) Endpoint //

///
// Logout manual: klik tombol logout
app.post('/logout', async (req, res) => {
  const { userid } = req.body;

  try {
    await pool.query(
      `UPDATE verified_users 
       SET statuspengguna = 'offline', last_active = NULL 
       WHERE userid = $1`,
      [userid]
    );

    res.status(200).json({ message: 'Logout berhasil' });
  } catch (error) {
    console.error('Error saat logout:', error.message);
    res.status(500).json({ message: 'Terjadi kesalahan saat logout.' });
  }
});
/////////////////
app.post('/ping', async (req, res) => {
  const { userid } = req.body;

  try {
    await pool.query(
      `UPDATE verified_users 
       SET last_active = NOW(), statuspengguna = 'online' 
       WHERE userid = $1`,
      [userid]
    );

    res.sendStatus(200);
  } catch (error) {
    console.error('Error saat ping:', error.message);
    res.status(500).json({ message: 'Ping error' });
  }
});
////////////////
cron.schedule('*/10 * * * *', async () => {
  try {
    const query = `
      UPDATE verified_users 
      SET statuspengguna = 'offline' 
      WHERE last_active IS NOT NULL 
      AND last_active < NOW() - INTERVAL '10 minutes'
    `;
    await pool.query(query);
    console.log('Cron: User idle >10 menit, status diupdate ke offline.');
  } catch (err) {
    console.error('Cron error:', err.message);
  }
});
/////////////////           ////////////////////////////
// Endpoint untuk menampilkan login.html
app.get('/', (_req, res) => {
    res.sendFile(path.join(__dirname,'public', 'login.html'));
});
const targetPath = path.join(__dirname, 'public', 'login.html');
console.log('Resolved path:', targetPath);

// Menjalankan server
app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});

// Endpoint untuk upload dokumen PPATK
app.post('/api/ppatk_upload-documents', uploadDocumentMiddleware.fields([
    { name: 'document1', maxCount: 1 },  // Dokumen wajib
    { name: 'document2', maxCount: 1 }   // Dokumen tambahan (opsional)
]), async (req, res) => {
    const logger = {
        info: (...args) => console.log('[INFO]', ...args),
        error: (...args) => console.error('[ERROR]', ...args),
        debug: (...args) => console.debug('[DEBUG]', ...args)
    };

    logger.info('Memulai proses upload dokumen...');
    
    try {
        // 1. Validasi Session dan User
        logger.debug('Session data:', req.session);
        
        // Check if session exists
        if (!req.session) {
            logger.error('Session tidak ditemukan');
            return res.status(401).json({ 
                success: false, 
                message: 'Session tidak valid. Silakan login ulang.' 
            });
        }
        
        const { userid } = req.session.user || {};
        
        if (!userid) {
            logger.error('UserID tidak ditemukan di session');
            return res.status(401).json({ 
                success: false, 
                message: 'Autentikasi diperlukan. Silakan login ulang.' 
            });
        }

        // 2. Validasi File Upload
        logger.debug('Files yang diterima:', req.files);
        
        if (!req.files || !req.files.document1) {
            logger.error('Dokumen wajib tidak ditemukan');
            return res.status(400).json({ 
                success: false, 
                message: 'Dokumen wajib harus diupload',
                error_code: 'MISSING_REQUIRED_DOCUMENT'
            });
        }

        // 3. Normalisasi Path File (cross-platform)
        const normalizePath = (filePath) => filePath.replace(/\\/g, '/');
        
        const document1Path = normalizePath(req.files.document1[0].path);
        const document2Path = req.files.document2 
            ? normalizePath(req.files.document2[0].path) 
            : null;
        
        logger.debug('Detail file upload:', {
            document1: {
                path: document1Path,
                name: req.files.document1[0].originalname,
                size: req.files.document1[0].size,
                type: req.files.document1[0].mimetype
            },
            document2: req.files.document2 ? {
                path: document2Path,
                name: req.files.document2[0].originalname,
                size: req.files.document2[0].size,
                type: req.files.document2[0].mimetype
            } : null
        });

        // 4. Verifikasi User di Database
        logger.debug('Memverifikasi user...');
        
        let userData;
        try {
            userData = await pool.query(
                'SELECT userid, nama FROM verified_users WHERE userid = $1', 
                [userid]
            );
        } catch (dbError) {
            logger.error('Database error saat verifikasi user:', dbError);
            return res.status(500).json({
                success: false,
                message: 'Error database saat verifikasi user',
                error_code: 'DATABASE_ERROR'
            });
        }

        if (userData.rows.length === 0) {
            logger.error('User tidak ditemukan', { userid });
            return res.status(404).json({
                success: false,
                message: 'Data user tidak ditemukan',
                error_code: 'USER_NOT_FOUND'
            });
        }

        const { nama } = userData.rows[0];
        logger.debug('Data user valid:', { userid, nama });

        // 5. Simpan ke Database dengan booking_id jika ada
        logger.debug('Menyimpan dokumen ke database...');
        
        const insertQuery = `
            INSERT INTO ppatk_documents (
                userid, 
                nama, 
                path_document1, 
                path_document2,
                booking_id,
                upload_date
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *;
        `;

        const insertParams = [
            userid,
            nama,
            document1Path,
            document2Path,
            req.body.booking_id || null, // Associate with booking if provided
            new Date()
        ];

        logger.debug('Executing query:', { query: insertQuery, params: insertParams });
        
        let insertResult;
        try {
            insertResult = await pool.query(insertQuery, insertParams);
        } catch (dbError) {
            logger.error('Database error saat menyimpan dokumen:', dbError);
            return res.status(500).json({
                success: false,
                message: 'Error database saat menyimpan dokumen',
                error_code: 'DATABASE_ERROR'
            });
        }

        if (insertResult.rows.length === 0) {
            logger.error('Gagal menyimpan data dokumen');
            throw new Error('INSERT operation failed');
        }

        logger.info('Dokumen berhasil disimpan', { 
            id: insertResult.rows[0].id,
            userid 
        });

        // 6. Response Sukses
        return res.json({ 
            success: true, 
            message: 'Dokumen berhasil diunggah',
            data: {
                user: { userid, nama },
                documents: {
                    document1: {
                        path: document1Path,
                        name: req.files.document1[0].originalname,
                        url: `/uploads/documents/${userid}/${path.basename(document1Path)}`
                    },
                    document2: document2Path ? {
                        path: document2Path,
                        name: req.files.document2[0].originalname,
                        url: `/uploads/documents/${userid}/${path.basename(document2Path)}`
                    } : null
                },
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        logger.error('Error proses upload dokumen:', {
            message: error.message,
            stack: error.stack,
            ...(error.code && { code: error.code })
        });

        // Cleanup file jika error terjadi setelah upload
        if (req.files) {
            try {
                logger.debug('Cleaning up uploaded files...');
                const cleanupPromises = [
                    req.files.document1?.[0]?.path && fs.promises.unlink(req.files.document1[0].path),
                    req.files.document2?.[0]?.path && fs.promises.unlink(req.files.document2[0].path)
                ].filter(Boolean);
                
                await Promise.all(cleanupPromises);
                logger.debug('File cleanup completed');
            } catch (cleanupError) {
                logger.error('Error during file cleanup:', cleanupError);
            }
        }

        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan saat mengupload dokumen',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Endpoint untuk mengambil dokumen yang sudah diupload
app.get('/api/ppatk_get-documents', async (req, res) => {
    try {
        // Validasi session
        if (!req.session || !req.session.user) {
            return res.status(401).json({
                success: false,
                message: 'Session tidak valid. Silakan login ulang.'
            });
        }

        const { userid } = req.session.user;
        const { booking_id } = req.query;

        let query = `
            SELECT id, userid, nama, path_document1, path_document2, booking_id, upload_date
            FROM ppatk_documents 
            WHERE userid = $1
        `;
        let params = [userid];

        // Jika booking_id diberikan, filter berdasarkan booking_id
        if (booking_id) {
            query += ' AND (booking_id = $2 OR booking_id IS NULL)';
            params.push(booking_id);
        }

        query += ' ORDER BY upload_date DESC';

        const result = await pool.query(query, params);

        // Transform data untuk response
        const documents = result.rows.map(row => ({
            id: row.id,
            userid: row.userid,
            nama: row.nama,
            documents: {
                document1: row.path_document1 ? {
                    path: row.path_document1,
                    name: path.basename(row.path_document1),
                    url: `/uploads/documents/${row.userid}/${path.basename(row.path_document1)}`
                } : null,
                document2: row.path_document2 ? {
                    path: row.path_document2,
                    name: path.basename(row.path_document2),
                    url: `/uploads/documents/${row.userid}/${path.basename(row.path_document2)}`
                } : null
            },
            booking_id: row.booking_id,
            upload_date: row.upload_date
        }));

        return res.json({
            success: true,
            data: documents
        });

    } catch (error) {
        console.error('Error mengambil dokumen:', error);
        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan saat mengambil dokumen'
        });
    }
});

// Buat tabel untuk menyimpan dokumen PPATK
const createPpatkDocumentsTable = async () => {
    try {
        const query = `
            CREATE TABLE IF NOT EXISTS ppatk_documents (
                id SERIAL PRIMARY KEY,
                userid VARCHAR(255) NOT NULL,
                nama VARCHAR(255) NOT NULL,
                path_document1 TEXT,
                path_document2 TEXT,
                booking_id VARCHAR(255),
                upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;
        
        await pool.query(query);
        console.log('Tabel ppatk_documents berhasil dibuat atau sudah ada');
        
        // Add booking_id column if it doesn't exist (for existing tables)
        try {
            await pool.query(`
                ALTER TABLE ppatk_documents 
                ADD COLUMN IF NOT EXISTS booking_id VARCHAR(255);
            `);
            console.log('Column booking_id berhasil ditambahkan atau sudah ada');
        } catch (alterError) {
            console.log('Column booking_id sudah ada atau error:', alterError.message);
        }
    } catch (error) {
        console.error('Error creating ppatk_documents table:', error);
    }
};

// Panggil fungsi pembuatan tabel
createPpatkDocumentsTable();

