//masih banyak perbaikan
/// (complete)
async function loadTableData(page = 1) {
    try {
        // Menggunakan parameter page jika ada
        const url = `http://localhost:3000/api/ppatk_get-booking-data?page=${page}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        if (data.success) {
            const tbody = document.querySelector('.data-tabel-badan');
            
            // Menghapus baris lama jika ada
            tbody.innerHTML = '';
            
            // Loop melalui data dan menambahkannya ke dalam tabel
            data.data.forEach(async (item) => {
                const row = tbody.insertRow();

                // Membuat sel untuk data
                const cellNoBooking = row.insertCell(0);
                const cellNoppbb = row.insertCell(1);
                const cellTanggalAjb = row.insertCell(2);
                const cellTahunAjb = row.insertCell(3);
                const cellNamaWajibPajak = row.insertCell(4);
                const cellNamaPemilikObjek = row.insertCell(5);
                const cellNpwp = row.insertCell(6);
                const celltrackingstats = row.insertCell(7);
                const cellkirim = row.insertCell(8);
                
                // Menambahkan data ke dalam sel
                cellNoBooking.textContent = item.nobooking;
                cellNoppbb.textContent = item.noppbb;
                
                const formattedTanggalAjb = item.tanggal;
                cellTanggalAjb.textContent = formattedTanggalAjb;
                // Menampilkan data lainnya
                cellTahunAjb.textContent = item.tahunajb;
                cellNamaWajibPajak.textContent = item.namawajibpajak;
                cellNamaPemilikObjek.textContent = item.namapemilikobjekpajak;
                cellNpwp.textContent = item.npwpwp;
                celltrackingstats.textContent = item.trackstatus;

                // [1] PEMBUATAN TOMBOL SEDERHANA
                const sendButton = document.createElement('button');
                sendButton.textContent = 'Kirim ke LTB';
                sendButton.classList.add('btn-send-to-ltb');
                sendButton.dataset.nobooking = item.nobooking;

                sendButton.onclick =  () => sendToLtb(item.nobooking);

                cellkirim.appendChild(sendButton);
                // Membuat dropdown row di bawah baris ini
                const dropdownRow = document.createElement('tr');
                const dropdownContent = document.createElement('td');
                dropdownContent.colSpan = 9;
                dropdownContent.style.display = 'none'; // Dropdown akan disembunyikan pertama kali
dropdownContent.innerHTML = `
<div class="dropdown-container">
    <div class="header-section">
        <h4>Detail No. Booking: ${item.nobooking}</h4>
    </div>
    
<div class="document-section" id="document-${item.nobooking}">
        <h5>Dokumen Wajib</h5>
        <div id="file-info-${item.nobooking}" class="file-grid">
            <!-- Akta -->
            <div class="file-upload-card" id="aktaTanahContainer-${item.nobooking}"
                ondragover="handleDragOver(event)"
                ondragleave="handleDragLeave(event)"
                ondrop="handleDrop(event, 'aktaTanahInput-${item.nobooking}')">
                <label for="aktaTanahInput-${item.nobooking}" class="file-upload-label">
                    <span class="label-text">Akta:</span>
                    <span class="file-input-wrapper">
                        <i class="fas fa-cloud-upload-alt upload-icon"></i>
                        <span class="file-input-text">Pilih File</span>
                        <input type="file" id="aktaTanahInput-${item.nobooking}" 
                            accept="application/pdf,image/jpeg,image/png" class="file-input"
                            aria-label="Upload akta tanah">
                    </span>
                    <small class="file-hint">
                        Format: PDF/JPEG/PNG (Max 5MB)
                        <span class="tooltip">
                            <i class="fas fa-info-circle"></i>
                            <span class="tooltip-text">Dokumen harus jelas dan terbaca</span>
                        </span>
                    </small>
                </label>
                <div class="file-preview" id="aktaTanahPreview-${item.nobooking}">
                    ${item.akta_tanah_path ? `
                        <div class="file-preview-item">
                            <i class="fas fa-file-pdf pdf-icon" aria-hidden="true"></i>
                            <div class="file-info">
                                <span class="file-name">${item.akta_tanah_path.split('/').pop()}</span>
                                <span class="file-size">(Uploaded)</span>
                            </div>
                            <a href="/${item.akta_tanah_path}" target="_blank" class="btn-view">
                                <i class="fas fa-eye"></i>
                            </a>
                        </div>
                    ` : ''}
                </div>
            </div>

            <!-- Sertifikat Tanah -->
            <div class="file-upload-card" id="sertifikatTanahContainer-${item.nobooking}"
                ondragover="handleDragOver(event)"
                ondragleave="handleDragLeave(event)"
                ondrop="handleDrop(event, 'sertifikatTanahInput-${item.nobooking}')">
                <label for="sertifikatTanahInput-${item.nobooking}" class="file-upload-label">
                    <span class="label-text">Sertifikat Tanah:</span>
                    <span class="file-input-wrapper">
                        <i class="fas fa-cloud-upload-alt upload-icon"></i>
                        <span class="file-input-text">Pilih File</span>
                        <input type="file" id="sertifikatTanahInput-${item.nobooking}" 
                            accept="application/pdf,image/jpeg,image/png" class="file-input"
                            aria-label="Upload sertifikat tanah">
                    </span>
                    <small class="file-hint">Format: PDF/JPEG/PNG (Max 5MB)</small>
                </label>
                <div class="file-preview" id="sertifikatTanahPreview-${item.nobooking}">
                    ${item.sertifikat_tanah_path ? `
                        <div class="file-preview-item">
                            ${item.sertifikat_tanah_path.endsWith('.pdf') ? 
                                '<i class="fas fa-file-pdf pdf-icon" aria-hidden="true"></i>' : 
                                `<img src="/${item.sertifikat_tanah_path}" class="file-thumbnail" alt="Preview">`}
                            <div class="file-info">
                                <span class="file-name">${item.sertifikat_tanah_path.split('/').pop()}</span>
                                <span class="file-size">(Uploaded)</span>
                            </div>
                            <a href="/${item.sertifikat_tanah_path}" target="_blank" class="btn-view">
                                <i class="fas fa-eye"></i>
                            </a>
                        </div>
                    ` : ''}
                </div>
            </div>

            <!-- Dokumen Pelengkap -->
            <div class="file-upload-card" id="pelengkapContainer-${item.nobooking}"
                ondragover="handleDragOver(event)"
                ondragleave="handleDragLeave(event)"
                ondrop="handleDrop(event, 'pelengkapInput-${item.nobooking}')">
                <label for="pelengkapInput-${item.nobooking}" class="file-upload-label">
                    <span class="label-text">Dokumen Pelengkap:</span>
                    <span class="file-input-wrapper">
                        <i class="fas fa-cloud-upload-alt upload-icon"></i>
                        <span class="file-input-text">Pilih File</span>
                        <input type="file" id="pelengkapInput-${item.nobooking}" 
                            accept="application/pdf,image/jpeg,image/png" class="file-input"
                            aria-label="Upload dokumen pelengkap">
                    </span>
                    <small class="file-hint">Format: PDF/JPEG/PNG (Max 5MB)</small>
                </label>
                <div class="file-preview" id="pelengkapPreview-${item.nobooking}">
                    ${item.pelengkap_path ? `
                        <div class="file-preview-item">
                            ${item.pelengkap_path.endsWith('.pdf') ? 
                                '<i class="fas fa-file-pdf pdf-icon" aria-hidden="true"></i>' : 
                                `<img src="/${item.pelengkap_path}" class="file-thumbnail" alt="Preview">`}
                            <div class="file-info">
                                <span class="file-name">${item.pelengkap_path.split('/').pop()}</span>
                                <span class="file-size">(Uploaded)</span>
                            </div>
                            <a href="/${item.pelengkap_path}" target="_blank" class="btn-view">
                                <i class="fas fa-eye"></i>
                            </a>
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>

        <div class="upload-actions">
            <button class="btn-upload" onclick="uploadFiles('${item.nobooking}')" aria-label="Upload semua dokumen">
                <i class="fas fa-upload"></i> Upload Semua Dokumen
            </button>
            <div id="uploadProgress-${item.nobooking}" class="progress-bar">
                <div class="progress-fill"></div>
            </div>
            <div id="fileStatus-${item.nobooking}" class="status-message" role="status" aria-live="polite"></div>
        </div>
    </div>

    
    <div class="address-section">
        <h5>Data Alamat</h5>
        <div class="address-grid">
            ${renderAddressField(item, 'alamat_pemohon', 'Alamat Pemohon')}
            ${renderAddressField(item, 'kampungop', 'Kampung')}
            ${renderAddressField(item, 'kelurahanop', 'Kelurahan')}
            ${renderAddressField(item, 'kecamatanopj', 'Kecamatan')} <!--bagian ini kecamatanop perlu diganti menjadi kecamatanopj, diganti pada bagian endpoint database dan segala macam permohonan validasi-->
        </div>
    </div>
    
    <div class="action-buttons">
        <h5>Dokumen Permohonan</h5>
        <div class="form-actions">
            <button class="btn-form" onclick="gotoform('${item.nobooking}')">
                <i class="fas fa-file-alt"></i> Isi Form Permohonan
            </button>
            <button class="btn-view" data-nobooking="${item.nobooking}" onclick="viewPDF('${item.nobooking}')">
                <i class="fas fa-file-pdf"></i> View PDF
            </button>
        </div>
    </div>
</div>
`;

function renderAddressField(item, field, label) {
    return `
        <div class="address-field ${!item[field] ? 'missing' : ''}">
            <span class="address-label">${label}:</span>
            <span class="address-value">${item[field] || 'Belum diisi'}</span>
        </div>
    `;
}

    dropdownRow.appendChild(dropdownContent);

        // Menambahkan event listener untuk klik pada baris tabel
        row.addEventListener('click', function() {
            window.lastClickedRow = row;
            // upload ttd
            console.log('clicked:', item.nobooking); 
            enableUploadTTD(item.nobooking);
            // view documen
            enableViewDocumentButton(item.nobooking);
            //
            selectedRow = row; // Simpan baris yang dipilih
            row.style.backgroundColor = '#e0e0e0';
            // Menyimpan nobooking yang dipilih
            const selectedNoBooking = item.nobooking; 
            if (validateNoBooking(selectedNoBooking)) { // Validasi nobooking yang dipilih
                console.log(`Selected No Booking: ${selectedNoBooking}`);
                // Toggle tampilan dropdown
                const isVisible = dropdownContent.style.display === 'table-cell';
                dropdownContent.style.display = isVisible ? 'none' : 'table-cell';
                
                // Geser baris-baris berikutnya jika dropdown ditampilkan
                if (!isVisible) {
                    let nextRow = row.nextElementSibling;
                    while (nextRow) {
                        nextRow.style.marginTop = '20px'; // Memberikan ruang antara baris
                        nextRow = nextRow.nextElementSibling;
                    }
                }
            } else {
                toggleSignatureButton(false);
                alert('No Booking yang dipilih tidak valid!');
            }
        });

        // Menambahkan baris dropdown ke dalam tabel
                tbody.appendChild(dropdownRow);
                
                // Load and display uploaded documents for this booking
                try {
                    const uploadedDocs = await loadUploadedDocuments(item.nobooking);
                    if (uploadedDocs) {
                        displayUploadedDocuments(item.nobooking, uploadedDocs);
                    }
                } catch (error) {
                    console.error('Error loading uploaded documents for booking:', item.nobooking, error);
                }
            });

            // Menampilkan tombol pagination
            displayPagination(data.pagination.page, data.totalPages, true);
        }
    } catch (error) {
        console.error('Error loading table data:', error);
    }
}
////////////////////////                        /////////////////////////////////////////
function displayPagination(currentPage, totalPages) {
    const paginationContainer = document.querySelector('.list-button');
    paginationContainer.innerHTML = '';  // Clear existing pagination buttons

    // Previous Button
    const prevButton = document.createElement('button');
    prevButton.innerHTML = 'Prev';
    prevButton.disabled = currentPage === 1;  // Disable if it's the first page
    prevButton.onclick = () => loadTableData(currentPage - 1);
    paginationContainer.appendChild(prevButton);

    // Page Numbers
    for (let i = 1; i <= totalPages; i++) {
        const pageButton = document.createElement('button');
        pageButton.innerHTML = i;
        pageButton.disabled = i === currentPage;  // Disable current page button
        pageButton.onclick = () => loadTableData(i);
        paginationContainer.appendChild(pageButton);
    }

    // Next Button
    const nextButton = document.createElement('button');
    nextButton.innerHTML = 'Next';
    nextButton.disabled = currentPage === totalPages;  // Disable if it's the last page
    nextButton.onclick = () => loadTableData(currentPage + 1);
    paginationContainer.appendChild(nextButton);
}
////////////////////                ////////////////////////////////
function deleteSelectedRow() {
    if (selectedRow) {
        const isConfirmed = confirm('Apakah Anda yakin ingin menghapus data ini?');

        if (isConfirmed) {
            const nobooking = selectedRow.cells[0].textContent;
            fetch(`http://localhost:3000/api/ppatk_update-trackstatus/${nobooking}`, {
                method: 'PUT'
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    selectedRow.remove(); // Menghapus baris yang dipilih dari tampilan (DOM)
                    selectedRow = null; // Reset selectedRow setelah dihapus
                    console.log('Baris data statusnya diubah menjadi Dihapus dan dihapus dari tampilan');
                } else {
                    alert('Gagal mengubah status data menjadi Dihapus');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Terjadi kesalahan saat mengubah status data');
            });
        } else {
            console.log('Penghapusan dibatalkan');
        }
    } else {
        alert('Silakan pilih baris yang ingin dihapus terlebih dahulu.');
    }
}
// Menambahkan event listener pada tombol "Hapus"
document.querySelector('.btn-action.hapus').addEventListener('click', deleteSelectedRow);
function validateNoBooking(nobooking) {
    console.log(`Sementara validasi dinonaktifkan. NoBooking: ${nobooking}`);
    return true; // Disable validasi sementara untuk debugging
}

