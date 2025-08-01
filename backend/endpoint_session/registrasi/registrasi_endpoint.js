import express from 'express';
import bcrypt from 'bcrypt';
import uploadKTP from '../../config/uploads/upload_ktp.js';
import { pool } from '../../../db.js';
import { generateOTP, sendOTP, sendOTPWithRetry } from '../../services/emailservice.js';


const router = express.Router();

// Endpoint Registrasi
router.post('/register', uploadKTP.single('fotoktp'), async (req, res) => {
        const { nama, nik, telepon, email, password } = req.body;
    const foto = req.file ? req.file.path : null;  // Dapatkan path foto yang diupload
  
    // Validasi input
    if (!nama || !nik || !telepon || !email || !password || !foto) {
      return res.status(400).json({ message: 'Semua data harus diisi dengan benar' });
    }
  
    try {
        // Cek apakah email sudah ada di verified_users dengan status selain "unverified"
        const checkEmailQueryVerified = 'SELECT * FROM verified_users WHERE email = $1';
        const resultEmailVerified = await pool.query(checkEmailQueryVerified, [email]);

        if (resultEmailVerified.rows.length > 0) {
            return res.status(400).json({ message: 'Email ini sudah terdaftar dengan status yang valid. Anda tidak bisa mendaftar ulang.' });
        }

        // Hash password sebelum disimpan
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const otp = generateOTP();

        // Cek apakah email sudah ada di unverified_users
        const checkEmailQuery = 'SELECT * FROM unverified_users WHERE email = $1';
        const resultEmail = await pool.query(checkEmailQuery, [email]);
    
        if (resultEmail.rows.length > 0) {
            // Jika ada, update semua data pengguna termasuk OTP yang baru
            const updateQuery = `
            UPDATE unverified_users
            SET
                nama = $1,
                nik = $2,
                telepon = $3,
                email = $4,
                password = $5,
                foto = $6,
                otp = $7,
                verifiedstatus = $8,
                fotoprofil = $9
            WHERE email = $10
            RETURNING *;
            `;
            const updateValues = [
            nama, nik, telepon, email, hashedPassword, foto, otp, 'unverified', '', email
            ];

            // Update data pengguna yang ada di unverified_users
            const updatedUser = await pool.query(updateQuery, updateValues);

            // Kirim OTP baru
            await sendOTP(email, otp);

            res.status(200).json({
            message: 'Registrasi berhasil! Silakan cek email Anda untuk kode OTP dan masukkan di halaman verifikasi.',
            redirectTo: '/verifikasi-otp.html'
            });
        } else {
            // Jika email tidak ada, insert data baru
            const insertQuery = `
            INSERT INTO unverified_users (nama, nik, telepon, email, password, foto, otp, verifiedstatus, fotoprofil)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *;
            `;
            const insertValues = [
            nama, nik, telepon, email, hashedPassword, foto, otp, 'unverified', ''
            ];

            // Insert data pengguna baru
            await pool.query(insertQuery, insertValues);

            // Kirim OTP baru
            await sendOTP(email, otp);

            res.status(200).json({
            message: 'Registrasi berhasil! Silakan cek email Anda untuk kode OTP dan masukkan di halaman verifikasi.',
            redirectTo: '/verifikasi-otp.html'
            });
        }

    } catch (err) {
      console.error('Error saat registrasi:', err.message);
      res.status(500).json({ message: 'Gagal melakukan registrasi.' });
    }
});

// Endpoint Verifikasi OTP
router.post('/verify-otp', async (req, res) => {
const { email, otp } = req.body;

    // Validasi input
    if (!email || !otp) {
        return res.status(400).json({ 
            success: false,
            message: "Email dan OTP harus diisi" 
        });
    }

    try {
        // 1. Cek email di unverified_users
        const query = 'SELECT * FROM unverified_users WHERE email = $1';
        const result = await pool.query(query, [email]);
        const user = result.rows[0];

        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: "Email tidak ditemukan" 
            });
        }

        // 2. Verifikasi OTP
        if (user.otp.trim() !== otp.trim()) {
            console.log(`OTP mismatch: DB(${user.otp.trim()}) vs Input(${otp.trim()})`);
            return res.status(400).json({ 
                success: false,
                message: "Kode OTP salah" 
            });
        }

        console.log(`Email yang diterima untuk verifikasi: ${email}`);
        console.log(`OTP yang dikirim: ${user.otp.trim()}`);
        console.log(`OTP yang dimasukkan: ${otp.trim()}`);

        // 3. Cek duplikasi di verified_users
        const checkVerifiedQuery = 'SELECT * FROM verified_users WHERE email = $1';
        const verifiedResult = await pool.query(checkVerifiedQuery, [email]);

        if (verifiedResult.rows.length > 0) {
            return res.status(400).json({ 
                success: false,
                message: 'Akun sudah terverifikasi.' 
            });
        }

        // 4. Pindahkan ke verified_users
        const insertQuery = `
            INSERT INTO verified_users (
                nama, nik, telepon, email, password, foto, 
                otp, verifiedstatus, userid, divisi, 
                fotoprofil, ppatk_khusus, statuspengguna
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) 
            RETURNING *;
        `;
        
        const insertValues = [
            user.nama, user.nik, user.telepon, user.email, 
            user.password, user.foto, otp.trim(), 'verified_pending', 
            '', '', '', '', 'offline'
        ];

        // Gunakan transaction untuk operasi move-delete
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            const insertResult = await client.query(insertQuery, insertValues);
            await client.query('DELETE FROM unverified_users WHERE email = $1', [email]);
            
            await client.query('COMMIT');
            
            console.log(`✅ Verifikasi berhasil untuk ${email}`);
            return res.json({ 
                success: true,
                message: "Verifikasi berhasil! Akun Anda sedang diproses.",
                data: {
                    email: insertResult.rows[0].email,
                    status: insertResult.rows[0].verifiedstatus
                }
            });

        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error("❌ Error verifikasi OTP:", error.message);
        return res.status(500).json({ 
            success: false,
            message: "Terjadi kesalahan saat verifikasi",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Endpoint Resend OTP
router.post('/resend-otp', async (req, res) => {
    const { email } = req.body;
  
    try {
      // Ambil data pengguna dari PostgreSQL
      const query = 'SELECT * FROM unverified_users WHERE email = $1';
      const result = await pool.query(query, [email]);
      const user = result.rows[0];
  
      if (!user) {
        return res.status(404).json({ message: "Email tidak ditemukan" });
      }
  
      if (user.status === "verified_pending") {
        return res.status(400).json({ message: "Akun sudah terverifikasi" });
      }
  
      // Generate OTP baru
      const otp = generateOTP();
  
      // Update OTP di PostgreSQL (gunakan unverified_users)
      const updateQuery = 'UPDATE unverified_users SET otp = $1 WHERE email = $2 RETURNING *';
      await pool.query(updateQuery, [otp, email]);
  
      // Kirim OTP baru
      await sendOTPWithRetry(email, otp);
  
      res.json({ message: "OTP baru telah dikirim ke email Anda." });
  
    } catch (error) {
      console.error("❌ Gagal mengirim ulang OTP:", error.message);
      res.status(500).json({ message: "Gagal mengirim ulang OTP." });
    }
});

export default router;