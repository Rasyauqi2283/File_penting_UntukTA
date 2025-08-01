// Menambahkan event listener ke ikon mata
document.querySelectorAll(".toggle-password").forEach((toggle) => {
    toggle.addEventListener("click", function () {
        const targetInput = document.getElementById(this.getAttribute("data-target"));
        const isPassword = targetInput.getAttribute("type") === "password";

        // Toggle jenis input antara 'password' dan 'text'
        targetInput.setAttribute("type", isPassword ? "text" : "password");

        // Ubah ikon mata (fa-eye) menjadi mata dicoret (fa-eye-slash)
        this.classList.toggle("fa-eye");
        this.classList.toggle("fa-eye-slash");
    });
});

// Event listener untuk submit form
document.querySelector("form").addEventListener("submit", async (event) => {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);

    console.log("Form Data:", Object.fromEntries(formData)); // Debugging

    // Validasi di Client-Side
    const nik = formData.get("nik");
    const password = formData.get("password");
    const confirmPassword = formData.get("repeatpassword");
    const email = formData.get("email");
    const telepon = formData.get("telepon");

    telepon.addEventListener('input', function(event) {
        // Hanya izinkan angka, dan pastikan input dimulai dengan '08'
        let value = event.target.value.replace(/[^0-9]/g, '');  // Hanya angka yang diterima
        if (!value.startsWith('08')) {  // Pastikan dimulai dengan '08'
            value = '08' + value.substring(2);  // Tambahkan '08' di awal jika hilang
        }
        if (value.length > 13) {
            value = value.substring(0, 13);  // Batasi panjang maksimal 16 digit
        }
        event.target.value = value;  // Update input dengan nilai yang sudah disesuaikan
    });

    // Validasi NIK (16 digit)
    if (!/^\d{16}$/.test(nik)) {
        alert("NIK harus 16 digit!");
        return;
    }

    // Validasi Email
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
        alert("Email tidak valid!");
        return;
    }

    // Validasi Password Strength
    const passwordPattern = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    if (!passwordPattern.test(password)) {
        alert("Password harus memiliki minimal 8 karakter, termasuk huruf besar, huruf kecil, dan angka.");
        return;
    }

    // Validasi Password dan Konfirmasi Password
    if (password !== confirmPassword) {
        alert("Password dan konfirmasi password tidak cocok!");
        return;
    }

});