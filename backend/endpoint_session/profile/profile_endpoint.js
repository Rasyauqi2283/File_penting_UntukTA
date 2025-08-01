import express from 'express';
import bcrypt from 'bcrypt';
import path from 'path';
import { promises as fs } from 'fs';
import { pool } from '../../../db.js';
import { ttdVerifMiddleware } from '../../config/uploads/upload_ttdverif.js';
import { uploadProfile, processImage } from '../../config/uploads/upload_profpicture.js';

const router = express.Router();

// Patch 1
// Endpoint untuk mendapatkan data profil pengguna
router.get('/profile', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: 'User belum login.' });
    }
    try {
    let user = {
      userid: req.session.user.userid,
      nama: req.session.user.nama,
      email: req.session.user.email,
      telepon: req.session.user.telepon,
      divisi: req.session.user.divisi,
      fotoprofil: req.session.user.fotoprofil,
      username: req.session.user.username,
      nip: req.session.user.nip,
      special_field: req.session.user.special_field,
      special_parafv: req.session.user.special_parafv,
      statuspengguna: req.session.user.statuspengguna,
      tanda_tangan_path: req.session.user.tanda_tangan_path,
      tanda_tangan_mime: req.session.user.tanda_tangan_mime
    };
    // Jika data penting tidak ada, ambil dari DB
    if (!user.nama || !user.email) {
      const dbUser = await pool.query(
        'SELECT * FROM verified_users WHERE userid = $1',
        [user.userid]
      );
      if (dbUser.rows[0]) {
        user = { ...user, ...dbUser.rows[0] }; // Gabungkan data
        req.session.user = user; // Update session
      }
    }

        res.json({
            userid: user.userid,
            nama: user.nama,
            email: user.email,
            telepon: user.telepon,
            divisi: user.divisi,
            fotoprofil: user.fotoprofil,
            username: user.username,
            nip: user.nip,
            special_field: user.special_field,
            special_parafv: user.special_parafv,
            statuspengguna: user.statuspengguna,
            tanda_tangan_path: user.tanda_tangan_path,
            tanda_tangan_mime: user.tanda_tangan_mime
        });
    }   catch (error) {
      console.error('Profile error:', error);
      res.status(500).json({ message: 'Gagal memuat profil' });
  }
});

// Patch 2
// Endpoint untuk update tanda tangan
router.post('/update-profile-paraf', 
  ttdVerifMiddleware,
  async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
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
            const fullPath = path.join(process.cwd(), 'public', req.session.user.tanda_tangan_path);
            await fs.unlink(fullPath).catch(() => {});
          } catch (error) {
            console.error('Error deleting old signature:', error);
          }
        }

        // Update database
        const updateQuery = `
          UPDATE verified_users 
          SET 
            tanda_tangan_path = $1, tanda_tangan_mime = $2
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
        await client.query('COMMIT');
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
        await client.query('ROLLBACK');
      console.error('[TTD UPLOAD ERROR]', error);
      res.status(500).json({ 
        success: false, 
        message: 'Gagal mengupload tanda tangan',
        error: process.env.NODE_ENV === 'development' ? error.message : null
      });
    }
  }
);
// Patch 3
// Endpoint untuk mendapatkan file tanda tangan
router.get('/tanda-tangan/:userid', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT tanda_tangan_path, tanda_tangan_mime 
       FROM verified_users WHERE userid = $1`,
      [req.params.userid]
    );

    if (!result.rows[0]?.tanda_tangan_path) {
      return res.status(404).json({ message: 'Tanda tangan tidak ditemukan' });
    }

    const filePath = path.join(
      process.cwd(),
      'public',
      result.rows[0].tanda_tangan_path
    );

    // Cek apakah file ada
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ message: 'File tanda tangan tidak ditemukan' });
    }

    // Set header dan stream file
    res.setHeader('Content-Type', result.rows[0].tanda_tangan_mime);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache 1 hari
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil tanda tangan' });
  }
});
//

// Patch 4
// Endpoint untuk upload foto profil
router.post('/profile/upload', 
  uploadProfile.single('fotoprofil'),
  processImage,
  async (req, res) => {
    const client = await pool.connect(); // Gunakan client yang sama untuk transaksi
    try {
      await client.query('BEGIN'); // Mulai transaksi

      // 1. Dapatkan path foto lama dari database
      const oldPhoto = await client.query(
        'SELECT fotoprofil FROM verified_users WHERE userid = $1',
        [req.session.user.userid]
      );
      const oldPhotoPath = oldPhoto.rows[0]?.fotoprofil;

      // 2. Update database dengan path baru
      const newFotoPath = '/penting_F_simpan/profile-photo/' + req.file.filename;
      await client.query(
        'UPDATE verified_users SET fotoprofil = $1 WHERE userid = $2',
        [newFotoPath, req.session.user.userid]
      );

      // 3. Hapus file lama JIKA BUKAN DEFAULT
      if (oldPhotoPath && !oldPhotoPath.includes('default-foto-profile')) {
        const fullOldPath = path.join(process.cwd(), 'public', oldPhotoPath);
        await fs.unlink(fullOldPath).catch(console.warn); // Tidak block proses jika gagal
      }

      await client.query('COMMIT'); // Commit transaksi

      // 4. Update session
      req.session.user.fotoprofil = newFotoPath;

      res.json({ 
        success: true,
        foto_path: newFotoPath 
      });
    } catch (error) {
      await client.query('ROLLBACK'); // Rollback jika error
      
      // Hapus file yang baru diupload jika gagal
      if (req.file?.path) {
        await fs.unlink(req.file.path).catch(console.warn);
      }

      res.status(500).json({ 
        success: false, 
        message: 'Gagal update foto profil',
        error: process.env.NODE_ENV === 'development' ? error.message : null
      });
    } finally {
      client.release(); // Lepas client
    }
  }
);

// Patch 5
// Endpoint untuk update password
import rateLimit from 'express-rate-limit';

// Tambahkan rate limiting (5x percobaan per 15 menit)
const updatePasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 5,
  message: 'Terlalu banyak percobaan. Coba lagi setelah 15 menit.'
});

router.post('/update-password', updatePasswordLimiter, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  
  // Validasi password baru
  if (newPassword.length < 8) {
    return res.status(400).json({ 
      success: false,
      message: 'Password minimal 8 karakter' 
    });
  }

  if (newPassword === oldPassword) {
    return res.status(400).json({ 
      success: false,
      message: 'Password baru tidak boleh sama dengan password lama' 
    });
  }

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Verifikasi password lama
      const dbUser = await client.query(
        'SELECT password FROM verified_users WHERE userid = $1',
        [req.session.user.userid]
      );
      const match = await bcrypt.compare(oldPassword, dbUser.rows[0].password);
      if (!match) {
        return res.status(400).json({ 
          success: false,
          message: 'Password lama salah' 
        });
      }

      // 2. Hash password baru
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      // 3. Update database
      await client.query(
        'UPDATE verified_users SET password = $1 WHERE userid = $2',
        [hashedNewPassword, req.session.user.userid]
      );

      await client.query('COMMIT');

      // 4. Update session (pastikan di-hash)
      req.session.user.password = hashedNewPassword;

      res.json({ 
        success: true,
        message: 'Password berhasil diperbarui' 
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Gagal memperbarui password' 
    });
  }
});

export default router;