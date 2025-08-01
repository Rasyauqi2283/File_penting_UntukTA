let selectedNoBooking = null;
// Fungsi UTAMA untuk memuat data ke dalam tabel
async function loadTableDataPenelitiV() {
    try {
        // Validate user division
        const userDivisi = getUserDivisi();
        if (typeof userDivisi !== 'string') {
            throw new Error('Invalid user division data');
        }

        if (userDivisi !== 'Peneliti') {
            alert('Anda tidak memiliki akses ke data Peneliti');
            return;
        }

        // Fetch data with timeout
        let response;
        try {
            response = await Promise.race([
                fetch('http://localhost:3000/api/peneliti_get-berkas-fromltb'),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Request timeout: Server took too long to respond')), 10000))
            ]);

            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        } catch (fetchError) {
            console.error('Fetch Error:', fetchError);
            throw new Error(`Gagal memuat data: ${fetchError.message}`);
        }

        // Parse JSON data
        let data;
        try {
            data = await response.json();
            
            if (!data || typeof data !== 'object') {
                throw new Error('Invalid data format received from server');
            }
            
            if (!data.success) {
                throw new Error(data.message || 'Server returned unsuccessful response');
            }
            
            if (!Array.isArray(data.data)) {
                throw new Error('Expected array data not found in response');
            }
        } catch (parseError) {
            console.error('Parse Error:', parseError);
            throw new Error(`Gagal memproses data: ${parseError.message}`);
        }

        // DOM manipulation
        const tbody = document.querySelector('.data-masuk');
        if (!tbody) {
            throw new Error('Target table body element not found');
        }

        // Clear existing content
        tbody.innerHTML = '';

        // Process each item
        data.data.forEach(item => {
            try {
                // Validate required fields
                const requiredFields = ['no_registrasi','nobooking', 'noppbb', 'userid', 
                                      'namawajibpajak', 'namapemilikobjekpajak', 'tanggal_terima', 'status', 'trackstatus'];
                
                const missingFields = requiredFields.filter(field => !item[field]);
                if (missingFields.length > 0) {
                    console.warn(`Item with nobooking ${item.nobooking || 'unknown'} is missing fields:`, missingFields);
                    return; // Skip this item
                }

                // Create table row
                const row = tbody.insertRow();
                
                // Add basic data cells
                requiredFields.forEach((field, index) => {
                    const cell = row.insertCell(index);
                    cell.textContent = item[field] || '-';
                });

                // Add action button
                const sendCell = row.insertCell(9);
                const sendButton = document.createElement('button');
                sendButton.textContent = 'Kirim';
                sendButton.classList.add('btn-kirim-document');
                
                sendButton.addEventListener('click', async () => {
                    try {
                        const confirmation = window.confirm("Apakah kamu yakin ingin mengirim data ini? Sudah diperiksa?");
                        
                        if (confirmation) {
                            if (!item || !item.nobooking || !item.userid || !item.namawajibpajak || !item.namapemilikobjekpajak) {
                                throw new Error("Data yang diperlukan tidak lengkap.");
                            }

                            const result = await sendToParafKasie(item);
                            if (result.success) {
                                sendButton.disabled = true;
                                sendButton.textContent = 'Data Terkirim';
                                alert("Data berhasil dikirim ke peneliti paraf!");
                            } else {
                                throw new Error(result.message || "Gagal mengirim data ke peneliti.");
                            }
                        } else {
                            alert("Data tidak jadi dikirim.");
                        }
                    } catch (buttonError) {
                        console.error('Button Action Error:', buttonError);
                        alert(`Terjadi kesalahan: ${buttonError.message}`);
                    }
                });
                
                sendCell.appendChild(sendButton);

                // Create dropdown row - PRESERVED FROM ORIGINAL CODE
                // data html akan tertampil menggunakan fungsi dropdown di dalam baris tabel
                const dropdownRow = document.createElement('tr');
                const dropdownContent = document.createElement('td');
                dropdownContent.colSpan = 10;
                dropdownContent.style.display = 'none';
                
                try {
                    dropdownContent.innerHTML = `
                        <p>No. registrasi: ${item.nobooking}</p>
                        ${item.peneliti_tanda_tangan_path ? `
                            <div class="form-group approval-section">
                                <label>
                                    <input type="radio" name="ParafVerif-${item.nobooking}" value="ya" required> Setujui Paraf
                                </label>
                                <div class="signature-preview">
                                    <p>Tanda Tangan Saat Ini:</p>
                                    <img src="${item.peneliti_tanda_tangan_path}"  // Langsung gunakan path dari API
                                        alt="Tanda Tangan" 
                                        class="signature-image"
                                        onerror="this.style.display='none'">
                                </div>
                        ` : `
                            <div class="alert alert-warning">
                                Tidak dapat memberikan persetujuan - tanda tangan belum diunggah
                            </div>
                            <input type="hidden" name="ParafVerif-${item.nobooking}" value="null">
                        `}
                        <!---->
                        ${item.pemilihan ? `
                            <p>Jumlah setoran berdasarkan:</p>
                            <div class="form-group">
                                <input type="radio" class="penghitungwajibpajak" name="pemilihan-${item.nobooking}" value="penghitung_wajib_pajak" ${item.pemilihan === 'penghitung_wajib_pajak' ? 'checked' : ''}>
                                <label>Penghitungan wajib pajak</label>
                            </div> <br>
                            <div class="form-group">
                                <input type="radio" class="stpdkurangbayar" name="pemilihan-${item.nobooking}" value="stpd_kurangbayar" ${item.pemilihan === 'stpd_kurangbayar' ? 'checked' : ''}>
                                <label>STPD kurang bayar</label>
                                <div class="sub-inputs stpdkurangbayar-sub-input" data-parent="stpdkurangbayar">
                                    <input type="text" class="nomorstpd" name="nomorstpd" placeholder="Nomor STPD" value="${item.nomorstpd || ''}">
                                    <input type="date" class="tanggalstpd" name="tanggalstpd" value="${item.tanggalstpd || ''}">
                                </div>
                            </div>
                            <div class="form-group">
                                <input type="radio" class="dihitungsendiri" name="pemilihan-${item.nobooking}" value="dihitungsendiri" ${item.pemilihan === 'dihitungsendiri' ? 'checked' : ''}>
                                <label>Pengurangan dihitung sendiri</label>
                                <div class="sub-inputs dihitungsendiri-sub-input" data-parent="dihitungsendiri">
                                    <input type="number" class="angkapersen" name="angkapersen" placeholder="0-100" min="0" max="100" step="0.01" value="${item.angkapersen || ''}">
                                    <span>%</span>
                                    <input type="text" class="keterangandihitungSendiri" name="keteranganhitungsendiri" placeholder="Berdasarkan..." value="${item.keterangandihitungSendiri || ''}">
                                </div>
                            </div>
                            <div class="form-group">
                                <input type="radio" class="lainnyapenghitungwp" name="pemilihan-${item.nobooking}" value="lainnyapenghitungwp" ${item.pemilihan === 'lainnyapenghitungwp' ? 'checked' : ''}>
                                <label>Lainnya</label>
                                <div class="sub-inputs lainnyapenghitungwp-sub-input" data-parent="lainnyapenghitungwp">
                                    <input type="text" class="isiketeranganlainnya" name="isiketeranganlainnya" placeholder="Isikan disini..." value="${item.isiketeranganlainnya || ''}">
                                </div>
                            </div>
                        ` : `
                            <input type="radio" class="penghitungwajibpajak" name="pemilihan-${item.nobooking}" value="penghitung_wajib_pajak">
                            <label>Penghitungan wajib pajak</label>
                            <input type="radio" class="stpdkurangbayar" name="pemilihan-${item.nobooking}" value="stpd_kurangbayar">
                            <label>STPD kurang bayar</label>
                            <div class="sub-inputs stpdkurangbayar-sub-input" data-parent="stpdkurangbayar">
                                <input type="text" class="nomorstpd" name="nomorstpd-${item.nobooking}" placeholder="Nomor STPD">
                                <input type="date" class="tanggalstpd" name="tanggalstpd-${item.nobooking}">
                            </div>
                            <input type="radio" class="dihitungsendiri" name="pemilihan-${item.nobooking}" value="dihitungsendiri">
                            <label>Pengurangan dihitung sendiri</label>
                            <div class="sub-inputs dihitungsendiri-sub-input" data-parent="dihitungsendiri">
                                <input type="number" class="angkapersen" name="angkapersen-${item.nobooking}" placeholder="0-100" min="0" max="100" step="0.01">
                                <span>%</span>
                                <input type="text" class="keterangandihitungSendiri" name="keteranganhitungsendiri-${item.nobooking}" placeholder="Berdasarkan...">
                            </div>
                            <input type="radio" class="lainnyapenghitungwp" name="pemilihan-${item.nobooking}" value="lainnyapenghitungwp">
                            <label>Lainnya</label>
                            <div class="sub-inputs lainnyapenghitungwp-sub-input" data-parent="lainnyapenghitungwp">
                                <input type="text" class="isiketeranganlainnya" name="isiketeranganlainnya-${item.nobooking}" placeholder="Isikan disini...">
                            </div>
                        `}
                        <button type="button" class="btn-simpaninput" data-nobooking="${item.nobooking}" onclick="simpanData(this)">
                            <span class="btn-text">Simpan</span>
                            <span class="spinner" hidden>
                                <i class="fa fa-spinner fa-spin"></i>
                            </span>
                        </button>
                        <p>File Upload</p>
                            <div id="file-info-${item.nobooking}">
                            <!-- Akta Tanah -->
                            ${item.akta_tanah_path ? 
                                item.akta_tanah_path.endsWith('.pdf') ? 
                                `<p>Akta Tanah: <a href="/${item.akta_tanah_path}" target="_blank">
                                <button class="btn-view">View PDF</button>
                                </a></p>` : 
                                `<p>Akta Tanah: <a href="/${item.akta_tanah_path}" target="_blank">
                                <img src="/${item.akta_tanah_path}" alt="Akta Tanah" style="max-width: 100px; max-height: 100px;" onerror="this.onerror=null;this.src='/path-to-default-image.jpg'">
                                </a></p>`
                            : ''}

                            <!-- Sertifikat Tanah -->
                            ${item.sertifikat_tanah_path ? 
                                item.sertifikat_tanah_path.endsWith('.pdf') ? 
                                `<p>Sertifikat Tanah: <a href="/${item.sertifikat_tanah_path}" target="_blank">
                                <button class="btn-view">View PDF</button>
                                </a></p>` : 
                                `<p>Sertifikat Tanah: <a href="/${item.sertifikat_tanah_path}" target="_blank">
                                <img src="/${item.sertifikat_tanah_path}" alt="Sertifikat Tanah" style="max-width: 100px; max-height: 100px;" onerror="this.onerror=null;this.src='/path-to-default-image.jpg'">
                                </a></p>`
                            : ''}

                            <!-- File Pelengkap -->
                            ${item.pelengkap_path ? 
                                item.pelengkap_path.endsWith('.pdf') ? 
                                `<p>File Pelengkap: <a href="/${item.pelengkap_path}" target="_blank">
                                <button class="btn-view">View PDF</button>
                                </a></p>` : 
                                `<p>File Pelengkap: <a href="/${item.pelengkap_path}" target="_blank">
                                <img src="/${item.pelengkap_path}" alt="Pelengkap Image" style="max-width: 100px; max-height: 100px;" onerror="this.onerror=null;this.src='/path-to-default-image.jpg'">
                                </a></p>`
                            : ''}
                            </div>
                    `;
                    
                } catch (dropdownError) {
                    console.error('Dropdown Creation Error:', dropdownError);
                    dropdownContent.innerHTML = '<p>Gagal memuat detail data</p>';
                }

                dropdownRow.appendChild(dropdownContent);
                tbody.appendChild(dropdownRow);

                // Row click handler for dropdown toggle
                row.addEventListener('click', function() {
                    try {
                        selectedNoBooking = item.nobooking;
                        console.log(`Selected No Booking: ${selectedNoBooking}`);
    
                        if (typeof enableViewDocumentButton === 'function') {
                            enableViewDocumentButton(item.nobooking);
                        }                    
                        const isVisible = dropdownContent.style.display === 'table-cell';
                        dropdownContent.style.display = isVisible ? 'none' : 'table-cell';
                        
                        
                        if (!isVisible) {
                            let nextRow = row.nextElementSibling;
                            while (nextRow) {
                                nextRow.style.marginTop = '20px';
                                nextRow = nextRow.nextElementSibling;
                            }
                        }
                    } catch (clickError) {
                        console.error('Row Click Handler Error:', clickError);
                    }
                });

            } catch (itemError) {
                console.error('Error processing item:', itemError);
                // Create error row for failed items
                const errorRow = tbody.insertRow();
                const errorCell = errorRow.insertCell(0);
                errorCell.colSpan = 10;
                errorCell.textContent = `Gagal memuat data item: ${itemError.message}`;
                errorCell.style.color = 'red';
            }
        });

        // Show empty state if no valid data
        if (tbody.children.length === 0) {
            const emptyRow = tbody.insertRow();
            const emptyCell = emptyRow.insertCell(0);
            emptyCell.colSpan = 10;
            emptyCell.textContent = 'Tidak ada data yang valid untuk ditampilkan';
        }

    } catch (mainError) {
        console.error('Main Function Error:', mainError);
        
        // Show error to user
        const errorContainer = document.querySelector('.data-masuk') || document.body;
        errorContainer.innerHTML = `
            <div class="error-message">
                <h3>Terjadi Kesalahan</h3>
                <p>${mainError.message}</p>
                <button onclick="location.reload()">Coba Lagi</button>
            </div>
        `;
    }
}
// Menambahkan event listener untuk setiap baris dalam tabel
document.querySelectorAll('#penelitiverifikasiTable tbody tr').forEach(row => {
    row.addEventListener('click', function() {
        // Mendapatkan nilai noBooking dari kolom pertama
        selectedNoBooking = row.cells[0].textContent.trim();  // Kolom pertama adalah No. Booking
        console.log(`No Booking yang dipilih: ${selectedNoBooking}`);  // Debugging
    });
});
function getUserDivisi() {
    return localStorage.getItem('divisi') || sessionStorage.getItem('divisi');
}
localStorage.setItem('divisi', 'Peneliti');
// Atau
sessionStorage.setItem('divisi', 'Peneliti');
/// end fungsi utama
////////////////////////////////////////////////////////////////////////////////////////////////////////////
function enableViewDocumentButton(nobooking) {
    // Temukan tombol "View Dokumen" dan aktifkan
    const viewPdfButton = document.querySelector('.btn.viewpdf');
    
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

    try {
        const response = await fetch(`/api/getCreatorByBooking/${encodeURIComponent(nobooking)}`);
        const data = await response.json();  // Mengonversi respons ke JSON
        if (response.ok && data && data.userid) {
            const creatorUserid = data.userid;  // Ambil userid pembuat berdasarkan nobooking
            // Buat URL untuk mengakses PDF menggunakan userid pembuat
            const pdfUrl = `http://localhost:3000/api/peneliti_lanjutan-generate-pdf-badan/${encodeURIComponent(nobooking)}?userid=${encodeURIComponent(creatorUserid)}&nama=${encodeURIComponent(data.nama)}`;

            // Jika response sukses, buka PDF
            window.open(pdfUrl, '_blank');
        } else {
            alert('Gagal memuat dokumen PDF.');
        }
    } catch (error) {
        console.error('Error fetching the PDF:', error);
        alert('Terjadi kesalahan saat mengambil dokumen PDF.');
    }
}
///////////////////////////////////////////////////////////////////////////////////////////////////
function resetSignatureForm() {
    document.getElementById('signature_verif').value = '';
    document.getElementById('preview').style.display = 'none';
}//
function previewImage(event, previewId) {
    const file = event.target.files[0];
    if (!file) return;
    // Validasi tipe file
    const validTypes = ['image/jpeg', 'image/png'];
    if (!validTypes.includes(file.type)) {
        showAlert('error', 'Hanya file JPG/PNG yang diperbolehkan!');
        event.target.value = ''; // Reset input
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.getElementById(previewId);
        preview.src = e.target.result;
        preview.style.display = 'block';
    };
    reader.readAsDataURL(file);
}
// Helper functions
function toggleLoading(show) {
    const btn = document.getElementById('uploadttd');
    const loadingIndicator = document.getElementById('loadingIndicator') || createLoadingIndicator();
    if (show) {
        btn.disabled = true;
        loadingIndicator.style.display = 'inline-block';
    } else {
        btn.disabled = false;
        loadingIndicator.style.display = 'none';
    }
}
function createLoadingIndicator() {
    const indicator = document.createElement('span');
    indicator.id = 'loadingIndicator';
    indicator.style.display = 'none';
    indicator.innerHTML = ' &nbsp;<i class="fa fa-spinner fa-spin"></i>';
    document.getElementById('uploadttd').appendChild(indicator);
    return indicator;
}
function showAlert(type, message) {
    // Ganti dengan library notifikasi atau custom alert Anda
    alert(`${type.toUpperCase()}: ${message}`);
}

