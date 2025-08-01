let selectedNoBooking = null;

async function loadTableLSB() {
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
                fetch('http://localhost:3000/api/LSB_berkas_complete'),
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
                const requiredFields = ['nobooking', 'noppbb', 'tahunajb', 'userid', 
                                      'namawajibpajak', 'namapemilikobjekpajak', 'status', 'trackstatus'];
                
                const missingFields = requiredFields.filter(field => !item[field]);
                if (missingFields.length > 0) {
                    console.warn(`Item with nobooking ${item.nobooking || 'unknown'} is missing fields:`, missingFields);
                    return; // Skip this item
                }

                // Create table row
                const row = tbody.insertRow();      
                row.setAttribute('data-nobooking', item.nobooking);          
                // Add basic data cells
                requiredFields.forEach((field, index) => {
                    const cell = row.insertCell(index);
                    cell.textContent = item[field] || '-';
                });

                // Add action button
                const sendCell = row.insertCell(8);
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

                            const result = await sendToPPATK_complete(item);
                            if (result.success) {
                                sendButton.disabled = true;
                                sendButton.textContent = 'Data Terkirim';
                                alert("Data berhasil dikirim ke PPATK Terkait!");
                            } else {
                                throw new Error(result.message || "Gagal mengirim data ke PPATK.");
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

                    // Menambahkan event listener untuk setiap baris setelah data dimuat
                const rows = document.querySelectorAll('#LSBTable tbody tr');
                rows.forEach(row => {
                    row.addEventListener('click', function() {
                        // Handle row click here (open dropdown, validate data, etc.)
                        console.log('Baris dengan nobooking ' + row.getAttribute('data-nobooking') + ' diklik!');
                    });
                });
                // Create dropdown row - PRESERVED FROM ORIGINAL CODE
                // data html akan tertampil menggunakan fungsi dropdown di dalam baris tabel
                const dropdownRow = document.createElement('tr');
                const dropdownContent = document.createElement('td');
                dropdownContent.colSpan = 9;
                dropdownContent.style.display = 'none';
                
                try {
                    dropdownContent.innerHTML = generateDropdownContent(item);

                } catch (dropdownError) {
                    console.error('Dropdown Creation Error:', dropdownError);
                    dropdownContent.innerHTML = '<p>Gagal memuat detail data</p>';
                }

                dropdownRow.appendChild(dropdownContent);
                tbody.appendChild(dropdownRow);

                ////
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
                errorCell.colSpan = 9;
                errorCell.textContent = `Gagal memuat data item: ${itemError.message}`;
                errorCell.style.color = 'red';
            }
        });

        // Show empty state if no valid data
        if (tbody.children.length === 0) {
            const emptyRow = tbody.insertRow();
            const emptyCell = emptyRow.insertCell(0);
            emptyCell.colSpan = 9;
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
function generateDropdownContent(item) {
    return `
        <p>No. registrasi: ${item.nobooking}</p>
        <br />
        <p>File Upload</p>
        <div id="file-info-${item.nobooking}">
            ${generateFileLink(item.akta_tanah_path, 'Akta Tanah')}
            ${generateFileLink(item.sertifikat_tanah_path, 'Sertifikat Tanah')}
            ${generateFileLink(item.pelengkap_path, 'File Pelengkap')}
            ${generateFileLink(item.file_withstempel_path, 'File stempel')}
        </div>
        <!--File complete di unduh dan di upload-->
        <p>Upload Files yang di unduh dan letakkan disini</p>
        ${item.file_withstempel_path ? 
            `<p>File yang sudah di stempel: <a href="/${item.file_withstempel_path}" target="_blank">${item.file_withstempel_path.split('/').pop()}</a></p>` : 
            `<label for="FileStempel-${item.nobooking}">Upload File dengan stempel (PDF):</label>
            <input type="file" id="FileStempel-${item.nobooking}" name="FileStempel" accept="application/pdf"><br>`}
        <button onclick="uploadFilesStempel('${item.nobooking}')">Upload Files (with stempel)</button>

    `;

}
function generateFileLink(path, label) {
    return path ? 
        `<p>${label}: <a href="/${path}" target="_blank"><button class="btn-view">View</button></a></p>` : '';
}
document.querySelectorAll('#LSBTable tbody tr').forEach(row => {
    row.addEventListener('click', function() {
        try {
            // Menyimpan nobooking yang dipilih
            selectedNoBooking = row.cells[0].textContent.trim();  // Kolom pertama adalah No. Booking
            console.log(`No Booking yang dipilih: ${selectedNoBooking}`);  // Debugging

            // Memastikan form dan input terkait ditangani
            const item = data.data.find(item => item.nobooking === selectedNoBooking);  // Cari item berdasarkan nobooking
            if (item) {
                // Memanggil fungsi untuk menambahkan event listeners ke form dan input terkait
                addEventListenersForItem(item);
            }

            // Menangani tampilan dropdown
            const dropdownContent = row.nextElementSibling.querySelector('td');
            const isVisible = dropdownContent.style.display === 'table-cell';
            dropdownContent.style.display = isVisible ? 'none' : 'table-cell';

            // Memberikan margin top pada baris berikutnya jika dropdown dibuka
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
});
// Fungsi untuk mendapatkan divisi pengguna
function getUserDivisi() {
    return localStorage.getItem('divisi') || sessionStorage.getItem('divisi');
}
localStorage.setItem('divisi', 'Peneliti');
// Atau
sessionStorage.setItem('divisi', 'Peneliti');
/// end fungsi utama
////////////////////// END FU   ///////////////////////////////////////////////////////////////////
async function validateNoBooking(nobooking) {
    try {
        const response = await fetch(`http://localhost:3000/api/validate-nobooking/${nobooking}`);
        const result = await response.json();
        return result.isValid;  // Mengembalikan status validasi
    } catch (error) {
        console.error('Error validating nobooking:', error);
        return false;
    }
}
/////////////////////////////////////////////
async function uploadFilesStempel(selectedNoBooking) {
    try {
        const userid = localStorage.getItem('userid') || sessionStorage.getItem('userid');
        if (!userid) {
            alert('User ID tidak ditemukan!');
            return;
        }

        const fileInput = document.getElementById(`FileStempel-${selectedNoBooking}`);
        if (!fileInput?.files[0]) {
            alert('Harap pilih file untuk diupload!');
            return;
        }

        const fileStempel = fileInput.files[0];
        const validFileTypes = ['application/pdf'];
        
        if (!validFileTypes.includes(fileStempel.type)) {
            const fileStatus = document.getElementById(`fileStatus-${selectedNoBooking}`);
            if (fileStatus) {
                fileStatus.textContent = "Hanya file PDF yang diperbolehkan!";
                fileStatus.style.color = "red";
            }
            alert('Hanya file PDF yang diperbolehkan!');
            return;
        }

        const formData = new FormData();
        formData.append('data', JSON.stringify({ 
            userid: userid,
            nobooking: selectedNoBooking 
        }));
        formData.append('FileStempel', fileStempel);
        const response = await fetch('http://localhost:3000/api/LSB_upload-filestempel', {
            method: 'POST',
            body: formData
        });
        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.message || 'Gagal meng-upload file');
        }

        if (responseData.success) {
            alert('File berhasil di-upload!');
            window.location.reload();
        } else {
            alert(responseData.message || 'Gagal meng-upload file');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Terjadi kesalahan saat meng-upload file: ' + error.message);
    }
}
////////////////////// END VN   ///////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
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
/////////////////////////////////////////////////////////////////////////////////////////////////////

//
// Fungsi untuk mengirim data ke peneliti
async function sendToPPATK_complete(item) {
    try {
        const response = await fetch('http://localhost:3000/api/peneliti_send-to-LSB', {
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
                status: 'Terselesaikan',  // Status yang dikirim dari frontend
                trackstatus: 'Terselesaikan',  // Trackstatus yang dikirim dari frontend
                keterangan: item.keterangan,
            }),
        });

        const result = await response.json();
        if (result.success) {
            alert('Data berhasil dikirim ke PPATK Terkait!');
        } else {
            alert('Gagal mengirim data ke PPATK Terkait.');
        }
        return result;
    } catch (error) {
        console.error('Error sending data to PPATK:', error);
        alert('Terjadi kesalahan saat mengirim data.');
    }
}
////

  ///
window.onload = loadTableLSB;