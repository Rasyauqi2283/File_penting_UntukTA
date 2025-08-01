// Endpoint untuk membuat akun admin
app.post('/create-admin', async (req, res) => {
    const { nama, nik, telepon, email, password, userID, divisi, foto } = req.body;

    // Validasi input, pastikan semua data ada
    if (!nama || !nik || !telepon || !email || !password || !userID || !divisi) {
        return res.status(400).json({ message: 'Semua data harus diisi dengan benar' });
    }

    // Validasi format email
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Format email tidak valid' });
    }

    try {
        // Hash password admin
        const hashedPassword = await bcrypt.hash(password, 10);

        // Menyusun query untuk memasukkan data admin ke dalam tabel 'verified_users'
        const insertQuery = `
            INSERT INTO verified_users (nama, nik, telepon, email, password, foto, otp, verifiedstatus, fotoprofil, userid, divisi, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *;
        `;
        
        // Nilai untuk query
        const values = [
            nama, 
            nik, 
            telepon, 
            email, 
            hashedPassword, 
            foto || '', // Foto bisa kosong
            '', // OTP dikosongkan karena sudah terverifikasi
            'complete', // Status akan langsung complete sebagai admin
            '', // Fotoprofil kosong
            userID,  // userID (SA01) 
            divisi,  // divisi (Administrator)
            'offline' // Status default offline
        ];

        // Menyimpan data ke database
        const result = await pool.query(insertQuery, values);

        // Jika berhasil, kirimkan respon sukses
        console.log('Akun admin berhasil dibuat:', result.rows[0]);
        res.status(200).json({ 
            message: 'Akun admin berhasil dibuat dan siap digunakan untuk login!',
            data: result.rows[0] // Menyertakan data hasil insert
        });
    } catch (err) {
        console.error('Error saat membuat akun admin:', err.message);
        // Memberikan error yang lebih jelas dalam response
        res.status(500).json({ 
            message: 'Gagal membuat akun admin',
            error: err.message 
        });
    }
});