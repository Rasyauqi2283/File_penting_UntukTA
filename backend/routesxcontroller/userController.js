// controllers/userController.js
import { generateUserID, generatePPATNumber } from '../services/id_generator.js';
import { sendEmailNotification } from '../services/emailservice.js';
import { pool } from '../../db.js';
import { DIVISI_MAP, getDivisiName } from '../utils/constant.js';

export const generateUserIdHandler = async (req, res) => {
  const { divisi } = req.body;
    
    try {
        const divisiName = getDivisiName(divisi);
        if (!DIVISI_MAP[divisiName]) {
            return res.status(400).json({
                success: false,
                message: `Divisi tidak valid. Pilihan: ${Object.keys(DIVISI_MAP).join(', ')}`
            });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            const newUserID = await generateUserID(client, divisiName);
            let ppatk_khusus = null;
            
            if (divisiName === "PPAT" || divisiName === "PPATS") {
                ppatk_khusus = await generatePPATNumber(client);
            }

            await client.query('COMMIT');
            
            return res.status(200).json({
                success: true,
                newUserID,
                ppatk_khusus,
                divisi: divisiName
            });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error("Error in generate-userid:", error.message);
        return res.status(500).json({
            success: false,
            message: "Gagal generate ID",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

export const assignUserIdHandler = async (req, res) => {
  const { email, divisi } = req.body;
    
    try {
        const divisiName = getDivisiName(divisi);
        if (!email || !email.includes('@')) {
            return res.status(400).json({ 
                success: false,
                message: "Email harus valid" 
            });
        }

        if (!divisiName || !DIVISI_MAP[divisiName]) {
            return res.status(400).json({ 
                success: false,
                message: `Divisi tidak valid. Pilihan: ${Object.keys(DIVISI_MAP).join(', ')}`
            });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Check pending user
            const userResult = await client.query(
                `SELECT * FROM verified_users 
                 WHERE email = $1 AND verifiedstatus = 'verified_pending'
                 FOR UPDATE`,
                [email]
            );
            
            if (!userResult.rows[0]) {
                await client.query('ROLLBACK');
                return res.status(404).json({ 
                    success: false,
                    message: "User tidak ditemukan atau sudah memiliki UserID" 
                });
            }

            const newUserID = await generateUserID(client, divisiName);
            let ppatk_khusus = null;
            
            if (divisiName === "PPAT" || divisiName === "PPATS") {
                ppatk_khusus = await generatePPATNumber(client);
            }

            // Update user
            const updateResult = await client.query(
                `UPDATE verified_users 
                 SET userid = $1, 
                     divisi = $2, 
                     verifiedstatus = 'complete', 
                     fotoprofil = $3, 
                     ppatk_khusus = $4
                 WHERE email = $5
                 RETURNING *`,
                [
                    newUserID,
                    divisiName,
                    '/penting_F_simpan/profile-photo/default-foto-profile.png',
                    ppatk_khusus,
                    email
                ]
            );

            await client.query('COMMIT');
            
            // Send email notification
            try {
                await sendEmailNotification(email, newUserID, ppatk_khusus);
            } catch (emailError) {
                console.error('Email error:', emailError);
            }

            return res.status(200).json({
                status: 'success', // Gunakan field 'status' yang lebih eksplisit
                message: "UserID berhasil diassign",
                user: updateResult.rows[0],
                metadata: {
                    emailSent: !!ppatk_khusus,
                    timestamp: new Date().toISOString()
                }
            });

        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }

    } catch (err) {
        console.error("Error in assign-userid-and-divisi:", err.message);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan sistem",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};
