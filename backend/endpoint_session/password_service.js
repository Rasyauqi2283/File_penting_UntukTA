import express from 'express';
import { pool } from '../../db.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { sendResetEmail } from '../services/emailservice.js';

const router = express.Router();

const generateResetToken = () => crypto.randomBytes(32).toString('hex');

router.post('/reset-password-request', async (req, res) => {
    const { userid, nik, nama, telepon, email } = req.body;

    if (!userid || !nik || !nama || !telepon || !email) {
        return res.status(400).json({ 
            success: false, 
            code: 'MISSING_FIELDS',
            message: 'Semua field harus diisi.' 
        });
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const userQuery = `
            SELECT * FROM verified_users 
            WHERE userid = $1 AND nik = $2 
            AND nama = $3 AND telepon = $4 
            AND email = $5
        `;
        const userResult = await client.query(userQuery, [userid, nik, nama, telepon, email]);
        
        if (!userResult.rows[0]) {
            return res.status(404).json({
                success: false,
                code: 'USER_NOT_FOUND',
                message: 'Data tidak ditemukan.'
            });
        }

        const token = generateResetToken();
        const expiresAt = new Date(Date.now() + 3600000);
        // 3. Simpan token
        await client.query(`
            INSERT INTO password_reset_tokens (email, token, expires_at)
            VALUES ($1, $2, $3)
            ON CONFLICT (email) 
            DO UPDATE SET token = $2, expires_at = $3
        `, [email, token, expiresAt]);

        // 4. Kirim email
        const resetLink = `${process.env.FRONTEND_URL}/ubah-katasandi?token=${token}`;
        await sendResetEmail(email, resetLink);
        await client.query('COMMIT');
        
        res.json({ 
            success: true,
            message: 'Link reset telah dikirim ke email Anda'
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Reset Password Error:', err);
        res.status(500).json({
            success: false,
            code: 'SERVER_ERROR',
            message: 'Terjadi kesalahan sistem'
        });
    } finally {
        client.release();
    }
});
//
router.post('/verify-reset-token', async (req, res) => {
    const { token } = req.body;
    if (!token) {
        return res.status(400).json({
            success: false,
            code: 'INVALID_TOKEN',
            message: 'Token tidak valid'
        });
    }

    try {
        const tokenResult = await pool.query(`
            SELECT email FROM password_reset_tokens 
            WHERE token = $1 AND expires_at > NOW()
        `, [token]);
        if (!tokenResult.rows[0]) {
            return res.status(400).json({
                success: false,
                code: 'EXPIRED_TOKEN',
                message: 'Token tidak valid atau kadaluarsa'
            });
        }

        const userResult = await pool.query(
            'SELECT email FROM verified_users WHERE email = $1',
            [tokenResult.rows[0].email]
        );
        if (!userResult.rows[0]) {
            return res.status(404).json({
                success: false,
                code: 'EMAIL_NOT_FOUND',
                message: 'Email tidak terdaftar'
            });
        }

        res.json({
            success: true,
            email: tokenResult.rows[0].email
        });

    } catch (err) {
        console.error('Token Verification Error:', err);
        res.status(500).json({
            success: false,
            code: 'SERVER_ERROR',
            message: 'Gagal memverifikasi token'
        });
    }
});
//
router.post('/reset-password', async (req, res) => {
    const { token, email, password } = req.body;

    const errors = [];
    if (!token) errors.push('Token wajib diisi');
    if (!email) errors.push('Email wajib diisi');
    if (!password || password.length < 8) errors.push('Password minimal 8 karakter');
    
    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            code: 'VALIDATION_ERROR',
            errors
        });
    }

    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        const tokenResult = await client.query(`
            DELETE FROM password_reset_tokens
            WHERE token = $1 AND email = $2 AND expires_at > NOW()
            RETURNING *
        `, [token, email]);
        if (!tokenResult.rows[0]) {
            return res.status(400).json({
                success: false,
                code: 'INVALID_TOKEN',
                message: 'Token tidak valid atau kadaluarsa'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await client.query(`
            UPDATE verified_users
            SET password = $1
            WHERE email = $2
        `, [hashedPassword, email]);
        await client.query('COMMIT');
        
        res.json({
            success: true,
            message: 'Password berhasil direset'
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Password Reset Error:', err);
        res.status(500).json({
            success: false,
            code: 'SERVER_ERROR',
            message: 'Gagal mereset password'
        });
    } finally {
        client.release();
    }
});

export default router;