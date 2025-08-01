function toggleSection(sectionId) {
    const content = document.getElementById(`content-${sectionId}`);
    const icon = document.getElementById(`icon-${sectionId}`);
    
    if (content.style.display === 'none') {
        content.style.display = 'block';
        icon.textContent = '-';
    } else {
        content.style.display = 'none';
        icon.textContent = '+';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Inisialisasi elemen form
    const ppatkForm = document.getElementById('ppatkForm');
    const btnSubmit = ppatkForm.querySelector('.btn-submit');
    const btnSimpanContainer = ppatkForm.querySelector('.form-actions .btn-simpan').parentNode;
    const btnSimpan = ppatkForm.querySelector('.btn-simpan');
    const btnReset = ppatkForm.querySelector('.btn-reset');
    const hasilValidasi = document.getElementById('hasilValidasi');
    const kodeValidasiEl = document.getElementById('kodeValidasi');
    
    // State management
    let isSubmitting = false;
    let lastSubmissionTime = 0;
    let generatedValidationCode = '';
    let currentRequestId = null;

    // Sembunyikan tombol Simpan awalanya
    btnSimpanContainer.style.display = 'none';
    
    // Handler untuk generate kode validasi
    btnSubmit.addEventListener('click', function(e) {
        e.preventDefault();
        
        // Validasi form sebelum generate kode
        if (!validateForm()) {
            return;
        }
        
        // Generate kode validasi
        generatedValidationCode = generateValidationCode();
        
        // Tampilkan hasil
        kodeValidasiEl.textContent = generatedValidationCode;
        hasilValidasi.style.display = 'block';
        hasilValidasi.scrollIntoView({ behavior: 'smooth' });
        
        // Toggle button state
        btnSubmit.disabled = true;
        
        // Tampilkan tombol Simpan
        btnSimpanContainer.style.display = 'block';
    });

    // Handler untuk simpan data dengan proteksi duplikasi
    btnSimpan.addEventListener('click', async function(e) {
        e.preventDefault();
        
        // Debouncing: Minimal 3 detik antara submit
        const now = Date.now();
        if (isSubmitting || (now - lastSubmissionTime < 3000)) {
            return;
        }
        
        if (!generatedValidationCode) {
            showErrorNotification('Silahkan generate kode validasi terlebih dahulu');
            return;
        }
        
        isSubmitting = true;
        lastSubmissionTime = now;
        
        const saveBtn = e.target;
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
        saveBtn.disabled = true;
        
        try {
            // Generate unique request ID untuk idempotency
            currentRequestId = `req-${Date.now()}`;
            
            const formData = {
                nama_pemohon: ppatkForm.querySelector('#nama_pemohon').value,
                no_telepon: ppatkForm.querySelector('#no_telepon').value,
                alamat_pemohon: ppatkForm.querySelector('#alamat_pemohon').value,
                nama_wajib_pajak: ppatkForm.querySelector('#nama_wajib_pajak').value,
                alamat_wajib_pajak: ppatkForm.querySelector('#alamat_wajib_pajak').value,
                kabupaten_kota: ppatkForm.querySelector('#kabupaten_kota').value,
                kelurahan: ppatkForm.querySelector('#kelurahan').value,
                kecamatan: ppatkForm.querySelector('#kecamatan').value,
                nop: ppatkForm.querySelector('#nop').value,
                atas_nama: ppatkForm.querySelector('#atas_nama').value,
                luas_tanah: ppatkForm.querySelector('#luas_tanah').value,
                luas_bangunan: ppatkForm.querySelector('#luas_bangunan').value,
                lainnya: ppatkForm.querySelector('#lainnya').value,
                Alamatop: ppatkForm.querySelector('#Alamatop').value,
                kampungop: ppatkForm.querySelector('#kampungop').value,
                kelurahanop: ppatkForm.querySelector('#kelurahanop').value,
                kecamatanop: ppatkForm.querySelector('#kecamatanop').value,
                nomor_validasi: generatedValidationCode // Tambahkan kode validasi
            };

            // Validasi kembali sebelum kirim
            if (!validateForm()) {
                return;
            }

            console.log('Data yang akan dikirim:', formData);
            
            // Kirim dengan idempotency key
            const response = await fetch('/api/ppatk_create-permohonan-validasi', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Idempotency-Key': currentRequestId
                },
                body: JSON.stringify(formData)
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.message || 'Gagal menyimpan data');
            }

            if (result.is_duplicate) {
                showWarningNotification('Permohonan ini sudah dibuat sebelumnya');
            } else {
                showSuccessNotification('Permohonan berhasil disimpan!');
            }
            
            showSuccessMessage(result);
            resetFormState();
            
        } catch (error) {
            console.error('Error:', error);
            showErrorNotification(`Gagal menyimpan: ${error.message}`);
        } finally {
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
            isSubmitting = false;
        }
    });

    // Handler untuk reset form
    btnReset.addEventListener('click', function() {
        resetFormState();
    });

    // Fungsi validasi form
    function validateForm() {
        const requiredFields = ppatkForm.querySelectorAll('[required]');
        let isValid = true;
        
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                field.classList.add('error');
                isValid = false;
            } else {
                field.classList.remove('error');
            }
        });
        
        if (!isValid) {
            showErrorNotification('Harap lengkapi semua field yang wajib diisi');
            return false;
        }
        
        // Validasi tambahan untuk nomor telepon
        const phoneNumber = ppatkForm.querySelector('#no_telepon').value;
        if (!/^[0-9]{10,13}$/.test(phoneNumber)) {
            showErrorNotification('Nomor telepon harus 10-13 digit angka');
            return false;
        }
        
        return true;
    }

    // Fungsi tampilkan pesan sukses
    function showSuccessMessage(result) {
        // Format tanggal
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Asia/Jakarta'
        };
        const formattedDate = new Date(result.timestamp || Date.now()).toLocaleDateString('id-ID', options);
        
        // Update UI
        const successHTML = `
            <div class="result-header">
                <i class="fas fa-check-circle success-icon"></i>
                <h3>${result.is_duplicate ? 'Permohonan Ditemukan' : 'Permohonan Berhasil Disimpan'}</h3>
            </div>
            <div class="validation-details">
                <p><strong>Kode Validasi:</strong> ${result.kode_validasi || generatedValidationCode}</p>
                <p><strong>Tanggal:</strong> ${formattedDate}</p>
                <p><strong>Status:</strong> <span class="status-${result.status || 'unused'}">${
                    result.status === 'used' ? 'Used' : 'Unused'
                }</span></p>
                ${result.is_duplicate ? '<p class="duplicate-warning"><i class="fas fa-info-circle"></i> Permohonan ini sudah dibuat sebelumnya</p>' : ''}
            </div>
            <p class="result-footer">Simpan nomor validasi ini untuk keperluan verifikasi.</p>
        `;
        
        hasilValidasi.innerHTML = successHTML;
        document.getElementById('saveButtonContainer').style.display = 'none';
    }

    // Fungsi reset state form
    function resetFormState() {
        ppatkForm.reset();
        hasilValidasi.style.display = 'none';
        generatedValidationCode = '';
        currentRequestId = null;
        btnSubmit.disabled = false;
        
        // Sembunyikan tombol Simpan
        btnSimpanContainer.style.display = 'none';
        
        // Hapus class error
        ppatkForm.querySelectorAll('.error').forEach(el => {
            el.classList.remove('error');
        });
    }
});

