let selectedNoBooking = null;
// Fungsi untuk memuat data ke dalam tabel
async function loadTableDataLTB() {
    const userDivisi = getUserDivisi();

    // Cek apakah divisi adalah LTB
    if (userDivisi !== 'LTB') {
        alert('Anda tidak memiliki akses ke data LTB.');
        return;  // Menghentikan eksekusi jika divisi bukan LTB
    }

    try {
        const response = await fetch('http://localhost:3000/api/ltb_get-ltb-berkas'); // Endpoint API untuk mendapatkan data berkas LTB
        const data = await response.json();

        // Log untuk melihat apakah data berhasil di-fetch
        console.log("Fetched Data:", data);

        if (data.success) {
            const tbody = document.querySelector('.data-masuk');

            // Menghapus baris lama jika ada
            tbody.innerHTML = '';

            // Loop melalui data dan menambahkannya ke dalam tabel
            data.data.forEach(item => {
                const row = tbody.insertRow();

                // Menambahkan data ke dalam setiap sel
                row.insertCell(0).textContent = item.no_registrasi;
                row.insertCell(1).textContent = item.nobooking;
                row.insertCell(2).textContent = item.noppbb;
                row.insertCell(3).textContent = item.namawajibpajak;
                row.insertCell(4).textContent = item.namapemilikobjekpajak;
                row.insertCell(5).textContent = item.tanggal_terima;
                row.insertCell(6).textContent = item.status;
                row.insertCell(7).textContent = item.trackstatus;

                // Kolom Keterangan, ditambah dengan tombol "View Document"
                const sendCell = row.insertCell(8);
                const sendButton = document.createElement('button');
                sendButton.textContent = 'Kirim';
                sendButton.classList.add('btn-kirim-document'); // Berikan kelas CSS untuk styling (optional)
                // Menambahkan event listener pada tombol
                sendButton.addEventListener('click', async () => {
                    const confirmation = window.confirm("Apakah kamu yakin ingin mengirim data ini? Sudah diperiksa?");

                    if (confirmation) {
                        if (!item || !item.nobooking || !item.userid || !item.namawajibpajak || !item.namapemilikobjekpajak) {
                            alert("Data yang diperlukan tidak lengkap.");
                            return;
                        }
                        // Jika pengguna mengklik "OK", maka kirim data
                        try {
                            const result = await sendToPeneliti(item);
                            if (result.success) {
                                // Ubah status tombol setelah sukses (misalnya menonaktifkan tombol)
                                sendButton.disabled = true;
                                sendButton.textContent = 'Data Terkirim';
                                alert("Data berhasil dikirim ke peneliti!");
                            } else {
                                alert("Gagal mengirim data ke peneliti.");
                            }
                        } catch (error) {
                            console.error("terjadi kesalahan", error)
                            alert("Terjadi kesalahan saat mengirim data.");
                        }
                    } else {
                        // Jika pengguna mengklik "Batal", tampilkan notifikasi
                        alert("Data tidak jadi dikirim.");
                    }
                });
                
                // Menambahkan tombol ke dalam sel di tabel
                sendCell.appendChild(sendButton);

                // Membuat dropdown row di bawah baris ini
                const dropdownRow = document.createElement('tr');
                const dropdownContent = document.createElement('td');
                dropdownContent.colSpan = 9;
                dropdownContent.style.display = 'none'; // Dropdown akan disembunyikan pertama kali
                dropdownContent.innerHTML = `
                    <p>No. Booking: ${item.nobooking}</p>
                    <p>File Upload</p>
                        <div id="file-info-${item.nobooking}">
                        <!-- Akta Tanah -->
                        ${item.akta_tanah_path ? 
                            item.akta_tanah_path.endsWith('.pdf') ? 
                            `<p>Akta: <a href="/${item.akta_tanah_path}" target="_blank">
                            <button class="btn-view">View PDF</button>
                            </a></p>` : 
                            `<p>Akta: <a href="/${item.akta_tanah_path}" target="_blank">
                            <img src="/${item.akta_tanah_path}" alt="Akta" style="max-width: 100px; max-height: 100px;" onerror="this.onerror=null;this.src='/path-to-default-image.jpg'">
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
                        <p>Form Permohonan Validasi</p>
                        <button data-nobooking="${item.nobooking}" onclick="viewPDF('${item.nobooking}')">View</button>
                `;
                
                dropdownRow.appendChild(dropdownContent);

                // Menambahkan event listener untuk klik pada baris tabel
                row.addEventListener('click', function() {
                    enableViewDocumentButton(item.nobooking);
                    selectedNoBooking = item.nobooking;
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
                });

                // Menambahkan baris dropdown ke dalam tabel
                tbody.appendChild(dropdownRow);
            });
        } else {
            alert('No data available');
        }
    } catch (error) {
        console.error('Error fetching data:', error);
        alert('An error occurred while fetching data.');
    }
}

function getUserDivisi() {
    return localStorage.getItem('divisi') || sessionStorage.getItem('divisi');
}
///
localStorage.setItem('divisi', 'LTB');
// Atau
sessionStorage.setItem('divisi', 'LTB');
///
// Menambahkan event listener untuk setiap baris dalam tabel
document.querySelectorAll('#ltbBerkasTable tbody tr').forEach(row => {
    row.addEventListener('click', function() {
        // Mendapatkan nilai noBooking dari kolom pertama
        selectedNoBooking = row.cells[0].textContent.trim();  // Kolom pertama adalah No. Booking
        console.log(`No Booking yang dipilih: ${selectedNoBooking}`);  // Debugging
    });
});
///
//
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
            const pdfUrl = `http://localhost:3000/api/ppatk_generate-pdf-badan/${encodeURIComponent(nobooking)}?userid=${encodeURIComponent(creatorUserid)}&nama=${encodeURIComponent(data.nama)}`;

            // Jika response sukses, buka PDF
            window.open(pdfUrl, '_blank');
        } else {
            alert('Gagal memuat dokumen PDF SSPD.');
        }
    } catch (error) {
        console.error('Error fetching the PDF:', error);
        alert('Terjadi kesalahan saat mengambil dokumen PDF.');
    }
}
////////////    ///////////////////////////
async function viewPDF(nobooking) {
    // Validasi nobooking
    if (!nobooking) {
        alert('No Booking tidak valid!');
        return;
    }

    // Ambil user credentials
    const userid = sessionStorage.getItem('userid') || localStorage.getItem('userid');
    const nama = sessionStorage.getItem('nama') || localStorage.getItem('nama');

    if (!userid || !nama) {
        alert('User ID atau Nama tidak ditemukan.');
        return;
    }

    try {
        // 1. Fetch data creator
        const creatorResponse = await fetch(`/api/getCreatorMohonValidasi/${encodeURIComponent(nobooking)}`);
        
        if (!creatorResponse.ok) {
            const errorData = await creatorResponse.json().catch(() => null);
            throw new Error(errorData?.error || 'Gagal memuat data pembuat dokumen');
        }

        const { success, data, error } = await creatorResponse.json();
        if (!success || !data?.userid) {
            throw new Error(error || 'Data pembuat tidak valid');
        }

        // 2. Siapkan URL PDF dengan parameter title
        const pdfTitle = `Permohonan Validasi ${nobooking}`;
        const pdfUrl = `/api/ppatk_generate-pdf-mohon-validasi/${
            encodeURIComponent(nobooking)
        }?userid=${
            encodeURIComponent(data.userid)
        }&nama=${
            encodeURIComponent(data.nama)
        }&title=${
            encodeURIComponent(pdfTitle)
        }#title=${encodeURIComponent(pdfTitle)}`;

        // 3. Buka PDF dengan tiga lapis solusi:
        // - Solusi #3: Iframe dengan judul custom (paling reliable)
        const pdfViewerHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${pdfTitle}</title>
            <style>body,embed{margin:0;padding:0;overflow:hidden;height:100vh;width:100%}</style>
        </head>
        <body>
            <embed 
                src="${pdfUrl}" 
                type="application/pdf" 
                width="100%" 
                height="100%" 
            />
        </body>
        </html>`;

        const newWindow = window.open('', '_blank');
        
        // Fallback untuk browser yang memblokir document.write
        try {
            newWindow.document.write(pdfViewerHTML);
            newWindow.document.close();
        } catch (e) {
            console.warn('Gagal menggunakan iframe, fallback ke direct open');
            newWindow.location.href = pdfUrl;
            newWindow.document.title = pdfTitle;
        }

    } catch (error) {
        console.error('Error:', error);
        alert(`Gagal memuat dokumen: ${error.message}`);
    }
}
////////////////////////           /////////////////////////
// Fungsi untuk mengonfirmasi penolakan
async function confirmReject() {
    const rejectionReason = document.getElementById('rejectionReason').value;
    if (!rejectionReason) {
        alert('Harap masukkan alasan penolakan!');
        return;
    }

    // Pastikan noBooking yang dipilih ada
    if (!selectedNoBooking) {
        alert('Silakan pilih dokumen yang akan ditolak.');
        return;
    }

    const userid = localStorage.getItem('userid') || sessionStorage.getItem('userid'); // Ambil userId yang valid

    if (!userid) {
        alert('User ID tidak ditemukan!');
        return;
    }
    try {
        // Kirim data penolakan ke backend
        const response = await fetch('http://localhost:3000/api/ltb_ltb-reject', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nobooking: selectedNoBooking,  // Gunakan selectedNoBooking
                trackstatus: 'Ditolak',
                rejectionReason: rejectionReason,
                userid: userid  // Gunakan userId yang valid
            })
        });
        const data = await response.json();
        console.log({
            nobooking: selectedNoBooking,
            trackstatus: 'Ditolak',
            rejectionReason: rejectionReason,
            userid: userid
        });
        if (data.success) {
            alert('Dokumen berhasil ditolak.');
            location.reload();  // Bisa disesuaikan dengan kebutuhan Anda
        } else {
            alert('Gagal menolak dokumen.');
        }
        // Menutup overlay setelah konfirmasi
        document.getElementById('overlay').style.display = 'none';
    } catch (error) {
        console.error('Terjadi kesalahan:', error);
        alert('Terjadi kesalahan, coba lagi nanti.');
    }
}

function showRejectOverlay() {
    document.getElementById('overlay').style.display = 'flex';  // Menampilkan overlay
}
function cancelReject() {
    document.getElementById('overlay').style.display = 'none';  // Menutup overlay
}
document.getElementById('tolakdokument').addEventListener('click', showRejectOverlay);

// Fungsi untuk mengirim data ke peneliti
async function sendToPeneliti(item) {
    try {
        const namaPengirim = sessionStorage.getItem('nama') || localStorage.getItem('nama');

        const response = await fetch('http://localhost:3000/api/ltb_send-to-peneliti', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                no_registrasi: item.no_registrasi,
                nobooking: item.nobooking,
                userid: item.userid,
                nama_pengirim: namaPengirim,
                namawajibpajak: item.namawajibpajak,
                namapemilikobjekpajak: item.namapemilikobjekpajak,
                tanggal_terima: item.tanggal_terima,
                status: 'Diajukan',
                trackstatus: 'Dilanjutkan',
                pengirim_ltb: `Dikirim oleh: ${namaPengirim} Loket Terima Berkas`
            }),
            credentials: 'include' // Untuk mengirim session cookie
        });

        const result = await response.json();
        
        if (result.success) {
            alert('Data berhasil dikirim ke peneliti!');
            window.location.reload(); 
        } else {
            alert(`Gagal: ${result.message || 'Terjadi kesalahan'}`);
        }
        return result;

    } catch (error) {
        console.error('Error:', error);
        alert('Koneksi gagal. Coba lagi atau hubungi admin.');
    }
}
window.onload = loadTableDataLTB;