//
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
async function simpanData(buttonElement) {
    const nobooking = buttonElement.dataset.nobooking;
    if (!nobooking) {
        alert("Data nobooking tidak valid!");
        return;
    }
    const submitButton = buttonElement;
    const btnText = submitButton.querySelector('.btn-text');
    const spinner = submitButton.querySelector('.spinner');
    btnText.hidden = true;
    spinner.hidden = false;
    submitButton.disabled = true;

    try {
        console.log('Memproses No Booking:', nobooking);
        const signatureCheck = await fetch('/api/peneliti/check-signature');
        const { has_signature } = await signatureCheck.json();
        if (!has_signature) {
            throw new Error('Anda belum mengunggah tanda tangan!');
        }

        const persetujuanVerif = document.querySelector(`input[name="ParafVerif-${nobooking}"]:checked`)?.value;
        if (!persetujuanVerif) {
            throw new Error('Harap pilih setujui agar dapat mengetahui dokumen telah di cek');
        }
        let userData;
        try {
            const userResponse = await fetch('/api/profile', { 
                credentials: 'include',
                headers: {
                    'Accept': 'application/json'
                }
            });
            if (!userResponse.ok) {
                throw new Error(`HTTP ${userResponse.status} - ${userResponse.statusText}`);
            }
            userData = await userResponse.json();
            if (!userData?.userid) {
                throw new Error('Data user tidak lengkap');
            }
        } catch (error) {
            console.error('Error fetching user:', error);
            throw new Error(`Gagal memuat profil: ${error.message}`);
        }
        if (userData.divisi !== 'Peneliti') {  // Ganti `divisi` -> `userData.divisi`
            throw new Error('Hanya divisi Peneliti yang dapat menyetujui');
        }
        const tandaTanganResponse = await fetch(`/api/get-tanda-tangan?userid=${userData.userid}`);  // Ganti `userid` -> `userData.userid`
        if (!tandaTanganResponse.ok) {
            throw new Error('Gagal mengambil tanda tangan');
        }

        const blob = await tandaTanganResponse.blob();
        const base64TandaTangan = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        });

        // 6. Proses pilihan
        let pemilihan = '';
        let nomorstpd = null;
        let tanggalstpd = null;
        let angkapersen = null;
        let keterangandihitungSendiri = null;
        let isiketeranganlainnya = null;

        const radioButtons = document.querySelectorAll(`input[name="pemilihan-${selectedNoBooking}"]`);
        for (let radioButton of radioButtons) {
            if (radioButton.checked) {
                pemilihan = radioButton.value;
                break;
            }
        }

        // Validasi berdasarkan pilihan
        if (!pemilihan) {
            throw new Error("Harap pilih salah satu opsi.");
        }

        if (pemilihan === 'stpd_kurangbayar') {
            nomorstpd = document.querySelector(`input[name="nomorstpd-${selectedNoBooking}"]`).value;
            tanggalstpd = document.querySelector(`input[name="tanggalstpd-${selectedNoBooking}"]`).value;
            if (!nomorstpd || !tanggalstpd) {
                throw new Error("Harap isi nomor STPD dan tanggal STPD.");
            }
        } 
        else if (pemilihan === 'dihitungsendiri') {
            angkapersen = parseFloat(document.querySelector(`input[name="angkapersen-${selectedNoBooking}"]`).value);
            if (isNaN(angkapersen) || angkapersen < 0 || angkapersen > 100) {
                throw new Error("Persen harus antara 0-100");
            }
            keterangandihitungSendiri = document.querySelector(`input[name="keteranganhitungsendiri-${selectedNoBooking}"]`).value;
            if (!keterangandihitungSendiri) {
                throw new Error("Harap isi keterangan penghitungan");
            }
        } 
        else if (pemilihan === 'lainnyapenghitungwp') {
            isiketeranganlainnya = document.querySelector(`input[name="isiketeranganlainnya-${selectedNoBooking}"]`).value;
            if (!isiketeranganlainnya) {
                throw new Error("Harap isi keterangan lainnya");
            }
        }

        // 7. Siapkan data untuk dikirim
        const data = {
            userid: userData.userid,
            nobooking: selectedNoBooking,
            pemilihan: pemilihan,
            nomorstpd: nomorstpd,
            tanggalstpd: tanggalstpd,
            angkapersen: angkapersen,
            keterangandihitungSendiri: keterangandihitungSendiri,
            isiketeranganlainnya: isiketeranganlainnya,
            persetujuanVerif: persetujuanVerif,
            tanda_tangan_blob: base64TandaTangan
        };

        // 8. Kirim data ke backend dengan timeout
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const saveResponse = await fetch('http://localhost:3000/api/peneliti_update-berdasarkan-pemilihan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data }),
            signal: controller.signal
        });
        
        clearTimeout(timeout);

        if (!saveResponse.ok) {
            throw new Error(await saveResponse.text());
        }
        
        if (persetujuanVerif === 'ya') {
            await fetch('/api/peneliti/transfer-signature', {
                method: 'POST',
                credentials: 'include'
            });
        }

        alert("Data berhasil disimpan!");
        location.reload();

    } catch (error) {
        console.error('Error:', error);
        if (error.name === 'AbortError') {
            alert('Request timeout, silakan coba lagi');
        } else {
            alert(`Error: ${error.message}`);
        }
    } finally {
        if (submitButton) {
            btnText.hidden = false;
            spinner.hidden = true;
            submitButton.disabled = false;
        }
    }
}
//
//////
// Fungsi untuk generate PDF
// pada bagian ini masih ada tracking
async function generatePDF(nobooking, base64TandaTangan) {
    try {
        const response = await fetch(`http://localhost:3000/api/peneliti_lanjutan-generate-pdf-badan/${nobooking}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                signature: base64TandaTangan
            })
        });

        if (!response.ok) {
            throw new Error('Failed to generate PDF');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `document_${nobooking}.pdf`;
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 100);
    } catch (error) {
        console.error('Error generating PDF:', error);
        alert(`Gagal generate PDF: ${error.message}`);
    }
}
////
function resetNamaPemverifikasi(nobooking) {
    fetch('http://localhost:3000/api/reset-nama-pemverifikasi', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ nobooking: nobooking })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Nama Pemverifikasi berhasil di-reset!');
            location.reload(); // Reload halaman untuk melihat perubahan
            // Update tampilan di frontend jika perlu, misalnya mengosongkan input field atau mengubah tampilan di tabel
        } else {
            alert('Gagal mereset nama pemverifikasi.');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Terjadi kesalahan saat mereset nama pemverifikasi.');
    });
}
////
///
//
////
///
//
// Fungsi untuk mengirim data ke peneliti
async function sendToParafKasie(item) {
    try {
        const response = await fetch('http://localhost:3000/api/peneliti_send-to-paraf', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                nobooking: item.nobooking,
                userid: item.userid,
                namawajibpajak: item.namawajibpajak,
                namapemilikobjekpajak: item.namapemilikobjekpajak,
                tanggal_terima: item.tanggal_terima,
                status: 'Dikerjakan',  // Status yang dikirim dari frontend
                trackstatus: 'Diverifikasi',  // Trackstatus yang dikirim dari frontend
                keterangan: item.keterangan,
                no_registrasi: item.no_registrasi
            }),
        });

        const result = await response.json();
        if (result.success) {
            alert('Data berhasil dikirim ke peneliti!');
        } else {
            alert('Gagal mengirim data ke peneliti.');
        }
        return result;
    } catch (error) {
        console.error('Error sending data to peneliti:', error);
        alert('Terjadi kesalahan saat mengirim data.');
    }
}


  ///
window.onload = loadTableDataPenelitiV;