///////////////////     //////      ////////////////////////////////
function enableViewDocumentButton(nobooking) {
    // Temukan tombol "View Dokumen" dan aktifkan
    const viewPdfButton = document.querySelector('.btn-action.viewpdf');
    
    // Jika tombol ditemukan, aktifkan dan set onclick dengan nobooking yang dipilih
    if (viewPdfButton) {
        viewPdfButton.disabled = false; // Pastikan tombol bisa diklik
        viewPdfButton.onclick = () => viewDocument(nobooking); // Pasangkan nobooking yang dipilih
    }
}
async function viewDocument(nobooking) {
    // Pastikan nobooking tersedia
    if (!nobooking) {
        alert('No Booking tidak valid!');
        return;
    }
    // Ambil userid dan nama dari session atau localStorage
    const userid = sessionStorage.getItem('userid') || localStorage.getItem('userid');
    const nama = sessionStorage.getItem('nama') || localStorage.getItem('nama');

    if (!userid || !nama) {
        alert('User ID atau Nama tidak ditemukan.');
        return;
    }

    // Buat URL untuk mengakses PDF
    const pdfUrl = `http://localhost:3000/api/ppatk_generate-pdf-badan/${encodeURIComponent(nobooking)}`;
    
    // Membuka PDF di jendela baru
    window.open(pdfUrl, '_blank');
}
async function viewPDF(nobooking) {
    console.log("nobooking:", nobooking)
    const viewBtn = document.querySelector(`button[data-nobooking="${nobooking}"]`);
    const originalText = viewBtn ? viewBtn.textContent : ''; // Cek jika viewBtn ditemukan   
    if (!viewBtn) {
        console.error('Tombol tidak ditemukan!');
        return;
    }
    try {
        viewBtn.textContent = 'Loading...';
        viewBtn.disabled = true;
        const response = await fetch(`/api/ppatk/generate-pdf-mohon-validasi/${nobooking}`);
        if (!response.ok) {
            throw new Error(response.statusText || 'Gagal mengambil PDF');
        }
        const blob = await response.blob();
        const pdfUrl = URL.createObjectURL(blob);
        const newWindow = window.open(pdfUrl, '_blank');
        
        // Jika popup diblokir, beri alternatif
        if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
            const a = document.createElement('a');
            a.href = pdfUrl;
            a.target = '_blank';
            a.download = `document-${nobooking}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    } catch (error) {
        console.error('Error:', error);
        alert(`Gagal membuka dokumen: ${error.message}`);
    } finally {
        if (viewBtn) {
            viewBtn.textContent = originalText;
            viewBtn.disabled = false;
        }
    }
}
////
function downloadPDF(url, filename, timeout = 30000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error('Timeout: Dokumen terlalu lama diproses'));
        }, timeout);

        fetch(url)
            .then(response => {
                if (!response.ok) throw new Error(response.statusText);
                return response.blob();
            })
            .then(blob => {
                clearTimeout(timer);
                const blobUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = blobUrl;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(blobUrl);
                    resolve();
                }, 100);
            })
            .catch(error => {
                clearTimeout(timer);
                reject(error);
            });
    });
}
//////////////////////////////          TANDA TANGAN PPATK DAN WAJIB PAJAK          ////////////////////////////////////////////////////////////////////////////////////
// Fungsi utama yang tetap sama
function enableUploadTTD(nobooking) {
    sessionStorage.setItem('selectedNoBooking', nobooking);
    const uploadTTDButton = document.getElementById('showSignatureModal');
    if (uploadTTDButton) {
        uploadTTDButton.onclick = () => showSignatureForm(nobooking);
    }
}

// Fungsi yang diperbarui untuk upload tanda tangan
async function processSignature(file) {
    return new Promise((resolve, reject) => {
        try {
            // Validasi file terlebih dahulu
            if (!file) {
                reject(new Error('File tidak ditemukan'));
                return;
            }

            const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
            const maxSize = 2 * 1024 * 1024; // 2MB

            if (!validTypes.includes(file.type)) {
                reject(new Error('Format file tidak didukung. Gunakan JPG atau PNG.'));
                return;
            }

            if (file.size > maxSize) {
                reject(new Error('Ukuran file terlalu besar. Maksimal 2MB.'));
                return;
            }

            // Jika file sudah dalam format yang benar, gunakan langsung
            if (file.type === 'image/png') {
                resolve(file);
                return;
            }

            // Konversi ke PNG jika diperlukan
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    try {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0);
                        
                        canvas.toBlob((blob) => {
                            if (blob) {
                                resolve(blob);
                            } else {
                                reject(new Error('Gagal memproses gambar'));
                            }
                        }, 'image/png', 0.9);
                    } catch (error) {
                        reject(new Error('Gagal memproses gambar: ' + error.message));
                    }
                };
                img.onerror = () => {
                    reject(new Error('Gagal memuat gambar'));
                };
                img.src = e.target.result;
            };
            reader.onerror = () => {
                reject(new Error('Gagal membaca file'));
            };
            reader.readAsDataURL(file);
        } catch (error) {
            reject(new Error('Error memproses file: ' + error.message));
        }
    });
}

// Fungsi yang diperbarui
function showSignatureForm(nobooking) {
    if (!nobooking) {
        showAlert('error', 'No Booking tidak valid!');
        return;
    }
    
    const modal = document.getElementById('signatureModal');
    if (!modal) {
        showAlert('error', 'Modal tidak ditemukan!');
        return;
    }
    
    modal.style.display = 'flex';
    setupSignatureForm(nobooking);
}

function setupSignatureForm(nobooking) {
    const modal = document.getElementById('signatureModal');
    const closeBtn = document.getElementById('closeModalBtn');
    const cancelBtn = document.getElementById('cancelUploadBtn');
    const uploadBtn = document.getElementById('uploadttd');
    
    if (!modal || !closeBtn || !cancelBtn || !uploadBtn) {
        showAlert('error', 'Elemen modal tidak lengkap!');
        return;
    }
    
    // Hapus event listener lama jika ada
    closeBtn.removeEventListener('click', closeModal);
    cancelBtn.removeEventListener('click', closeModal);
    uploadBtn.removeEventListener('click', handleUpload);
    modal.removeEventListener('click', handleModalClick);
    
    // Tambahkan event listener baru
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    uploadBtn.addEventListener('click', handleUpload);
    modal.addEventListener('click', handleModalClick);
    
    // Setup preview
    setupFilePreview('signature1', 'preview1', 'previewImage1');
    setupFilePreview('signature2', 'preview2', 'previewImage2');
    
    async function handleUpload() {
        try {
            console.log('Memulai proses upload...');
            
            const signature1Input = document.getElementById('signature1');
            const signature2Input = document.getElementById('signature2');
            
            if (!signature1Input || !signature2Input) {
                showAlert('error', 'Input file tidak ditemukan!');
                return;
            }
            
            if (!signature2Input.files.length) {
                showAlert('error', 'Harap upload tanda tangan PPATK!');
                return;
            }
            
            const signature1 = signature1Input.files[0];
            const signature2 = signature2Input.files[0];
            
            // Validasi file
            if (!validateFile(signature2)) return;
            if (signature1 && !validateFile(signature1)) return;
            
            toggleLoading(true);
            showAlert('info', 'Memproses file...');
            
            // Proses file dengan error handling yang lebih baik
            let processedSig1 = null;
            let processedSig2 = null;
            
            try {
                if (signature1) {
                    processedSig1 = await processSignature(signature1);
                }
                processedSig2 = await processSignature(signature2);
            } catch (error) {
                console.error('Error processing files:', error);
                showAlert('error', 'Gagal memproses file: ' + error.message);
                toggleLoading(false);
                return;
            }

            // Kirim ke backend
            await uploadSignatures(nobooking, processedSig1, processedSig2);
        } catch (error) {
            console.error('Upload error:', error);
            showAlert('error', error.message || 'Terjadi kesalahan saat upload');
        } finally {
            toggleLoading(false);
        }
    }
    
    function handleModalClick(e) {
        if (e.target === modal) {
            closeModal();
        }
    }
}

function validateFile(file) {
    if (!file) {
        showAlert('error', 'File tidak ditemukan!');
        return false;
    }
    
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const maxSize = 2 * 1024 * 1024; // 2MB
    
    if (!validTypes.includes(file.type)) {
        showAlert('error', 'Format file tidak didukung. Gunakan JPG atau PNG!');
        return false;
    }
    
    if (file.size > maxSize) {
        showAlert('error', 'Ukuran file terlalu besar. Maksimal 2MB!');
        return false;
    }
    
    return true;
}

// Fungsi setup preview yang diperbarui
function setupFilePreview(inputId, previewContainerId, previewImageId) {
    const input = document.getElementById(inputId);
    const previewContainer = document.getElementById(previewContainerId);
    const previewImage = document.getElementById(previewImageId);
    
    if (!input || !previewContainer || !previewImage) {
        console.error('Preview elements not found:', { inputId, previewContainerId, previewImageId });
        return;
    }
    
    const clearBtn = previewContainer.querySelector('.clear-btn');
    
    // Hapus event listener lama
    input.removeEventListener('change', handleFileChange);
    if (clearBtn) {
        clearBtn.removeEventListener('click', handleClear);
    }
    
    // Tambahkan event listener baru
    input.addEventListener('change', handleFileChange);
    if (clearBtn) {
        clearBtn.addEventListener('click', handleClear);
    }
    
    function handleFileChange(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        if (!validateFile(file)) {
            input.value = '';
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            previewImage.src = e.target.result;
            previewContainer.style.display = 'block';
        };
        reader.onerror = () => {
            showAlert('error', 'Gagal membaca file!');
            input.value = '';
        };
        reader.readAsDataURL(file);
    }
    
    function handleClear() {
        input.value = '';
        previewContainer.style.display = 'none';
    }
}

// Fungsi upload yang diperbarui
async function uploadSignatures(nobooking, signature1Blob, signature2Blob) {
    try {
        console.log('Menyiapkan data untuk upload...');
        
        const formData = new FormData();
        formData.append('nobooking', nobooking);
        
        if (signature2Blob) {
            formData.append('signature2', signature2Blob, 'signature2.png');
        } else {
            throw new Error('Tanda tangan PPATK wajib diupload!');
        }
        
        if (signature1Blob) {
            formData.append('signature1', signature1Blob, 'signature1.png');
        }
        
        console.log('Mengirim request ke server...');
        
        const response = await fetch('http://localhost:3000/api/ppatk_upload-signatures', {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });
        
        console.log('Response status:', response.status);
        
        const data = await response.json();
        console.log('Response data:', data);
        
        if (!response.ok) {
            throw new Error(data.message || 'Gagal mengupload tanda tangan');
        }
        
        showAlert('success', 'Tanda tangan berhasil diupload!');
        closeModal();
        
        if (typeof refreshData === 'function') {
            refreshData();
        }
    } catch (error) {
        console.error('Upload Error:', error);
        showAlert('error', error.message || 'Terjadi kesalahan saat mengupload tanda tangan');
        throw error;
    }
}

function closeModal() {
    const modal = document.getElementById('signatureModal');
    if (modal) {
        modal.style.display = 'none';
        resetSignatureForm();
    }
}

function resetSignatureForm() {
    const signature1 = document.getElementById('signature1');
    const signature2 = document.getElementById('signature2');
    const preview1 = document.getElementById('preview1');
    const preview2 = document.getElementById('preview2');
    
    if (signature1) signature1.value = '';
    if (signature2) signature2.value = '';
    if (preview1) preview1.style.display = 'none';
    if (preview2) preview2.style.display = 'none';
}

function toggleLoading(show) {
    const btn = document.getElementById('uploadttd');
    const loadingIndicator = document.getElementById('modalLoadingIndicator');
    
    if (btn) {
        btn.disabled = show;
    }
    
    if (loadingIndicator) {
        loadingIndicator.style.display = show ? 'inline-block' : 'none';
    }
}

function showAlert(type, message) {
    // Buat alert element
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        max-width: 400px;
        word-wrap: break-word;
        animation: slideIn 0.3s ease;
    `;
    
    // Set background color berdasarkan type
    const colors = {
        success: '#28a745',
        error: '#dc3545',
        warning: '#ffc107',
        info: '#17a2b8'
    };
    
    alertDiv.style.backgroundColor = colors[type] || colors.info;
    alertDiv.textContent = message;
    
    // Tambahkan ke body
    document.body.appendChild(alertDiv);
    
    // Auto remove setelah 5 detik
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (alertDiv.parentNode) {
                    alertDiv.remove();
                }
            }, 300);
        }
    }, 5000);
    
    // Tambahkan CSS untuk animasi
    if (!document.getElementById('alert-styles')) {
        const style = document.createElement('style');
        style.id = 'alert-styles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
}
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
// ======================
        // GLOBAL CONFIGURATION
        // ======================
        const config = {
            maxFileSize: 5 * 1024 * 1024, // 5MB
            allowedFileTypes: ['application/pdf', 'image/jpeg', 'image/png'],
            apiEndpoint: '/api/ppatk_upload-input_validasisspd'
        };

        function initializeFileUploads() {
            document.querySelectorAll('.document-section').forEach(section => {
                const nobooking = section.id.replace('document-', '');
                if (!nobooking) return;

                // Setup event listeners for all file inputs
                initFileInputs(nobooking);
            });
        }
        function initFileInputs(nobooking) {
            const fileInputs = [
                { id: `aktaTanahInput-${nobooking}`, previewId: `aktaTanahPreview-${nobooking}` },
                { id: `sertifikatTanahInput-${nobooking}`, previewId: `sertifikatTanahPreview-${nobooking}` },
                { id: `pelengkapInput-${nobooking}`, previewId: `pelengkapPreview-${nobooking}` }
            ];

            fileInputs.forEach(({ id, previewId }) => {
                const input = document.getElementById(id);
                if (input) {
                    input.addEventListener('change', function() {
                        handleFilePreview(this, previewId, nobooking);
                    });
                }
            });
        }
        function handleFilePreview(input, previewId, nobooking) {
            const previewElement = document.getElementById(previewId);
            if (!previewElement) return;

            previewElement.innerHTML = '';
            const file = input.files?.[0];
            if (!file) return;

            // Validate file
            if (!validateFile(file, nobooking)) {
                input.value = '';
                return;
            }

            // Create preview
            createFilePreview(file, previewElement);
            setupFileRemoval(input, previewElement);
        }
        function validateFile(file, nobooking) {
            // Size validation
            if (file.size > config.maxFileSize) {
                showStatus(`File ${file.name} terlalu besar (maksimal 5MB)!`, 'error', nobooking);
                return false;
            }

            // Type validation
            if (!config.allowedFileTypes.includes(file.type)) {
                showStatus(`File ${file.name} harus berupa PDF, JPEG, atau PNG!`, 'error', nobooking);
                return false;
            }

            return true;
        }
        function createFilePreview(file, previewId) {
            const previewElement = document.getElementById(previewId);
            const container = document.createElement('div');
            container.className = 'file-preview-item';

            if (file.type === 'application/pdf') {
                container.innerHTML = `
                    <i class="fas fa-file-pdf pdf-icon" aria-hidden="true"></i>
                    <div class="file-info">
                        <span class="file-name">${file.name}</span>
                        <span class="file-size">(${(file.size/1024/1024).toFixed(2)} MB)</span>
                    </div>
                `;
            } else if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    container.innerHTML = `
                        <img src="${e.target.result}" class="file-thumbnail" alt="Preview ${file.name}">
                        <div class="file-info">
                            <span class="file-name">${file.name}</span>
                            <span class="file-size">(${(file.size/1024/1024).toFixed(2)} MB)</span>
                        </div>
                    `;
                };
                reader.readAsDataURL(file);
            }

            previewElement.appendChild(container);
        }
        function setupFileRemoval(input, previewId) {
            const previewElement = document.getElementById(previewId);
            const removeBtn = document.createElement('button');
            removeBtn.className = 'btn-remove';
            removeBtn.innerHTML = '<i class="fas fa-times" aria-hidden="true"></i>';
            removeBtn.setAttribute('aria-label', 'Hapus file');
            removeBtn.onclick = () => {
                input.value = '';
                previewElement.innerHTML = '';
            };

            previewElement.querySelector('.file-preview-item')?.appendChild(removeBtn);
        }
        async function uploadFiles(selectedNoBooking) {
            // Confirm before upload
            if (!confirm('Anda yakin ingin mengupload dokumen?')) {
                return;
            }

            const fileInputs = {
                aktaTanah: document.getElementById(`aktaTanahInput-${selectedNoBooking}`),
                sertifikatTanah: document.getElementById(`sertifikatTanahInput-${selectedNoBooking}`),
                pelengkap: document.getElementById(`pelengkapInput-${selectedNoBooking}`)
            };

            const fileStatus = document.getElementById(`fileStatus-${selectedNoBooking}`);
            const progressBar = document.getElementById(`uploadProgress-${selectedNoBooking}`);
            const btnUpload = document.querySelector(`button[onclick="uploadFiles('${selectedNoBooking}')"]`);

            // Validate required files
            for (const [type, input] of Object.entries(fileInputs)) {
                if (!input.files[0] && !document.querySelector(`#${type}Container-${selectedNoBooking} .file-info-uploaded`)) {
                    showStatus(`File ${type.replace(/([A-Z])/g, ' $1')} wajib diunggah!`, 'error', selectedNoBooking);
                    return;
                }
            }

            // Prepare form data
            const formData = new FormData();
            formData.append('nobooking', selectedNoBooking);

            for (const [type, input] of Object.entries(fileInputs)) {
                if (input.files[0]) {
                    formData.append(type, input.files[0]);
                }
            }

            try {
                // UI updates
                btnUpload.disabled = true;
                btnUpload.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengupload...';
                progressBar.style.display = 'block';
                showStatus("Mengupload dokumen...", 'info', selectedNoBooking);

                // Upload with progress
                const xhr = new XMLHttpRequest();
                xhr.upload.onprogress = (e) => {
                    const percent = Math.round((e.loaded / e.total) * 100);
                    document.querySelector(`#uploadProgress-${selectedNoBooking} .progress-fill`).style.width = `${percent}%`;
                };

                const response = await fetch(config.apiEndpoint, {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();

                if (result.success) {
                    showStatus("Dokumen berhasil diupload!", 'success', selectedNoBooking);
                    updateDocumentDisplay(selectedNoBooking, result.data);
                    resetFileInputs(selectedNoBooking);
                    location.reload();
                } else {
                    showStatus(result.message || "Gagal mengupload dokumen", 'error', selectedNoBooking);
                }
            } catch (error) {
                console.error('Upload error:', error);
                showStatus("Terjadi kesalahan saat mengupload. Silakan coba lagi.", 'error', selectedNoBooking);
            } finally {
                btnUpload.disabled = false;
                btnUpload.innerHTML = '<i class="fas fa-upload"></i> Upload Semua Dokumen';
                setTimeout(() => {
                    progressBar.style.display = 'none';
                    document.querySelector(`#uploadProgress-${selectedNoBooking} .progress-fill`).style.width = '0%';
                }, 1000);
            }
        }
        function updateDocumentDisplay(nobooking, data) {
            // Helper function to create uploaded file display
            const createUploadedFileDisplay = (type, path) => {
                const container = document.getElementById(`${type}Container-${nobooking}`);
                if (!container) return;

                container.innerHTML = `
                    <label>${type === 'aktaTanah' ? 'Akta Tanah' : type === 'sertifikatTanah' ? 'Sertifikat Tanah' : 'Dokumen Pelengkap'}:</label>
                    <div class="file-info-uploaded">
                        <span class="file-name">${path.split('/').pop()}</span>
                        <a href="/${path}" target="_blank" class="btn-view" aria-label="Lihat dokumen">
                            <i class="fas fa-eye"></i> Lihat
                        </a>
                    </div>
                    <button class="btn-replace" onclick="replaceFile('${type}', '${nobooking}')" aria-label="Ganti file">
                        <i class="fas fa-sync-alt"></i> Ganti File
                    </button>
                    <input type="file" id="${type}Input-${nobooking}" 
                        accept="application/pdf,image/jpeg,image/png" class="file-input hidden">
                    <div class="file-preview" id="${type}Preview-${nobooking}"></div>
                `;

                // Reinitialize event listeners
                const input = document.getElementById(`${type}Input-${nobooking}`);
                if (input) {
                    input.addEventListener('change', function() {
                        handleFilePreview(this, `${type}Preview-${nobooking}`, nobooking);
                    });
                }
            };

            // Update each file type if available
            if (data.akta_tanah_path) createUploadedFileDisplay('aktaTanah', data.akta_tanah_path);
            if (data.sertifikat_tanah_path) createUploadedFileDisplay('sertifikatTanah', data.sertifikat_tanah_path);
            if (data.pelengkap_path) createUploadedFileDisplay('pelengkap', data.pelengkap_path);
        }
        function replaceFile(type, nobooking) {
            const input = document.getElementById(`${type}Input-${nobooking}`);
            if (input) input.click();
        }
        function resetFileInputs(nobooking) {
            const inputs = [
                `aktaTanahInput-${nobooking}`,
                `sertifikatTanahInput-${nobooking}`,
                `pelengkapInput-${nobooking}`
            ];

            inputs.forEach(id => {
                const input = document.getElementById(id);
                if (input) input.value = '';
            });
        }

        // ======================
        // DRAG & DROP HANDLERS
        // ======================

        function handleDragOver(e) {
            e.preventDefault();
            e.stopPropagation();
            e.currentTarget.classList.add('dragover');
        }

        function handleDragLeave(e) {
            e.preventDefault();
            e.stopPropagation();
            e.currentTarget.classList.remove('dragover');
        }

        function handleDrop(e, inputId) {
            e.preventDefault();
            e.stopPropagation();
            e.currentTarget.classList.remove('dragover');

            const input = document.getElementById(inputId);
            if (e.dataTransfer.files.length) {
                input.files = e.dataTransfer.files;
                const event = new Event('change');
                input.dispatchEvent(event);
            }
        }

        // ======================
        // UTILITY FUNCTIONS
        // ======================

        /**
         * Show status message
         */
        function showStatus(message, type, nobooking) {
            const statusEl = document.getElementById(`fileStatus-${nobooking}`);
            if (!statusEl) return;

            statusEl.textContent = message;
            statusEl.style.color = 
                type === 'error' ? 'var(--danger)' :
                type === 'success' ? 'var(--success)' : 'var(--primary)';

            statusEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

            // Auto-hide for non-error messages
            if (type !== 'error') {
                setTimeout(() => {
                    if (statusEl.textContent === message) {
                        statusEl.textContent = '';
                    }
                }, 5000);
            }
        }

        // ======================
        // INITIALIZATION
        // ======================

        document.addEventListener('DOMContentLoaded', initializeFileUploads);
/////////////      FUNGSI VALIDASI SEBELUM PENGIRIMAN         ///////////////////////
function validateBeforeSend(nobooking) {
    const row = findTableRow(nobooking);
    if (!row) return false;

    // Cache validation config
    const validationConfig = window.validationConfig || 
          (window.validationConfig = getValidationConfig());
    
    // Parallel validation jika memungkinkan
    const validationPromises = Object.entries(validationConfig).map(([key, validator]) => 
        validator.validate(row)
    );
    
    return Promise.all(validationPromises)
        .then(results => results.every(Boolean))
        .catch(() => false);
}

// Helper functions
function escapeForSelector(value) {
    // Simplified escape for our specific case (handles only what we need)
    return value.replace(/[!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~]/g, '\\$&');
}

function findTableRow(nobooking) {
    if (!nobooking) return null;
    
    // 1. Normalisasi input (tanpa CSS.escape)
    const cleanNoBooking = String(nobooking).trim();
    
    // 2. Cari dengan selector aman tanpa escaping problem
    // Gunakan selector attribute exact match
    const selector = `tr[data-nobooking="${cleanNoBooking.replace(/"/g, '\\"')}"]`;
    
    try {
        // 3. Coba langsung dengan querySelector
        const row = document.querySelector(selector);
        if (row) return row;
        
        // 4. Fallback: Cari manual jika selector gagal
        const rows = document.querySelectorAll('tr[data-nobooking]');
        for (const row of rows) {
            if (row.dataset.nobooking === cleanNoBooking) {
                return row;
            }
        }
        
        // 5. Log debug jika tidak ditemukan
        console.debug('Available rows:', 
            Array.from(rows).map(r => r.dataset.nobooking));
        return null;
        
    } catch (e) {
        console.error('Selector error:', e);
        return null;
    }
}
//
function getValidationConfig() {
    return {
        dokumen: [
            { 
                selector: '[data-field="akta_tanah_path"]', 
                label: "Akta Tanah",
                validate: (value) => !value || value === 'NULL'
            },
            { 
                selector: '[data-field="sertifikat_tanah_path"]', 
                label: "Sertifikat Tanah",
                validate: (value) => !value || value === 'NULL'
            },
            { 
                selector: '[data-field="pelengkap_path"]', 
                label: "Dokumen Pelengkap",
                validate: (value) => !value || value === 'NULL'
            }
        ],
        alamat: [
            { 
                selector: '[data-field="alamat_pemohon"]', 
                label: "Alamat Pemohon",
                validate: (value) => !value || value === 'NULL'
            },
            { 
                selector: '[data-field="kampungop"]', 
                label: "Kampung",
                validate: (value) => !value || value === 'NULL'
            },
            { 
                selector: '[data-field="kelurahanop"]', 
                label: "Kelurahan",
                validate: (value) => !value || value === 'NULL'
            },
            { 
                selector: '[data-field="kecamatanopj"]', 
                label: "Kecamatan",
                validate: (value) => !value || value === 'NULL'
            }
        ]
    };
}

function performValidations(row, config) {
    const results = {
        dokumen: { missing: [], elements: [] },
        alamat: { missing: [], elements: [] }
    };

    Object.entries(config).forEach(([category, fields]) => {
        fields.forEach(({ selector, label, validate }) => {
            const element = row.querySelector(selector);
            const value = element?.textContent.trim() || '';
            
            if (validate(value)) {
                results[category].missing.push(label);
                results[category].elements.push(element);
            }
        });
    });

    return results;
}

function handleValidationResults(results) {
    const { dokumen, alamat } = results;
    let isValid = true;
    let errorMessage = '';

    if (dokumen.missing.length > 0) {
        errorMessage += `Dokumen wajib belum lengkap:\n• ${dokumen.missing.join("\n• ")}\n\n`;
        isValid = false;
        
        // Highlight missing document fields
        dokumen.elements.forEach(el => {
            if (el) el.classList.add('missing-field');
        });
    }

    if (alamat.missing.length > 0) {
        errorMessage += `Data alamat belum lengkap:\n• ${alamat.missing.join("\n• ")}`;
        isValid = false;
        
        // Highlight missing address fields
        alamat.elements.forEach(el => {
            if (el) el.classList.add('missing-field');
        });
    }

    if (!isValid) {
        showValidationAlert(errorMessage);
    }

    return isValid;
}

function showValidationAlert(message) {
    // Create more user-friendly alert
    const alertBox = document.createElement('div');
    alertBox.className = 'validation-alert';
    alertBox.innerHTML = `
        <h4>Data Belum Lengkap</h4>
        <div class="alert-content">${message.replace(/\n/g, '<br>')}</div>
        <button onclick="this.parentElement.remove()">OK</button>
    `;
    document.body.appendChild(alertBox);
}


///////////////
// Helper functions
function checkDataCompleteness(item) {
    const requiredDocs = ['akta_tanah_path', 'sertifikat_tanah_path', 'pelengkap_path'];
    const requiredAddressFields = ['alamat_pemohon', 'kampungop', 'kelurahanop', 'kecamatanopj'];
    
    const hasAllDocs = requiredDocs.every(doc => item[doc]);
    const hasCompleteAddress = requiredAddressFields.every(field => item[field]);
    
    return hasAllDocs && hasCompleteAddress;
}
function renderFileSection(item, fieldName, label) {
    if (item[fieldName]) {
        return `
            <div class="file-item">
                <span>${label}: ${item[fieldName].split('/').pop()}</span>
                <a href="/${item[fieldName]}" target="_blank" class="view-btn">
                    <i class="fas fa-eye"></i> View
                </a>
            </div>
        `;
    } else {
        return `
            <div class="file-upload missing-file">
                <label for="${fieldName}Input-${item.nobooking}">Pilih ${label}:</label>
                <input type="file" id="${fieldName}Input-${item.nobooking}" 
                       name="${fieldName}Input" accept="application/pdf,image/*">
            </div>
        `;
    }
}
///////////////
// Fungsi untuk mengirim data ke LTB (complete)
async function sendToLtb(nobooking) {
    
    try {
        const response = await fetch('http://localhost:3000/api/ppatk_ltb-process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nobooking: nobooking,
                trackstatus: 'Diolah',
                userid: sessionStorage.getItem('userid') || localStorage.getItem('userid'),
                nama: sessionStorage.getItem('nama') || localStorage.getItem('nama')
            })
        });

        const result = await response.json();
        
        if (result.success) {
            alert(`Sukses! No Registrasi: ${result.no_registrasi}`);
            location.reload(); // Lebih reliable daripada loadTableData()
        } else {
            alert(result.message || 'Gagal mengirim data');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Terjadi kesalahan jaringan');
    }
}
///////////////////         END             //////////////////////////////
// Panggil fungsi saat halaman dimuat
window.onload = loadTableData;
//////////////////////////////////////                  //////////////////////////////////////////
// Fungsi untuk navigasi ke halaman form dengan data dari database
async function gotoform(nobooking) {
    console.log(`[DEBUG] Starting gotoform function with nobooking: ${nobooking}`);
    
    try {
        console.log('[DEBUG] Attempting to open new window');
        const newWindow = window.open('', '_blank');
        
        if (!newWindow) {
            console.error('[ERROR] Failed to open new window (might be blocked by popup blocker)');
            throw new Error('Failed to open new window. Please allow popups for this site.');
        }
        console.log('[DEBUG] New window opened successfully');

        // Buka halaman baru
        console.log('[DEBUG] Preparing user input data');
        const userInput = {
            alamat_pemohon: "",
            kampungop: "",
            kelurahanop: "",
            kecamatanopj: ""
        };
        console.log('[DEBUG] User input prepared:', userInput);

        console.log('[DEBUG] Attempting to fetch data from database');
        const formData = await fetchDataFromDatabase(nobooking, userInput);
        console.log('[DEBUG] Data fetched successfully:', formData);

        console.log('[DEBUG] Starting to generate HTML content');
        const htmlContent = `
            <!DOCTYPE html>
            <html lang="id">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Formulir Validasi PPATK - ${nobooking}</title>
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css">
                <link rel="icon" href="/asset/TitleE-bphtb.png" type="image/png">
                <style>
                :root {
                    --navy-blue: #001f3f;
                    --gold-accent: #d4af37;
                    --light-blue: #0074d9;
                    --light-gray: #f8f9fa;
                    --dark-gray: #333;
                    --white: #ffffff;
                    --shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                }

                /* Action Buttons */
                .action-buttons {
                    display: flex;
                    gap: 10px;
                    margin-bottom: 20px;
                }

                .form-wrapper {
                    max-width: 1200px;
                    margin: 2rem auto;
                    padding: 2rem;
                    background: var(--white);
                    border-radius: 10px;
                    box-shadow: var(--shadow);
                    font-family: 'Montserrat', sans-serif;
                }
                .form-title {
                    text-align: center;
                    color: var(--navy-blue);
                    margin-bottom: 2rem;
                    font-size: 2rem;
                    position: relative;
                    padding-bottom: 1rem;
                }
                .form-title::after {
                    content: '';
                    position: absolute;
                    bottom: 0;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 100px;
                    height: 3px;
                    background: var(--gold-accent);
                }
                .form-header-decoration {
                    text-align: center;
                    margin-bottom: 2rem;
                }
                .tax-icon {
                    display: inline-block;
                    padding: 1rem;
                    background: var(--navy-blue);
                    border-radius: 50%;
                    color: var(--gold-accent);
                    font-size: 2rem;
                    width: 60px;
                    height: 60px;
                    margin-bottom: 1rem;
                }
                .tax-icon svg {
                    width: 100%;
                    height: 100%;
                }
                .elegant-section {
                    margin-bottom: 2rem;
                }

                .elegant-card {
                    background: var(--white);
                    border-radius: 8px;
                    box-shadow: var(--shadow);
                    padding: 1.5rem;
                    border-top: 4px solid var(--navy-blue);
                    position: relative;
                    overflow: hidden;
                }
                .elegant-card::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 5px;
                    height: 100%;
                    background: var(--gold-accent);
                }
                .section-header-decor h2 {
                    color: var(--navy-blue);
                    margin-top: 0;
                    padding-bottom: 0.5rem;
                    border-bottom: 1px solid rgba(0, 31, 63, 0.1);
                    font-size: 1.3rem;
                    display: flex;
                    align-items: center;
                }
                .section-header-decor h2 i {
                    margin-right: 10px;
                    color: var(--gold-accent);
                }
                /****************************/
                .dual-column-section {
                    display: flex;
                    gap: 2rem;
                }
                .form-column {
                    flex: 1;
                }
                .form-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 1.2rem;
                }
                .form-group {
                    margin-bottom: 1rem;
                }
                .form-group label {
                    display: block;
                    margin-bottom: 0.5rem;
                    font-weight: 600;
                    color: var(--navy-blue);
                    font-size: 0.95rem;
                }
                .elegant-input {
                    width: 100%;
                    padding: 0.8rem 1rem;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-size: 0.95rem;
                    transition: all 0.3s ease;
                    background-color: var(--light-gray);
                }
                .elegant-input:focus {
                    border-color: var(--light-blue);
                    box-shadow: 0 0 0 3px rgba(0, 116, 217, 0.1);
                    outline: none;
                }
                .elegant-textarea {
                    width: 100%;
                    padding: 0.8rem 1rem;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    min-height: 100px;
                    resize: vertical;
                    font-family: inherit;
                    font-size: 0.95rem;
                    transition: all 0.3s ease;
                    background-color: var(--light-gray);
                }
                .elegant-textarea:focus {
                    border-color: var(--light-blue);
                    box-shadow: 0 0 0 3px rgba(0, 116, 217, 0.1);
                    outline: none;
                }
                /****************************/
                .label-with-icon {
                    display: flex;
                    align-items: center;
                    margin-bottom: 0.4rem;
                }
                .label-with-icon i {
                    margin-right: 8px;
                    color: var(--gold-accent);
                    font-size: 0.9rem;
                    width: 16px;
                    text-align: center;
                }

                /****************************/
                .form-section-collapsible .section-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    cursor: pointer;
                    padding: 1rem 1.5rem;
                    background: var(--navy-blue);
                    color: white;
                    border-radius: 6px;
                    transition: all 0.3s ease;
                }
                .form-section-collapsible .section-header:hover {
                    background: #002a56;
                }
                .form-section-collapsible .section-header h2 {
                    margin: 0;
                    font-size: 1.1rem;
                    display: flex;
                    align-items: center;
                }
                .form-section-collapsible .section-header h2 i {
                    margin-right: 10px;
                    color: var(--gold-accent);
                }
                .toggle-icon {
                    transition: transform 0.3s ease;
                }
                .section-content {
                    padding-top: 1.5rem;
                }
                /****************************/
                /****************************/
                /****************************/
                .two-column-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 2rem;
                }
                .full-width-container {
                    grid-column: 1 / -1;
                    margin-top: 1.5rem;
                }
                .elegant-actions {
                    display: flex;
                    justify-content: center;
                    gap: 1rem;
                    margin-top: 2rem;
                }
                .elegant-btn {
                    padding: 0.8rem 1.5rem;
                    border: none;
                    border-radius: 4px;
                    font-size: 0.95rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                }
                .elegant-btn i {
                    margin-right: 8px;
                }
                .btn-submit {
                    background: var(--navy-blue);
                    color: white;
                }
                .btn-submit:hover {
                    background: #002a56;
                    transform: translateY(-2px);
                }
                .btn-reset {
                    background: #f0f0f0;
                    color: var(--dark-gray);
                }
                .btn-reset:hover {
                    background: #e0e0e0;
                    transform: translateY(-2px);
                }
                .btn-simpan {
                    background: var(--gold-accent);
                    color: var(--navy-blue);
                }
                .btn-simpan:hover {
                    background: #e6c260;
                    transform: translateY(-2px);
                }
                .elegant-result {
                    background: var(--white);
                    border-radius: 8px;
                    padding: 2rem;
                    text-align: center;
                    margin-top: 2rem;
                    box-shadow: var(--shadow);
                    border-top: 4px solid var(--gold-accent);
                }
                .result-header {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    margin-bottom: 1.5rem;
                }
                .success-icon {
                    font-size: 3rem;
                    color: #28a745;
                    margin-bottom: 1rem;
                }
                .validation-code {
                    font-size: 1.8rem;
                    font-weight: bold;
                    letter-spacing: 2px;
                    color: var(--navy-blue);
                    background: #f8f9fa;
                    padding: 1rem;
                    border-radius: 4px;
                    margin: 1rem 0;
                    font-family: 'Courier New', monospace;
                }
                .result-footer {
                    color: #666;
                    font-size: 0.9rem;
                    margin-top: 1rem;
                }

                @media (max-width: 768px) {
                    .dual-column-section {
                        flex-direction: column;
                    }
                    .two-column-grid {
                        grid-template-columns: 1fr;
                    }
                    .form-wrapper {
                        padding: 1rem;
                    }
                    .elegant-actions {
                        flex-direction: column;
                    }   
                    .elegant-btn {
                        width: 100%;
                    }
                }
                /* Animation for toggle */
                .rotate-icon {
                    transform: rotate(180deg);
                }
                /**********************************/
                .status-badge {
                    padding: 5px 10px;
                    border-radius: 20px;
                    font-size: 0.8rem;
                    font-weight: 500;
                }

                .badge-warning {
                    background-color: #fff3cd;
                    color: #856404;
                }

                .badge-success {
                    background-color: #d4edda;
                    color: #155724;
                }

                .badge-danger {
                    background-color: #f8d7da;
                    color: #721c24;
                }

                .badge-info {
                    background-color: #d1ecf1;
                    color: #0c5460;
                }

                .data-row:hover {
                    background-color: #f8f9fa;
                }
                </style>
            </head>
            <body>
                <div class="form-wrapper">
                    <h1 class="form-title">Formulir Validasi PPATK - ${nobooking}</h1>
                    
                    <form id="ppatkForm" class="validation-form">
                        <!-- Form sections with pre-filled data -->
                        <div class="form-header-decoration">
                            <div class="tax-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19 14V20H5V14H2V22H22V14H19Z"/>
                                    <path d="M12 2L22 12H18V17H6V12H2L12 2ZM8 12H16V15H8V12Z"/>
                                </svg>
                            </div>
                        </div>

                        <!-- Data Pemohon -->
                        <div class="dual-column-section">
                            <div class="form-column">
                                <div class="form-section elegant-card">
                                    <div class="section-header-decor">
                                        <h2><i class="fas fa-user-tie"></i> Data Pemohon</h2>
                                    </div>
                                    <div class="form-grid">
                                        <div class="form-group">
                                            <div class="label-with-icon">
                                                <i class="fas fa-user"></i>
                                                <label for="nama_pemohon">Nama Lengkap Pemohon</label>
                                            </div>
                                            <input type="text" id="nama_pemohon" name="nama_pemohon" 
                                                   class="elegant-input" value="${formData.nama_pemohon || ''}" required readonly>
                                        </div>
                                        <div class="form-group">
                                            <div class="label-with-icon">
                                                <i class="fas fa-phone-alt"></i>
                                                <label for="no_telepon">Nomor Telepon/HP</label>
                                            </div>
                                            <input type="tel" id="no_telepon" name="no_telepon" 
                                                   class="elegant-input" value="${formData.no_telepon || ''}" required readonly>
                                        </div>
                                        <div class="form-group">
                                            <div class="label-with-icon">
                                                <i class="fas fa-map-marker-alt"></i>
                                                <label for="alamat_pemohon">Alamat Pemohon</label>
                                            </div>
                                            <textarea id="alamat_pemohon" name="alamat_pemohon" rows="3" 
                                                      class="elegant-textarea" placeholder="Tolong diisikan" required>${formData.alamat_pemohon || ''}</textarea>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Data Wajib Pajak -->
                            <div class="form-column">
                                <div class="form-section elegant-card">
                                    <div class="section-header-decor">
                                        <h2><i class="fas fa-file-invoice-dollar"></i> Data Wajib Pajak</h2>
                                    </div>
                                    <div class="form-grid">
                                        <div class="form-group">    
                                            <div class="label-with-icon">
                                                <i class="fas fa-user"></i>
                                                <label for="nama_wajib_pajak">Nama Wajib Pajak</label>
                                            </div>
                                            <input type="text" id="nama_wajib_pajak" name="nama_wajib_pajak" 
                                                   class="elegant-input" value="${formData.nama_wajib_pajak || ''}" required readonly>
                                        </div>
                                        <div class="form-group">
                                            <div class="label-with-icon">
                                                <i class="fas fa-map-signs"></i>
                                                <label for="kelurahan">Desa/Kelurahan</label>
                                            </div>
                                            <input type="text" id="kelurahan" name="kelurahan" 
                                                   class="elegant-input" value="${formData.kelurahan || ''}" required readonly>
                                        </div>
                                        <div class="form-group">
                                            <div class="label-with-icon">
                                                <i class="fas fa-map-pin"></i>
                                                <label for="kecamatan">Kecamatan</label>
                                            </div>
                                            <input type="text" id="kecamatan" name="kecamatan" 
                                                   class="elegant-input" value="${formData.kecamatan || ''}" required readonly>
                                        </div>
                                        <div class="form-group">
                                            <div class="label-with-icon">
                                                <i class="fas fa-city"></i>
                                                <label for="kabupaten_kota">Kabupaten/Kota</label>
                                            </div>
                                            <input type="text" id="kabupaten_kota" name="kabupaten_kota" 
                                                   class="elegant-input" value="${formData.kabupaten_kota || ''}" required readonly>
                                        </div>
                                        <div class="form-group">
                                            <div class="label-with-icon">
                                                <i class="fas fa-map-marker-alt"></i>
                                                <label for="alamat_wajib_pajak">Alamat Wajib Pajak</label>
                                            </div>
                                            <textarea id="alamat_wajib_pajak" name="alamat_wajib_pajak" rows="3" 
                                                      class="elegant-textarea" required readonly>${formData.alamat_wajib_pajak || ''}</textarea>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Data Properti -->
                        <div class="form-container elegant-section">
                            <div class="form-section-collapsible elegant-card">
                                <div class="section-header" onclick="toggleSection('lokasi-properti')">
                                    <h2><i class="fas fa-building"></i> Lokasi Dan Data Properti</h2>
                                    <span class="toggle-icon" id="icon-lokasi-properti">
                                        <i class="fas fa-chevron-down"></i>
                                    </span>
                                </div>
                                <div class="section-content" id="content-lokasi-properti" style="display:none">
                                    <div class="two-column-grid">
                                        <div class="column">
                                            <div class="form-grid">
                                                <div class="form-group">
                                                    <div class="label-with-icon">
                                                        <i class="fas fa-map-marker-alt"></i>
                                                        <label for="Alamatop">Alamat Objek Pajak</label>
                                                    </div>
                                                    <input type="text" id="Alamatop" name="Alamatop" 
                                                           class="elegant-input" value="${formData.Alamatop || ''}" required readonly>
                                                </div>
                                                <div class="form-group">
                                                    <div class="label-with-icon">
                                                        <i class="fas fa-map-marked-alt"></i>
                                                        <label for="kampungop">Kampung</label>
                                                    </div>
                                                    <input type="text" id="kampungop" name="kampungop" 
                                                           class="elegant-input" placeholder="Tolong diisikan" value="${formData.kampungop || ''}" required>
                                                </div>
                                                <div class="form-group">
                                                    <div class="label-with-icon">
                                                        <i class="fas fa-map-signs"></i>
                                                        <label for="kelurahanop">Kelurahan/Desa</label>
                                                    </div>
                                                    <input type="text" id="kelurahanop" name="kelurahanop" 
                                                           class="elegant-input" placeholder="Tolong diisikan" value="${formData.kelurahanop || ''}" required>
                                                </div>
                                                <div class="form-group">
                                                    <div class="label-with-icon">
                                                        <i class="fas fa-map-pin"></i>
                                                        <label for="kecamatanopj">Kecamatan</label>
                                                    </div>
                                                    <input type="text" id="kecamatanopj" name="kecamatanopj" 
                                                           class="elegant-input" placeholder="Tolong diisikan" value="${formData.kecamatanopj || ''}" required>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div class="column">
                                            <div class="form-grid">
                                                <div class="form-group">
                                                    <div class="label-with-icon">
                                                        <i class="fas fa-hashtag"></i>
                                                        <label for="nop">Nomor Objek Pajak (NOP)</label>
                                                    </div>
                                                    <input type="text" id="nop" name="nop" 
                                                           class="elegant-input" value="${formData.nop || ''}" readonly>
                                                </div>                    
                                                <div class="form-group">      
                                                    <div class="label-with-icon">
                                                        <i class="fas fa-user-check"></i>
                                                        <label for="atas_nama">Atas Nama (Sertifikat)</label>
                                                    </div>
                                                    <input type="text" id="atas_nama" name="atas_nama" 
                                                           class="elegant-input" value="${formData.atas_nama || ''}" readonly>
                                                </div>
                                                <div class="form-group">
                                                    <div class="label-with-icon">
                                                        <i class="fas fa-vector-square"></i>
                                                        <label for="luas_tanah">Luas Tanah (m²)</label>
                                                    </div>
                                                    <input type="number" id="luas_tanah" name="luas_tanah" min="0" step="0.01" 
                                                           value="${formData.luas_tanah || 0}" class="elegant-input" readonly>
                                                </div>
                                                <div class="form-group">
                                                    <div class="label-with-icon">
                                                        <i class="fas fa-ruler-combined"></i>
                                                        <label for="luas_bangunan">Luas Bangunan (m²)</label>
                                                    </div>
                                                    <input type="number" id="luas_bangunan" name="luas_bangunan" min="0" step="0.01" 
                                                           value="${formData.luas_bangunan || 0}" class="elegant-input" readonly>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <!-- Keterangan Tambahan -->
                                    <div class="full-width-container">
                                        <div class="form-group full-width">
                                            <div class="label-with-icon">
                                                <i class="fas fa-edit"></i>
                                                <label for="lainnya">Keterangan Tambahan</label>
                                            </div>
                                            <textarea id="lainnya" name="lainnya" rows="3" 
                                                      class="keterangan-textarea elegant-textarea">${formData.lainnya || ''}</textarea>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Tanggal Validasi -->
                        <div class="form-section elegant-card">
                            <div class="form-group">
                                <label for="tanggal_validasi">Tanggal Validasi</label>
                                <div class="input-with-icon">
                                    <input type="date" id="tanggal_validasi" name="tanggal_validasi" class="elegant-input" required>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Tombol Simpan -->
                        <div class="form-actions elegant-actions" id="saveButtonContainer">
                            <button type="button" class="btn-simpan elegant-btn">
                                <i class="fas fa-save"></i> Simpan Permohonan
                            </button>
                        </div>
                    </form>
                </div>

                <script>
                    console.log('[DEBUG] New window script loaded');
                    
                    // Fungsi untuk toggle section
                    function toggleSection(sectionId) {
                        console.log(\`[DEBUG] Toggling section: \${sectionId}\`);
                        const content = document.getElementById(\`content-\${sectionId}\`);
                        const icon = document.getElementById(\`icon-\${sectionId}\`);
                        
                        if (content.style.display === 'none') {
                            content.style.display = 'block';
                            icon.innerHTML = '<i class="fas fa-chevron-up"></i>';
                        } else {
                            content.style.display = 'none';
                            icon.innerHTML = '<i class="fas fa-chevron-down"></i>';
                        }
                    }
                </script>
                <script>
                    document.addEventListener('DOMContentLoaded', function() {
                        // Set default date to today
                        const today = new Date().toISOString().split('T')[0];
                        document.getElementById('tanggal_validasi').value = today;
                        
                        // Single event listener for save button
                        document.querySelector('.btn-simpan').addEventListener('click', async function() {
                            try {
                                // Validate required fields first
                                const requiredFields = [
                                    'alamat_pemohon',
                                    'kampungop',
                                    'kelurahanop',
                                    'kecamatanopj'
                                ];
                                
                                const missingFields = requiredFields.filter(field => {
                                    const value = document.getElementById(field).value.trim();
                                    return !value;
                                });

                                // Prepare data
                                const formData = {
                                    nobooking: '${nobooking}', // Diisi dari template
                                    alamat_pemohon: document.getElementById('alamat_pemohon').value.trim(),
                                    kampungop: document.getElementById('kampungop').value.trim(),
                                    kelurahanop: document.getElementById('kelurahanop').value.trim(),
                                    kecamatanopj: document.getElementById('kecamatanopj').value.trim()
                                };

                                // Show loading state
                                const saveBtn = this;
                                saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
                                saveBtn.disabled = true;

                                // Send to server
                                const response = await fetch('/api/save-ppatk-additional-data', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify(formData),
                                    credentials: 'include'
                                });

                                const result = await response.json();

                                if (!response.ok || !result.success) {
                                    throw new Error(result.message || 'Gagal menyimpan data');
                                }

                                alert('Data berhasil disimpan!');
                                
                                // Refresh parent window and close this window
                                if (window.opener && !window.opener.closed) {
                                    window.opener.location.reload();
                                }
                                window.close();

                            } catch (error) {
                                console.error('Error:', error);
                                
                                // Reset button state
                                const saveBtn = document.querySelector('.btn-simpan');
                                saveBtn.innerHTML = '<i class="fas fa-save"></i> Simpan Permohonan';
                                saveBtn.disabled = false;
                                
                                alert('Error: ' + error.message);
                            }
                        });
                    });
                </script>
            </body>
            </html>
        `;
        
        console.log('[DEBUG] HTML content generated, writing to new window');
        newWindow.document.write(htmlContent);
        newWindow.document.close();
        console.log('[DEBUG] New window document closed');
        
    } catch (error) {
        console.error('[ERROR] in gotoform:', error);
        const errorMessage = error.message || 'Unknown error occurred';
        console.error('[ERROR] Error details:', error.stack);
        
        const errorWindow = window.open('', '_blank');
        if (errorWindow) {
            errorWindow.document.write(`
                <h1>Error</h1>
                <p><strong>Message:</strong> ${errorMessage}</p>
                <p><strong>Details:</strong> ${error.stack || 'No stack trace available'}</p>
                <p>Please check the console for more details.</p>
            `);
            errorWindow.document.close();
        } else {
            console.error('[ERROR] Failed to open error window');
            alert('Error: ' + errorMessage + '\n\nAlso failed to open error window');
        }
    } finally {
        console.log('[DEBUG] gotoform function completed');
    }
}

