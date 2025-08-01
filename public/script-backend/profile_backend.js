// Mengambil data profil pengguna dari API
// Fungsi utilitas terpisah
// patch 1
const setLoading = (isLoading) => {
  const loader = document.getElementById('loading-indicator');
  const content = document.getElementById('profile-content');
  
  if (isLoading) {
    loader.style.display = 'block';
    content.style.opacity = '0.5';
    content.style.pointerEvents = 'none';
  } else {
    loader.style.display = 'none';
    content.style.opacity = '1';
    content.style.pointerEvents = 'auto';
  }
};

// Penggunaan
setLoading(true);
fetch('/api/auth/profile')
  .then(response => {
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return response.json();
  })
  
  .finally(() => setLoading(false));

fetch('/api/auth/profile')
.then(response => {
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return response.json();
  })
.then(user => {
    const cacheBuster = `?t=${new Date().getTime()}`;
    console.log('Data pengguna diperoleh', user);
    console.log('Data userID:', user.userid);

    const userDivisi = user.divisi;
    const divisiToHide = ['PPAT', 'PPATS', 'Wajib Pajak'];
    if (divisiToHide.includes(userDivisi)) {
        const nipField = document.getElementById("nip-field");
        if (nipField) {
            nipField.style.display = "none";
        }
    }
    const specialField = document.getElementById("special_field");
    if (userDivisi === 'PPAT' || userDivisi === 'PPATS') {
        document.getElementById('special_field_input').value = user.special_field || '';
    } else {
        specialField.style.display = "none";
    }
    const special_parafv = document.getElementById("special_ParafValidasi");
    if (userDivisi === 'Peneliti Validasi') {
        document.getElementById('special_parafv').value = user.special_parafv || '';
    } else {
        special_parafv.style.display = "none";
    }
    if (user.tanda_tangan_path) {
    document.getElementById('ttd-preview').src = user.tanda_tangan_path;
    document.getElementById('ttd-info').textContent = 
        `Tipe: ${user.tanda_tangan_mime || 'image/jpeg'}`;
    }
    // Mengubah textContent atau value untuk semua elemen dengan class yang sesuai
    document.querySelectorAll('.userid').forEach(element => {
        element.value = user.userid;
        element.textContent = user.userid;
    });
    document.querySelectorAll('.nama').forEach(element => {
        element.value = user.nama;
        element.textContent = user.nama;
    });
    document.querySelectorAll('.divisi').forEach(element => {
        element.textContent = user.divisi;
    });
    document.getElementById('email').value = user.email;
    document.getElementById('telepon').value = user.telepon;
    document.getElementById('password').value = '*******';
    document.getElementById('username').value = user.username;
    document.getElementById('nip').value = user.nip;    
    document.getElementById('special_field').value = user.special_field;
    document.getElementById('special_parafv').value = user.special_parafv;
        // Memperbaiki path gambar untuk src
    const fotoProfilUrl = user.fotoprofil 
      ? `${decodeURIComponent(user.fotoprofil.replace(/\\/g, '/'))}${cacheBuster}`
      : '/default-foto-profile.png';
    document.querySelectorAll('.fotoprofil').forEach(img => {
      img.src = fotoProfilUrl;
      img.onerror = () => img.src = '/default-foto-profile.png';
    });
    
    // Sembunyikan loading state
    document.getElementById('profile-container').classList.remove('loading');
    const fotoProfilElements = document.querySelectorAll('.fotoprofil');
    fotoProfilElements.forEach(element => {
        element.src = fotoProfilUrl;
    });

    console.log('Foto Profil yang Ditampilkan:', fotoProfilUrl);
})
.catch(err => {
  console.error('Profile fetch error:', err);
  showNotification(
    'error', 
    err.response?.data?.message || 'Gagal memuat data profil',
    { timeout: 5000 }
  );
  logErrorToService(err);
});


