    // Menangani pengiriman form registrasi
    document.getElementById("registration-form").addEventListener("submit", async function (e) {
        e.preventDefault();
  
        // Ambil data dari form
        const nama = document.getElementById("nama").value;
        const nik = document.getElementById("nik").value;
        const telepon = document.getElementById("telepon").value;
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;
        const repeatpassword = document.getElementById("repeatpassword").value;
        const fotoktp = document.getElementById("fotoktp").files[0];  // Mengambil file foto
  
        const messageDiv = document.getElementById("message");
  
        // Validasi password harus cocok
        if (password !== repeatpassword) {
          messageDiv.textContent = "Kata sandi tidak cocok!";
          messageDiv.style.color = "red";
          return;
        }
  
        // Membuat form data untuk mengirim file foto
        const formData = new FormData();
        formData.append("nama", nama);
        formData.append("nik", nik);
        formData.append("telepon", telepon);
        formData.append("email", email);
        formData.append("password", password);
        formData.append("fotoktp", fotoktp);
  
        try {
          // Mengirimkan data ke backend menggunakan fetch
          const response = await fetch("http://localhost:3000/api/auth/register", {
            method: "POST",
            body: formData,
          });
  
          const data = await response.json();
          messageDiv.textContent = data.message;
  
          if (response.ok) {
            messageDiv.style.color = "green";
            // Simpan email di localStorage setelah registrasi berhasil
            localStorage.setItem("email", email);  // Simpan email pengguna untuk verifikasi OTP
            setTimeout(() => {
            // Mengarahkan pengguna ke halaman verifikasi OTP
            window.location.href = data.redirectTo; // Ambil URL dari backend
          }, 1000);
          } else {
            messageDiv.style.color = "red";
          }
        } catch (error) {
          console.error("Error:", error);
          messageDiv.textContent = "Terjadi kesalahan saat mengirim data.";
          messageDiv.style.color = "red";
        }
      });