// Fungsi untuk generate form HTML dengan data yang sudah diisi
function generateFormHTML(data) {
    return `
        <div class="form-wrapper">
            <h1 class="form-title">Formulir Validasi PPATK</h1>
            
            <form id="ppatkForm" class="validation-form">
                <!-- Header Decoration -->
                <div class="form-header-decoration">
                    <div class="tax-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 14V20H5V14H2V22H22V14H19Z"/>
                            <path d="M12 2L22 12H18V17H6V12H2L12 2ZM8 12H16V15H8V12Z"/>
                        </svg>
                    </div>
                </div>

                <!-- Section 1: Dual Column Data -->
                <div class="form-section-container elegant-section">
                    <div class="dual-column-section">
                        <!-- Left Column - Applicant Data -->
                        <div class="form-column">
                            <div class="form-section elegant-card">
                                <div class="section-header-decor">
                                    <h2><i class="fas fa-user-tie"></i> Data Pemohon</h2>
                                </div>
                                <div class="form-grid">
                                    <div class="form-group">
                                        <div class="label-with-icon">
                                            <i class="fas fa-user"></i>
                                            <label for="nama_pemohon">Nama Lengkap Pemohon</label>
                                        </div>
                                        <input type="text" id="nama_pemohon" name="nama_pemohon" class="elegant-input" value="${data.nama_pemohon || ''}" required>
                                    </div>
                                    <div class="form-group">
                                        <div class="label-with-icon">
                                            <i class="fas fa-phone-alt"></i>
                                            <label for="no_telepon">Nomor Telepon/HP</label>
                                        </div>
                                            <input type="tel" id="no_telepon" name="no_telepon" class="elegant-input" value="${data.no_telepon || ''}" required>
                                    </div>
                                    <div class="form-group">
                                        <div class="label-with-icon">
                                            <i class="fas fa-map-marker-alt"></i>
                                            <label for="alamat_pemohon">Alamat Pemohon</label>
                                        </div>
                                            <textarea id="alamat_pemohon" name="alamat_pemohon" rows="3" class="elegant-textarea" required>${data.alamat_pemohon || ''}</textarea>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Right Column - Taxpayer Data -->
                        <div class="form-column">
                            <div class="form-section elegant-card">
                                <div class="section-header-decor">
                                    <h2><i class="fas fa-file-invoice-dollar"></i> Data Wajib Pajak</h2>
                                </div>
                                <div class="form-grid">
                                    <div class="form-group">    
                                        <div class="label-with-icon">
                                            <i class="fas fa-user"></i>
                                            <label for="nama_wajib_pajak">Nama Wajib Pajak</label>
                                        </div>
                                        <input type="text" id="nama_wajib_pajak" name="nama_wajib_pajak" class="elegant-input" value="${data.nama_wajib_pajak || ''}" required>
                                    </div>
                                    <div class="form-group">
                                        <div class="label-with-icon">
                                            <i class="fas fa-map-signs"></i>
                                            <label for="kelurahan">Desa/Kelurahan</label>
                                        </div>
                                            <input type="text" id="kelurahan" name="kelurahan" class="elegant-input" value="${data.kelurahan || ''}" required>
                                    </div>
                                    <div class="form-group">
                                        <div class="label-with-icon">
                                            <i class="fas fa-map-pin"></i>
                                            <label for="kecamatan">Kecamatan</label>
                                        </div>
                                        <input type="text" id="kecamatan" name="kecamatan" class="elegant-input" value="${data.kecamatan || ''}" required>
                                    </div>
                                    <div class="form-group">
                                        <div class="label-with-icon">
                                            <i class="fas fa-city"></i>
                                            <label for="kabupaten_kota">Kabupaten/Kota</label>
                                        </div>
                                            <input type="text" id="kabupaten_kota" name="kabupaten_kota" class="elegant-input" value="${data.kabupaten_kota || ''}" required>
                                    </div>
                                    <div class="form-group">
                                        <div class="label-with-icon">
                                            <i class="fas fa-map-marker-alt"></i>
                                            <label for="alamat_wajib_pajak">Alamat Wajib Pajak</label>
                                        </div>
                                        <textarea id="alamat_wajib_pajak" name="alamat_wajib_pajak" rows="3" class="elegant-textarea" required>${data.alamat_wajib_pajak || ''}</textarea>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>            
                </div>

                <!-- Property Section - Collapsible -->
                <div class="form-container elegant-section">
                    <div class="form-section-collapsible elegant-card">
                        <div class="section-header" onclick="toggleSection('lokasi-properti')">
                            <h2><i class="fas fa-building"></i> Lokasi Dan Data Properti</h2>
                            <span class="toggle-icon" id="icon-lokasi-properti">
                                <i class="fas fa-chevron-down"></i>
                            </span>
                        </div>
                        <div class="section-content" id="content-lokasi-properti" style="display:none">
                            <div class="two-column-grid">
                                <div class="column">
                                    <div class="form-grid">
                                        <div class="form-group">
                                            <div class="label-with-icon">
                                                <i class="fas fa-map-marker-alt"></i>
                                                <label for="Alamatop">Alamat Objek Pajak</label>
                                            </div>
                                                <input type="text" id="Alamatop" name="Alamatop" class="elegant-input" value="${data.Alamatop || ''}" required>
                                        </div>
                                        <div class="form-group">
                                            <div class="label-with-icon">
                                                <i class="fas fa-map-marked-alt"></i>
                                                <label for="kampungop">Kampung</label>
                                            </div>
                                                <input type="text" id="kampungop" name="kampungop" class="elegant-input" value="${data.kampungop || ''}" required>
                                        </div>
                                        <div class="form-group">
                                            <div class="label-with-icon">
                                                <i class="fas fa-map-signs"></i>
                                                <label for="kelurahanop">Kelurahan/Desa</label>
                                            </div>
                                                <input type="text" id="kelurahanop" name="kelurahanop" class="elegant-input" value="${data.kelurahanop || ''}" required>
                                        </div>
                                        <div class="form-group">
                                            <div class="label-with-icon">
                                                <i class="fas fa-map-pin"></i>
                                                <label for="kecamatan">Kecamatan</label>
                                            </div>
                                            <input type="text" id="kecamatanopj" name="kecamatanopj" class="elegant-input" value="${data.kecamatanopj || ''}" required>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="column">
                                    <div class="form-grid">
                                        <div class="form-group">
                                            <div class="label-with-icon">
                                                <i class="fas fa-hashtag"></i>
                                                <label for="nop">Nomor Objek Pajak (NOP)</label>
                                            </div>

                                            <div class="input-with-icon">
                                                <input type="text" id="nop" name="nop" class="elegant-input" value="${data.nop || ''}">
                                            </div>
                                        </div>                    
                                        <div class="form-group">      
                                            <div class="label-with-icon">
                                                <i class="fas fa-user-check"></i>
                                                <label for="atas_nama">Atas Nama (Sertifikat)</label>
                                            </div>
                                                <input type="text" id="atas_nama" name="atas_nama" class="elegant-input" value="${data.atas_nama || ''}">
                                        </div>
                                        <div class="form-group">
                                            <div class="label-with-icon">
                                                <i class="fas fa-vector-square"></i>
                                                <label for="luas_tanah">Luas Tanah (m²)</label>
                                            </div>
                                                <input type="number" id="luas_tanah" name="luas_tanah" min="0" step="0.01" value="${data.luas_tanah || 0}" class="elegant-input">
                                        </div>
                                        <div class="form-group">
                                            <div class="label-with-icon">
                                                <i class="fas fa-ruler-combined"></i>
                                                <label for="luas_bangunan">Luas Bangunan (m²)</label>
                                            </div>
                                                <input type="number" id="luas_bangunan" name="luas_bangunan" min="0" step="0.01" value="${data.luas_bangunan || 0}" class="elegant-input">
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <!-- Additional Notes Textarea -->
                            <div class="full-width-container">
                                <div class="form-group full-width">
                                    <div class="label-with-icon">
                                        <i class="fas fa-edit"></i>
                                        <label for="lainnya">Keterangan Tambahan</label>
                                    </div>
                                        <textarea id="lainnya" name="lainnya" rows="3" class="keterangan-textarea elegant-textarea">${data.lainnya || ''}</textarea>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Validation Date Section -->
                <div class="form-section elegant-card">
                    <div class="form-group">
                        <label for="tanggal_validasi">Tanggal Validasi</label>
                        <div class="input-with-icon">
                            <input type="date" id="tanggal_validasi" name="tanggal_validasi" class="elegant-input" required>
                        </div>
                    </div>
                </div>
                <!-- Save Button (hidden initially) -->
                <div class="form-actions elegant-actions" id="saveButtonContainer">
                    <button type="button" class="btn-simpan elegant-btn">
                        <i class="fas fa-save"></i> Simpan Permohonan
                    </button>
                </div>
            </form>
        </div>
    `;
}