// patch 2
document.addEventListener('DOMContentLoaded', () => {    
    const uploadButton = document.querySelector('.gfot');
    const photoOverlay = document.getElementById('photo-overlay');
    const cancelButton = document.getElementById('cancel-photo-change');
    const saveButton = document.getElementById('save-photo-change'); 
    const previewImage = document.getElementById('preview-image-change');
    const previewText = document.getElementById('preview-text');
    const inputFile = document.getElementById('new-profile-photo');
    const confirmPasswordChange = document.getElementById('confirm-password-change');

    //
    // Menampilkan overlay ketika tombol "Ubah Foto" diklik
    uploadButton.addEventListener('click', () => {
        photoOverlay.style.display = 'block';
    });
    // Menyembunyikan overlay jika tombol batal diklik
    cancelButton.addEventListener('click', () => {
        photoOverlay.style.display = 'none';
    });
    // Preview gambar saat dipilih
    inputFile.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            previewText.textContent = file.name;
            const reader = new FileReader();
            reader.onload = function(e) {
                previewImage.src = e.target.result;
            };
            reader.readAsDataURL(file);
        } else {
            previewText.textContent = 'Tidak ada gambar terpilih';
            previewImage.src = '';
        }
    });
    // Menyimpan foto baru
    saveButton.addEventListener('click', async (event) => {
        event.preventDefault();

        // Validasi file
        const file = inputFile.files[0];
        if (!file) {
            alert('Pilih gambar terlebih dahulu.');
            return;
        }

        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            alert('Hanya format JPEG, PNG, atau WEBP yang diperbolehkan.');
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            alert('Ukuran file maksimal 2MB.');
            return;
        }

        // UI Loading State
        saveButton.disabled = true;
        saveButton.textContent = 'Mengupload...';

        try {
            const formData = new FormData();
            formData.append('fotoprofil', file);

            const response = await fetch('/api/auth/profile/upload', {
                method: 'POST',
                body: formData
            });

            // Handle HTTP errors
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Upload gagal');
            }

            const data = await response.json();

            // Pastikan response sukses
            if (!data.success) {
                throw new Error(data.message || 'Upload gagal');
            }

            // Update gambar tanpa reload halaman
            const timestamp = new Date().getTime();
            document.querySelectorAll('.fotoprofil').forEach(img => {
                img.src = `${data.foto_path}?t=${timestamp}`; // Gunakan path dari backend
            });

            // Reset form
            photoOverlay.style.display = 'none';
            inputFile.value = '';
            previewImage.src = '';
            previewText.textContent = 'Tidak ada gambar terpilih';

            alert('Foto profil berhasil diperbarui!');
        } catch (error) {
            console.error('Upload error:', error);
            alert(`Gagal mengupload: ${error.message}`);
        } finally {
            // Reset button state
            saveButton.disabled = false;
            saveButton.textContent = 'Simpan Foto';
        }
    });
    //
    //
       // patch 3
        // Menangani perubahan kata sandi saat tombol "Simpan" diklik
    confirmPasswordChange.addEventListener('click', async () => {
        const oldPassword = document.getElementById('oldPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        // Validasi jika password baru dan konfirmasi password tidak cocok
        if (newPassword !== confirmPassword) {
            alert('Password baru dan konfirmasi password tidak cocok.');
            return;
        }

        // Kirim data password ke backend untuk diperbarui
        const response = await fetch('/api/auth/update-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                oldPassword: oldPassword,
                newPassword: newPassword
            })
        });
        const data = await response.json();
        if (data.success) {
            location.reload();
            alert('Password berhasil diperbarui.');
            passwordOverlay.style.display = 'none';
        } else {
            alert('Gagal memperbarui password.');
        }
    });
});

// patch 4
///////////////////////////////////////
// Tampilkan button hanya untuk divisi pemilik tanda tangan
document.addEventListener('DOMContentLoaded', () => {
  const userDivisi = localStorage.getItem('divisi') || sessionStorage.getItem('divisi');
  if (userDivisi === 'Peneliti' || userDivisi === 'Peneliti Validasi' || userDivisi === 'PPAT' || userDivisi === 'PPATS') {
    document.getElementById('paraf-peneliti').style.display = 'block';
  }
});

// Modal functionality
const modal = document.getElementById('parafModal');
const btn = document.getElementById('paraf-peneliti');
const span = document.getElementsByClassName('close')[0];

btn.onclick = () => modal.style.display = 'block';
span.onclick = () => modal.style.display = 'none';

// Preview image
document.getElementById('parafImage').addEventListener('change', function(e) {
  const preview = document.getElementById('parafPreview');
  if (this.files && this.files[0]) {
    const reader = new FileReader();
    reader.onload = (e) => {
      preview.src = e.target.result;
      preview.style.display = 'block';
    }
    reader.readAsDataURL(this.files[0]);
  }
});

// Handle form submission
document.getElementById('parafForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fileInput = document.getElementById('parafImage');
  const submitBtn = e.target.querySelector('button[type="submit"]');

  if (!fileInput.files[0]) {
    alert('Pilih file terlebih dahulu!');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Mengupload...';

  try {
    const formData = new FormData();
    formData.append('signature', fileInput.files[0]);

    const response = await fetch('/api/auth/update-profile-paraf', {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Upload Failed');
    if (result.success) {
      alert(result.message);
      // Perbarui preview tanda tangan jika perlu
      if (result.data.path) {
        document.getElementById('ttd-preview').src = result.data.path;
      }
      modal.style.display = 'none';
    } else {
      throw new Error(result.message);
    }

    alert('Tanda tangan berhasil disimpan!');
    modal.style.display = 'none';
  } catch (error) {
    alert(`Gagal: ${error.message}`);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Simpan Paraf';
  }
});

// Preview grayscale client-side
document.getElementById('parafImage').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const preview = document.getElementById('parafPreview');
  const canvas = document.getElementById('grayscalePreview');
  const ctx = canvas.getContext('2d');

  // Tampilkan preview asli
  preview.src = URL.createObjectURL(file);
  preview.style.display = 'block';

  // Buat preview grayscale
  const img = new Image();
  img.onload = () => {
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.filter = 'grayscale(100%)';
    ctx.drawImage(img, 0, 0);
    canvas.style.display = 'block';
  };
  img.src = URL.createObjectURL(file);
});