import bcrypt from "bcryptjs";

// Hash bcrypt yang disimpan (contoh dari Anda)
const storedHash = "$2b$10$EEOKbuO5lSk91H7wB3Ed9.pzCKCDBFDJHuVcb4Fo1HzIC5WpyVM5K";  // Gantilah dengan hash yang sesuai

// Password yang ingin Anda verifikasi
const passwordInput = "123123";  // Gantilah dengan password yang ingin Anda cek

// Verifikasi apakah password yang dimasukkan cocok dengan hash yang disimpan
bcrypt.compare(passwordInput, storedHash, function(err, isMatch) {
  if (err) {
    console.log("Terjadi kesalahan:", err);
  } else if (isMatch) {
    console.log("Password cocok!");
  } else {
    console.log("Password salah.");
  }
});
