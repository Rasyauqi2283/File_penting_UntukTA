document.querySelector('.btn-simpan').addEventListener('click', async function(e) {
    e.preventDefault();
    
    const saveBtn = e.target;
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
    saveBtn.disabled = true;
    
    try {
        const formData = {
            // Data form utama
            nama_pemohon: document.getElementById('nama_pemohon').value,
            no_telepon: document.getElementById('no_telepon').value,
            alamat_pemohon: document.getElementById('alamat_pemohon').value,
            nama_wajib_pajak: document.getElementById('nama_wajib_pajak').value,
            alamat_wajib_pajak: document.getElementById('alamat_wajib_pajak').value,
            kabupaten_kota: document.getElementById('kabupaten_kota').value,
            kelurahan: document.getElementById('kelurahan').value,
            kecamatan: document.getElementById('kecamatan').value,
            
            // Data tambahan
            nop: document.getElementById('nop').value,
            atas_nama: document.getElementById('atas_nama').value,
            luas_tanah: document.getElementById('luas_tanah').value,
            luas_bangunan: document.getElementById('luas_bangunan').value,
            lainnya: document.getElementById('lainnya').value,
            Alamatop: document.getElementById('Alamatop').value,
            kampungop: document.getElementById('kampungop').value, // Diubah dari kampungop
            kelurahanop: document.getElementById('kelurahanop').value, // Diubah dari kelurahanop
            kecamatanop: document.getElementById('kecamatanop').value // Diubah dari kecamatanop
        };

        // Tambahkan sebelum fetch
        if (!formData.nama_pemohon || !formData.no_telepon) {
            showErrorNotification('Field wajib tidak boleh kosong');
            return;
        }
        const response = await fetch('/api/ppatk_create-permohonan-validasi', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (result.success) {
            showSuccessNotification('Permohonan berhasil disimpan!');
            
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
            const formattedDate = new Date(result.timestamp).toLocaleDateString('id-ID', options);
            
            // Update tampilan hasil
            document.getElementById('hasilValidasi').innerHTML = `
                <div class="result-header">
                    <i class="fas fa-check-circle success-icon"></i>
                    <h3>Permohonan Berhasil Disimpan</h3>
                </div>
                <div class="validation-details">
                    <p><strong>Nomor Validasi:</strong> ${result.kode_validasi}</p>
                    <p><strong>Tanggal:</strong> ${formattedDate}</p>
                    <p><strong>Status:</strong> <span class="status-${result.status || 'unused'}">${
                        result.status === 'used' ? 'Used' : 'Unused'
                    }</span></p>
                </div>
                <p class="result-footer">Simpan nomor validasi ini untuk keperluan verifikasi.</p>
            `;
            
            document.getElementById('saveButtonContainer').style.display = 'none';
            
        } else {
            throw new Error(result.message || 'Gagal menyimpan permohonan');
        }
    } catch (error) {
        console.error('Error:', error);
        showErrorNotification(`Gagal menyimpan: ${error.message}`);
    } finally {
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
});

// CSS untuk status
const style = document.createElement('style');
style.textContent = `
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
`;
document.head.appendChild(style);

// Tambahkan fungsi-fungsi notifikasi ini sebelum event listener

/**
 * Menampilkan notifikasi sukses
 * @param {string} message - Pesan yang akan ditampilkan
 */
function showSuccessNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification success';
    notification.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Hilangkan notifikasi setelah 5 detik
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 500);
    }, 5000);
}

/**
 * Menampilkan notifikasi error
 * @param {string} message - Pesan error yang akan ditampilkan
 */
function showErrorNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification error';
    notification.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Hilangkan notifikasi setelah 5 detik
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 500);
    }, 5000);
}

// Tambahkan CSS untuk notifikasi
const notificationStyle = document.createElement('style');
notificationStyle.textContent = `
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
    transform: translateX(0);
    transition: transform 0.3s ease, opacity 0.3s ease;
}

.notification.success {
    background-color: #28a745;
}

.notification.error {
    background-color: #dc3545;
}

.notification i {
    font-size: 1.2em;
}

.notification.fade-out {
    opacity: 0;
    transform: translateX(100%);
}

@keyframes slideIn {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
}

.notification {
    animation: slideIn 0.3s ease forwards;
}
`;
document.head.appendChild(notificationStyle);