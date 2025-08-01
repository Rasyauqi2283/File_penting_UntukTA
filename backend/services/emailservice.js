import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// patch 1
// pembuatan otp
export const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};
export const validateOTPFormat = (otp) => {
    return /^\d{6}$/.test(otp);
};

export const sendOTP = async (email, otp) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'OTP untuk Registrasi',
        text: `Kode OTP Anda adalah: ${otp}. Silakan masukkan kode ini untuk melanjutkan proses verifikasi.`
    };
    try {
        // Mengirim email OTP pertama kali
        const info = await transporter.sendMail(mailOptions);
        console.log(`OTP telah dikirim ke email ${email}: ${info.response}`);
        return info;  // Mengembalikan info pengiriman email
    } catch (error) {
        console.error('Gagal mengirim OTP:', error.message);
        throw error; // Lemparkan error jika gagal mengirimkan email
    }
};

export const sendOTPWithRetry = async (email, otp, retries = 3) => {
      // Menyusun konten email
      const mailOptions = {
          from: process.env.EMAIL_USER,  // Email pengirim
          to: email,                     // Email penerima
          subject: 'OTP untuk Registrasi',
          text: `Kode OTP Anda adalah: ${otp}. Silakan masukkan kode ini untuk melanjutkan proses verifikasi.` // Isi email
      };  
      try {
          // Mengirim email OTP
          const info = await transporter.sendMail(mailOptions);
          console.log(`OTP telah dikirim ke email ${email}: ${info.response}`);
          return info; // Mengembalikan informasi pengiriman email jika berhasil
      } catch (error) {
          // Jika terjadi error, coba ulang sesuai dengan jumlah percobaan yang ditentukan
          if (retries > 0) {
              console.log(`Gagal mengirim OTP ke ${email}. Percobaan ulang ${retries} kali.`);
              // Mengulangi pengiriman OTP dengan percobaan yang tersisa
              await sendOTPWithRetry(email, otp, retries - 1);
          } else {
              // Jika sudah mencoba ulang beberapa kali dan gagal, log error dan lemparkan error
              console.error('Gagal mengirim OTP setelah beberapa kali percobaan:', error.message);
              throw error; // Lemparkan error jika percobaan habis
          }
      }
};
// patch 2
// mengirim notifikasi email ke pengguna yang sudah dibuatkan akun

export const sendEmailNotification = async (email, userID, ppatkNumber) => {
    try {
            const userQuery = await pool.query(
      'SELECT nama, divisi FROM verified_users WHERE email = $1', 
      [email]
    );
    if (!userQuery.rows.length) {
      console.warn(`User ${email} tidak ditemukan`);
      return;
    }
    const user = userQuery.rows[0];
    const mailOptions = {
      from: `"Sistem Registrasi" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'UserID Anda Telah Aktif',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">Akun Anda Telah Aktif</h2>
          <p>Halo <strong>${user.nama}</strong>,</p>
          
          <p>Berikut detail akun Anda:</p>
          
          <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>User ID:</strong> ${userID}</p>
            ${ppatkNumber ? `<p><strong>Nomor PPAT:</strong> ${ppatkNumber}</p>` : ''}
            <p><strong>Divisi:</strong> ${user.divisi}</p>
          </div>
          
          <p>Anda sekarang dapat login ke sistem menggunakan email ini.</p>
          
          <p style="margin-top: 30px;">Hormat kami,<br>
          <strong>Tim Sistem</strong></p>
        </div>
      `
    };
    await transporter.sendMail(mailOptions);
    console.log(`Email terkirim ke ${email}`);
    } catch (error) {
        console.error('Gagal mengirim email:', error.message);
    }
};

// patch 3
// mengirim email reset ke pengguna

export const sendResetEmail = async (to, link) => {
    const mailOptions = {
        from: `"BAPPENDA" <${process.env.EMAIL_USER}>`,
        to,
        subject: 'Reset Password - E-BPHTB',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2c3e50;">Reset Password</h2>
                <p>Klik tombol berikut untuk reset password Anda:</p>
                <a href="${link}" 
                   style="display: inline-block; padding: 10px 20px; 
                          background-color: #3498db; color: white; 
                          text-decoration: none; border-radius: 5px;">
                    Reset Password
                </a>
                <p style="margin-top: 20px;">
                    <small>Link akan kadaluarsa dalam 1 jam</small>
                </p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (err) {
        console.error('Email Error:', err);
        throw new Error('Gagal mengirim email');
    }
};