async function fetchDataFromDatabase(nobooking, userInput = {}) {
    try {
        const response = await fetch(`http://localhost:3000/api/ppatk_get-booking-data/${nobooking}`, {
            credentials: 'include' // Untuk mengirim session cookie jika diperlukan
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (!result.success || !result.booking) {
            throw new Error('Data booking tidak ditemukan');
        }

        const bookingData = result.booking;

        // Gabungkan dengan input manual user
        return {
            ...bookingData, // Data dari database
            alamat_pemohon: userInput.alamat_pemohon || '',
            kampungop: userInput.kampungop || '',
            kelurahanop: userInput.kelurahanop || '',
            kecamatanopj: userInput.kecamatanopj || ''
        };
    } catch (error) {
        console.error('Error fetching booking data:', error);
        throw error;
    }
}

// Fungsi untuk button View (jika diperlukan)
function clickform() {
    alert('Fungsi view form akan diimplementasikan di sini');
    // Tambahkan logika untuk view form di sini
}

// Fungsi untuk menampilkan modal upload dokumen
function showDocumentUploadModal() {
    const modal = document.getElementById('documentUploadModal');
    if (!modal) {
        showAlert('error', 'Modal upload dokumen tidak ditemukan!');
        return;
    }
    
    modal.style.display = 'flex';
    setupDocumentUploadForm();
}

// Setup form upload dokumen
function setupDocumentUploadForm() {
    const modal = document.getElementById('documentUploadModal');
    const closeBtn = document.getElementById('closeDocModalBtn');
    const cancelBtn = document.getElementById('cancelDocUploadBtn');
    const uploadBtn = document.getElementById('uploadDocs');
    
    if (!modal || !closeBtn || !cancelBtn || !uploadBtn) {
        showAlert('error', 'Elemen modal upload dokumen tidak lengkap!');
        return;
    }
    
    // Hapus event listener lama jika ada
    closeBtn.removeEventListener('click', closeDocModal);
    cancelBtn.removeEventListener('click', closeDocModal);
    uploadBtn.removeEventListener('click', handleDocUpload);
    modal.removeEventListener('click', handleDocModalClick);
    
    // Tambahkan event listener baru
    closeBtn.addEventListener('click', closeDocModal);
    cancelBtn.addEventListener('click', closeDocModal);
    uploadBtn.addEventListener('click', handleDocUpload);
    modal.addEventListener('click', handleDocModalClick);
    
    // Setup preview untuk dokumen
    setupDocumentPreview('document1', 'docPreview1', 'docPreviewImage1');
    setupDocumentPreview('document2', 'docPreview2', 'docPreviewImage2');
    
    // Populate booking selection dropdown
    populateBookingDropdown();
    
    async function handleDocUpload() {
        try {
            console.log('Memulai proses upload dokumen...');
            
            const doc1Input = document.getElementById('document1');
            const doc2Input = document.getElementById('document2');
            const bookingSelect = document.getElementById('bookingSelect');
            
            console.log('Input elements found:', { doc1Input: !!doc1Input, doc2Input: !!doc2Input, bookingSelect: !!bookingSelect });
            
            if (!doc1Input || !doc2Input) {
                showAlert('error', 'Input file dokumen tidak ditemukan!');
                return;
            }
            
            const doc1 = doc1Input.files[0];
            const doc2 = doc2Input.files[0];
            const selectedBookingId = bookingSelect ? bookingSelect.value : null;
            
            console.log('Files selected:', { 
                doc1: doc1 ? { name: doc1.name, size: doc1.size, type: doc1.type } : null,
                doc2: doc2 ? { name: doc2.name, size: doc2.size, type: doc2.type } : null,
                bookingId: selectedBookingId
            });
            
            // Validasi dokumen wajib
            if (!doc1) {
                showAlert('error', 'Dokumen wajib harus diupload!');
                return;
            }
            
            // Validasi file
            if (!validateDocument(doc1)) {
                console.log('Document1 validation failed');
                return;
            }
            if (doc2 && !validateDocument(doc2)) {
                console.log('Document2 validation failed');
                return;
            }
            
            console.log('All validations passed, starting upload...');
            toggleDocLoading(true);
            showAlert('info', 'Memproses dokumen...');
            
            // Upload dokumen dengan booking ID
            await uploadDocuments(doc1, doc2, selectedBookingId);
        } catch (error) {
            console.error('Document upload error:', error);
            showAlert('error', error.message || 'Terjadi kesalahan saat upload dokumen');
        } finally {
            toggleDocLoading(false);
        }
    }
    
    function handleDocModalClick(e) {
        if (e.target === modal) {
            closeDocModal();
        }
    }
}

// Validasi dokumen
function validateDocument(file) {
    console.log('Validating document:', { name: file?.name, size: file?.size, type: file?.type });
    
    if (!file) {
        console.log('File is null or undefined');
        showAlert('error', 'File tidak ditemukan!');
        return false;
    }
    
    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    console.log('File validation:', {
        type: file.type,
        isValidType: validTypes.includes(file.type),
        size: file.size,
        maxSize: maxSize,
        isValidSize: file.size <= maxSize
    });
    
    if (!validTypes.includes(file.type)) {
        console.log('Invalid file type:', file.type);
        showAlert('error', 'Format file tidak didukung. Gunakan PDF, JPG, atau PNG!');
        return false;
    }
    
    if (file.size > maxSize) {
        console.log('File too large:', file.size, '>', maxSize);
        showAlert('error', 'Ukuran file terlalu besar. Maksimal 5MB!');
        return false;
    }
    
    console.log('Document validation passed');
    return true;
}

// Setup preview dokumen
function setupDocumentPreview(inputId, previewContainerId, previewImageId) {
    const input = document.getElementById(inputId);
    const previewContainer = document.getElementById(previewContainerId);
    const previewImage = document.getElementById(previewImageId);
    
    if (!input || !previewContainer || !previewImage) {
        console.error('Document preview elements not found:', { inputId, previewContainerId, previewImageId });
        return;
    }
    
    const clearBtn = previewContainer.querySelector('.clear-btn');
    
    // Hapus event listener lama
    input.removeEventListener('change', handleDocFileChange);
    if (clearBtn) {
        clearBtn.removeEventListener('click', handleDocClear);
    }
    
    // Tambahkan event listener baru
    input.addEventListener('change', handleDocFileChange);
    if (clearBtn) {
        clearBtn.addEventListener('click', handleDocClear);
    }
    
    function handleDocFileChange(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        if (!validateDocument(file)) {
            input.value = '';
            return;
        }
        
        // Tampilkan preview untuk gambar
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImage.src = e.target.result;
                previewContainer.style.display = 'block';
            };
            reader.onerror = () => {
                showAlert('error', 'Gagal membaca file!');
                input.value = '';
            };
            reader.readAsDataURL(file);
        } else {
            // Untuk PDF, tampilkan nama file
            previewImage.src = '';
            previewContainer.style.display = 'block';
            const fileName = document.createElement('div');
            fileName.textContent = file.name;
            fileName.style.cssText = 'padding: 10px; background: #f8f9fa; border-radius: 4px; margin: 5px 0;';
            previewContainer.appendChild(fileName);
        }
    }
    
    function handleDocClear() {
        input.value = '';
        previewContainer.style.display = 'none';
        // Hapus elemen tambahan yang dibuat untuk PDF
        const additionalElements = previewContainer.querySelectorAll('div');
        additionalElements.forEach(el => {
            if (el !== clearBtn.parentNode) {
                el.remove();
            }
        });
    }
}

