import express from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../../../db.js';
const router = express.Router();

// Patch 1
// Endpoint Login
router.post('/login', async (req, res) => {
  const { identifier, password } = req.body;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Cari user berdasarkan userid ATAU username
    const query = `
        SELECT 
            userid, password, nama, email, divisi, 
            fotoprofil, statuspengguna, verifiedstatus,
            username, nip, special_field, special_parafv,
            tanda_tangan_mime, tanda_tangan_path, telepon
        FROM verified_users 
        WHERE (email = $1 OR userid = $1 OR username = $1)
        AND verifiedstatus = 'complete'
    `;
    const result = await client.query(query, [identifier]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'UserID/Username tidak ditemukan atau belum terverifikasi.' 
      });
    }

    // Verifikasi password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ 
        success: false,
        message: 'Password salah.' 
      });
    }

    // Cek kelengkapan profil berdasarkan divisi
    let isProfileComplete = false;
    if (user.divisi === 'Wajib Pajak') {
      isProfileComplete = !!user.username;
    } else if (user.divisi === 'PPAT' || user.divisi === 'PPATS') {
      isProfileComplete = !!user.username && !!user.special_field;
    } else if (user.divisi === 'Peneliti Validasi') {
      isProfileComplete = !!user.username && !!user.nip && !!user.special_parafv;
    } else {
      isProfileComplete = !!user.nip && !!user.username;
    }

    // Update status & last_active jadi online saat login
    await client.query(
      `UPDATE verified_users 
       SET statuspengguna = $1, last_active = NOW() 
       WHERE userid = $2`,
      ['online', user.userid]
    );

    await client.query('COMMIT');

    // Simpan data user di session
    req.session.user = {
      userid: user.userid,
      divisi: user.divisi,
      nama: user.nama,
      email: user.email,
      telepon: user.telepon,
      fotoprofil: user.fotoprofil,
      username: user.username,
      nip: user.nip,
      special_field: user.special_field,
      special_parafv: user.special_parafv,
      is_profile_complete: isProfileComplete,
      statuspengguna: user.statuspengguna,
      tanda_tangan_mime: user.tanda_tangan_mime,
      tanda_tangan_path: user.tanda_tangan_path
    };

    // Kirim response ke frontend
    res.status(200).json({
      success: true,
      message: `Login berhasil, ${user.username || user.userid}!`,
      userid: user.userid,
      divisi: user.divisi,
      nama: user.nama,
      email: user.email,
      telepon: user.telepon,
      foto: user.fotoprofil,
      username: user.username,
      nip: user.nip,
      special_field: user.special_field,
      special_parafv: user.special_parafv,
      is_profile_complete: isProfileComplete,
      statuspengguna: user.statuspengguna,
      tanda_tangan_mime: user.tanda_tangan_mime,
      tanda_tangan_path: user.tanda_tangan_path
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error saat login:', error);
    res.status(500).json({ 
      success: false,
      message: 'Terjadi kesalahan server.' 
    });
  } finally {
    client.release();
  }
});

// Patch 2 Endpoint Complete Profile
// Endpoint Complete Profile yang Disempurnakan
router.post('/complete-profile', async (req, res) => {
  const { userid, nip, username, special_field, special_parafv } = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Dapatkan data user lengkap untuk validasi
    const userQuery = await client.query(
      'SELECT divisi, username FROM verified_users WHERE userid = $1 FOR UPDATE',
      [userid]
    );
    const user = userQuery.rows[0];

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User tidak ditemukan.' 
      });
    }
    if (!username) {
      return res.status(400).json({ 
        success: false,
        message: 'Username wajib diisi.' 
      });
    }
    if (username !== user.username) {
      const existingUser = await client.query(
        'SELECT userid FROM verified_users WHERE username = $1',
        [username]
      );
      if (existingUser.rows.length > 0) {
        return res.status(400).json({ 
          success: false,
          message: 'Username sudah digunakan oleh user lain.' 
        });
      }
    }

    if ((user.divisi !== 'Wajib Pajak' && user.divisi !== 'PPAT' && user.divisi !== 'PPATS')  && !nip) {
      return res.status(400).json({ 
        success: false,
        message: 'NIP wajib diisi untuk divisi ini.' 
      });
    }
    if ((user.divisi === 'PPAT' || user.divisi === 'PPATS') && !special_field) {
      return res.status(400).json({ 
        success: false,
        message: 'Bidang khusus wajib diisi untuk PPAT/PPATS.' 
      });
    }
    if ((user.divisi === 'Peneliti Validasi') && !special_parafv) {
      return res.status(400).json({ 
        success: false,
        message: 'Keseluruhan data wajib diisi untuk Peneliti Validasi.' 
      });
    }

    // Update profil user (dengan RETURNING seperti di update-profile)
    const updateResult = await client.query(
      `UPDATE verified_users 
       SET nip = $1, username = $2, special_field = $3, special_parafv = $5 
       WHERE userid = $4
       RETURNING username, nip, special_field, special_parafv`,
      [nip, username, special_field, userid, special_parafv]
    );

    const updatedUser = updateResult.rows[0];
    await client.query('COMMIT');

    // Response lebih detail seperti di update-profile
    const responseData = {
      success: true,
      message: 'Profil berhasil dilengkapi!',
      username: updatedUser.username,
      nip: updatedUser.nip
    };
    // Tambahkan field khusus sesuai divisi
    if (user.divisi === 'PPAT' || user.divisi === 'PPATS') {
      responseData.special_field = updatedUser.special_field;
    } else if (user.divisi === 'Peneliti Validasi') {
      responseData.special_parafv = updatedUser.special_parafv;
    }
    res.status(200).json(responseData);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error saat melengkapi profil:', error);

    if (error.code === '23505') {
      return res.status(400).json({ 
        success: false,
        message: 'Username sudah digunakan oleh user lain.' 
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Gagal menyimpan profil.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    client.release();
  }
});

export default router;