// Fungsi untuk generate kode validasi
function generateValidationCode() {
    const part1 = Array.from({length: 7}, (_, i) => {
        if (i < 4) {
            return Math.floor(Math.random() * 10);
        } else {
            const chars = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
            return chars[Math.floor(Math.random() * chars.length)];
        }
    }).join('');
    
    const part2 = Array.from({length: 3}, () => {
        const chars = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
        return chars[Math.floor(Math.random() * chars.length)];
    }).join('');   
    
    return `${part1}-${part2}`;
}

// Fungsi-fungsi notifikasi
function showSuccessNotification(message) {
    showNotification(message, 'success');
}

function showErrorNotification(message) {
    showNotification(message, 'error');
}

function showWarningNotification(message) {
    showNotification(message, 'warning');
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 500);
    }, 5000);
}

// CSS untuk notifikasi dan status
const style = document.createElement('style');
style.textContent = `
.notification {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    border-radius: 5px;
    color: white;
    display: flex;
    align-items: center;
    gap: 10px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 1000;
    animation: slideIn 0.3s ease forwards;
}

.notification.success {
    background-color: #28a745;
}

.notification.error {
    background-color: #dc3545;
}

.notification.warning {
    background-color: #ffc107;
    color: #212529;
}

.notification i {
    font-size: 1.2em;
}

.notification.fade-out {
    opacity: 0;
    transform: translateX(100%);
    transition: opacity 0.3s ease, transform 0.3s ease;
}

@keyframes slideIn {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
}

.status-unused {
    color: #6c757d;
    font-weight: bold;
    background-color: #f8f9fa;
    padding: 3px 8px;
    border-radius: 4px;
    display: inline-block;
}

.status-used {
    color: #28a745;
    font-weight: bold;
    background-color: #e8f5e9;
    padding: 3px 8px;
    border-radius: 4px;
    display: inline-block;
}

.duplicate-warning {
    color: #856404;
    background-color: #fff3cd;
    padding: 8px;
    border-radius: 4px;
    margin-top: 10px;
}
`;
document.head.appendChild(style);
////////////////////////////////////
// Toggle Form
function toggleForm() {
    const formContainer = document.getElementById('dropdownFormContainer');
    formContainer.classList.toggle('show');
    
    // Fokus ke input pertama saat form muncul
    if (formContainer.classList.contains('show')) {
        document.getElementById('nama_pemohon').focus();
    }
}

// Event Listeners
document.getElementById('tambahButton').addEventListener('click', toggleForm);
document.getElementById('batalButton').addEventListener('click', toggleForm);

// Tutup saat klik di luar form
document.addEventListener('click', function(e) {
    const formContainer = document.getElementById('dropdownFormContainer');
    const tambahButton = document.getElementById('tambahButton');
    
    if (!formContainer.contains(e.target) && e.target !== tambahButton) {
        formContainer.classList.remove('show');
    }
});

// Form Submission
document.getElementById('tambahForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    try {
        const formData = {
            nama_pemohon: document.getElementById('nama_pemohon').value,
            no_telepon: document.getElementById('no_telepon').value
        };
        
        const response = await fetch('/api/tambah-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Data berhasil ditambahkan');
            toggleForm();
            // Refresh data atau reset form
            e.target.reset();
        } else {
            throw new Error(result.message || 'Gagal menambahkan data');
        }
    } catch (error) {
        console.error('Error:', error);
        alert(`Error: ${error.message}`);
    }
});