// Upload dokumen
async function uploadDocuments(doc1, doc2, bookingId = null) {
    try {
        console.log('Menyiapkan data dokumen untuk upload...');
        
        const formData = new FormData();
        
        if (doc1) {
            formData.append('document1', doc1);
            console.log('Document1 added:', doc1.name, doc1.size, doc1.type);
        }
        
        if (doc2) {
            formData.append('document2', doc2);
            console.log('Document2 added:', doc2.name, doc2.size, doc2.type);
        }
        
        // Add booking_id if provided
        if (bookingId) {
            formData.append('booking_id', bookingId);
            console.log('Booking ID added:', bookingId);
        }
        
        console.log('Mengirim request dokumen ke server...');
        
        const response = await fetch('http://localhost:3000/api/ppatk_upload-documents', {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
        
        const data = await response.json();
        console.log('Response data:', data);
        
        if (!response.ok) {
            let errorMessage = data.message || 'Gagal mengupload dokumen';
            
            // Handle specific error codes
            if (data.error_code === 'MISSING_REQUIRED_DOCUMENT') {
                errorMessage = 'Dokumen wajib harus diupload';
            } else if (data.error_code === 'USER_NOT_FOUND') {
                errorMessage = 'Data user tidak ditemukan. Silakan login ulang.';
            } else if (data.error_code === 'DATABASE_ERROR') {
                errorMessage = 'Error database. Silakan coba lagi.';
            }
            
            throw new Error(errorMessage);
        }
        
        showAlert('success', 'Dokumen berhasil diupload!');
        closeDocModal();
        
        // Refresh table data to show uploaded documents
        if (typeof loadTableData === 'function') {
            loadTableData();
        }
        
        return data;
    } catch (error) {
        console.error('Document Upload Error:', error);
        
        // Handle network errors
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            showAlert('error', 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.');
        } else {
            showAlert('error', error.message || 'Terjadi kesalahan saat mengupload dokumen');
        }
        
        throw error;
    }
}

// Function to load uploaded documents for a specific booking
async function loadUploadedDocuments(bookingId) {
    try {
        const response = await fetch(`http://localhost:3000/api/ppatk_get-documents?booking_id=${bookingId}`, {
            method: 'GET',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.data.length > 0) {
            return data.data[0]; // Return the most recent document set
        }
        
        return null;
    } catch (error) {
        console.error('Error loading uploaded documents:', error);
        return null;
    }
}

// Function to display uploaded documents in the table
function displayUploadedDocuments(bookingId, documentData) {
    const documentSection = document.getElementById(`document-${bookingId}`);
    if (!documentSection) return;
    
    // Create uploaded documents display
    let uploadedDocsHTML = `
        <div class="uploaded-documents-section">
            <h5>Dokumen yang Sudah Diupload</h5>
            <div class="uploaded-docs-grid">
    `;
    
    if (documentData.documents.document1) {
        uploadedDocsHTML += `
            <div class="uploaded-doc-item">
                <div class="doc-info">
                    <i class="fas fa-file-pdf doc-icon"></i>
                    <span class="doc-name">${documentData.documents.document1.name}</span>
                </div>
                <div class="doc-actions">
                    <a href="${documentData.documents.document1.url}" target="_blank" class="btn-view-doc">
                        <i class="fas fa-eye"></i> Lihat
                    </a>
                    <button class="btn-replace-doc" onclick="replaceUploadedDocument('${bookingId}', 'document1')">
                        <i class="fas fa-sync-alt"></i> Ganti
                    </button>
                </div>
            </div>
        `;
    }
    
    if (documentData.documents.document2) {
        uploadedDocsHTML += `
            <div class="uploaded-doc-item">
                <div class="doc-info">
                    <i class="fas fa-file-pdf doc-icon"></i>
                    <span class="doc-name">${documentData.documents.document2.name}</span>
                </div>
                <div class="doc-actions">
                    <a href="${documentData.documents.document2.url}" target="_blank" class="btn-view-doc">
                        <i class="fas fa-eye"></i> Lihat
                    </a>
                    <button class="btn-replace-doc" onclick="replaceUploadedDocument('${bookingId}', 'document2')">
                        <i class="fas fa-sync-alt"></i> Ganti
                    </button>
                </div>
            </div>
        `;
    }
    
    uploadedDocsHTML += `
            </div>
        </div>
    `;
    
    // Insert uploaded documents section at the beginning
    documentSection.insertAdjacentHTML('afterbegin', uploadedDocsHTML);
}

// Function to populate booking dropdown
async function populateBookingDropdown() {
    try {
        const bookingSelect = document.getElementById('bookingSelect');
        if (!bookingSelect) return;
        
        // Get booking data from the current table
        const tableRows = document.querySelectorAll('#badanUsahaTable tbody tr');
        const bookings = [];
        
        tableRows.forEach(row => {
            const cells = row.cells;
            if (cells.length >= 1) {
                const bookingId = cells[0].textContent.trim();
                if (bookingId && bookingId !== 'Memuat data...') {
                    bookings.push({
                        id: bookingId,
                        name: `Booking ${bookingId}`
                    });
                }
            }
        });
        
        // Clear existing options
        bookingSelect.innerHTML = '<option value="">-- Pilih Booking (Opsional) --</option>';
        
        // Add booking options
        bookings.forEach(booking => {
            const option = document.createElement('option');
            option.value = booking.id;
            option.textContent = booking.name;
            bookingSelect.appendChild(option);
        });
        
        console.log('Booking dropdown populated with', bookings.length, 'options');
    } catch (error) {
        console.error('Error populating booking dropdown:', error);
    }
}

// Function to replace uploaded document
async function replaceUploadedDocument(bookingId, documentType) {
    try {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf,.jpg,.jpeg,.png';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            if (!validateDocument(file)) {
                return;
            }
            
            showAlert('info', 'Mengupload dokumen baru...');
            
            const formData = new FormData();
            formData.append(documentType, file);
            formData.append('booking_id', bookingId);
            
            const response = await fetch('http://localhost:3000/api/ppatk_upload-documents', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (data.success) {
                showAlert('success', 'Dokumen berhasil diperbarui!');
                // Refresh the document display
                const newDocData = await loadUploadedDocuments(bookingId);
                if (newDocData) {
                    // Remove old display and show new one
                    const uploadedSection = document.querySelector(`#document-${bookingId} .uploaded-documents-section`);
                    if (uploadedSection) {
                        uploadedSection.remove();
                    }
                    displayUploadedDocuments(bookingId, newDocData);
                }
            } else {
                showAlert('error', data.message || 'Gagal memperbarui dokumen');
            }
        };
        
        input.click();
    } catch (error) {
        console.error('Error replacing document:', error);
        showAlert('error', 'Terjadi kesalahan saat mengganti dokumen');
    }
}

// Close modal dokumen
function closeDocModal() {
    const modal = document.getElementById('documentUploadModal');
    if (modal) {
        modal.style.display = 'none';
        resetDocumentForm();
    }
}

// Reset form dokumen
function resetDocumentForm() {
    const doc1 = document.getElementById('document1');
    const doc2 = document.getElementById('document2');
    const preview1 = document.getElementById('docPreview1');
    const preview2 = document.getElementById('docPreview2');
    
    if (doc1) doc1.value = '';
    if (doc2) doc2.value = '';
    if (preview1) preview1.style.display = 'none';
    if (preview2) preview2.style.display = 'none';
}

// Toggle loading dokumen
function toggleDocLoading(show) {
    const btn = document.getElementById('uploadDocs');
    const loadingIndicator = document.getElementById('docModalLoadingIndicator');
    
    if (btn) {
        btn.disabled = show;
    }
    
    if (loadingIndicator) {
        loadingIndicator.style.display = show ? 'inline-block' : 'none';
    }
}