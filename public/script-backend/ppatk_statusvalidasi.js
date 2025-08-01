document.addEventListener('DOMContentLoaded', function() {
    const tableBody = document.querySelector('#StatusValidTable tbody');
    const pagination = document.getElementById('pagination');
    const filterForm = document.getElementById('filterForm');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const itemsPerPageSelect = document.getElementById('itemsPerPage');
    const refreshButton = document.getElementById('refreshButton');

    let currentPage = 1;
    let itemsPerPage = parseInt(itemsPerPageSelect.value);

    // Load initial data
    loadData();

    // Event listeners
    filterForm.addEventListener('submit', function(e) {
        e.preventDefault();
        currentPage = 1;
        loadData();
    });

    itemsPerPageSelect.addEventListener('change', function() {
        itemsPerPage = parseInt(this.value);
        currentPage = 1;
        loadData();
    });

    refreshButton.addEventListener('click', function() {
        currentPage = 1;
        loadData();
    });

    // Function to load data
    async function loadData() {
        loadingIndicator.style.display = 'block';
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center">Memuat data...</td></tr>';

        try {
            const formData = new FormData(filterForm);
            const params = new URLSearchParams();
            
            // Tambahkan parameter filter
            if (formData.get('status')) params.append('status', formData.get('status'));
            if (formData.get('search')) params.append('search', formData.get('search'));
            
            params.append('page', currentPage);
            params.append('limit', itemsPerPage);

            const response = await fetch(`/api/ppatk_validasi?${params.toString()}`);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Gagal memuat data');
            }
            
            const result = await response.json();

            renderTable(result.data || []);
            renderPagination(result.pagination || {
                totalPages: 1,
                currentPage: 1,
                totalItems: result.data?.length || 0
            });

        } catch (error) {
            console.error('Error loading data:', error);
            tableBody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">Error: ${error.message}</td></tr>`;
            pagination.innerHTML = '';
        } finally {
            loadingIndicator.style.display = 'none';
        }
    }

    let selectedNomorValidasi = null;

    // Fungsi untuk mengaktifkan/menonaktifkan tombol View Dokumen
    function toggleViewButton(enable, nomor_validasi = null) {
        const viewPdfButton = document.getElementById('viewPdfButton');
        
        if (enable && nomor_validasi) {
            viewPdfButton.disabled = false;
            selectedNomorValidasi = nomor_validasi;
        } else {
            viewPdfButton.disabled = true;
            selectedNomorValidasi = null;
        }
    }

    // Function to render table
    async function renderTable(data) {
        // Kosongkan tabel
        tableBody.innerHTML = '';
        
        // Handle data kosong
        if (data.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="8" class="text-center">Tidak ada data ditemukan</td></tr>';
            return;
        }

        // Render setiap baris data
        tableBody.innerHTML = data.map(item => `
            <tr 
                data-id="${item.id}"
                data-nomor-validasi="${item.nomor_validasi || ''}"
                class="${item.selected ? 'selected' : ''}"
            >
                <td>${item.nomor_validasi || '-'}</td>
                <td>${item.nop || '-'}</td>
                <td>${item.user_id || '-'}</td>
                <td>${item.nama_pemohon || '-'}</td>
                <td>${item.nama_wajib_pajak || '-'}</td>
                <td>${item.atas_nama || '-'}</td>
                <td>${item.no_telepon || '-'}</td>
                <td>
                    <span class="badge ${item.status === 'used' ? 'badge-success' : 'badge-secondary'}">
                        ${item.status === 'used' ? 'Sudah Dipakai' : 'Tidak Dipakai'}
                    </span>
                </td>
            </tr>
        `).join('');

        // Tambahkan event listener untuk setiap baris
        document.querySelectorAll('#StatusValidTable tbody tr').forEach(row => {
            row.addEventListener('click', () => {
                // Hapus seleksi dari semua baris
                document.querySelectorAll('#StatusValidTable tbody tr').forEach(r => {
                    r.classList.remove('selected');
                });
                
                // Tambahkan seleksi ke baris yang diklik
                row.classList.add('selected');
                
                // Dapatkan nomor validasi dari atribut data
                const nomorValidasi = row.getAttribute('data-nomor-validasi');
                
                // Aktifkan tombol View Dokumen
                const viewPdfButton = document.querySelector('.btn.viewpdf');
                if (viewPdfButton && nomorValidasi) {
                    viewPdfButton.disabled = false;
                    
                    // Update fungsi onclick dengan nomor validasi terpilih
                    viewPdfButton.onclick = () => viewDocument(nomorValidasi);
                }
                
                // Panggil fungsi showDetailModal jika diperlukan
                const id = row.dataset.id;
                if (id) showDetailModal(id);
            });
        });
    }

    // Fungsi View Dokumen
    async function viewDocument() {
        if (!selectedNomorValidasi) {
            alert('Silakan pilih data terlebih dahulu');
            return;
        }

        try {
            // Ambil userid dari session
            const userid = sessionStorage.getItem('userid') || localStorage.getItem('userid');
            
            if (!userid) {
                alert('Anda harus login terlebih dahulu');
                return;
            }

            // Generate URL PDF dengan parameter download
            const pdfUrl = `/api/ppatk_generate-pdf-noval/${encodeURIComponent(selectedNomorValidasi)}?download=true&userid=${encodeURIComponent(userid)}`;
            
            // Buka di tab baru
            window.open(pdfUrl, '_blank');
            
        } catch (error) {
            console.error('Error viewing document:', error);
            alert('Gagal membuka dokumen: ' + error.message);
        }
    }

    // Inisialisasi
    document.addEventListener('DOMContentLoaded', () => {
        // Hubungkan tombol dengan fungsi viewDocument
        document.getElementById('viewPdfButton').addEventListener('click', viewDocument);
        
        // Load data tabel
        renderTableData();
    });


    // Function to render pagination
    function renderPagination(pagination) {
        const { totalPages, currentPage, totalItems } = pagination;
        
        if (totalItems === 0) {
            pagination.innerHTML = '';
            return;
        }
        
        let html = `
            <div class="pagination-info">
                Menampilkan halaman ${currentPage} dari ${totalPages} (Total ${totalItems} data)
            </div>
            <ul class="pagination">
                <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                    <a class="page-link" href="#" data-page="${currentPage - 1}">Sebelumnya</a>
                </li>
        `;

        // Show page numbers
        const maxPagesToShow = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
        let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

        if (endPage - startPage + 1 < maxPagesToShow) {
            startPage = Math.max(1, endPage - maxPagesToShow + 1);
        }

        if (startPage > 1) {
            html += `
                <li class="page-item">
                    <a class="page-link" href="#" data-page="1">1</a>
                </li>
                ${startPage > 2 ? '<li class="page-item disabled"><span class="page-link">...</span></li>' : ''}
            `;
        }

        for (let i = startPage; i <= endPage; i++) {
            html += `
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `;
        }

        if (endPage < totalPages) {
            html += `
                ${endPage < totalPages - 1 ? '<li class="page-item disabled"><span class="page-link">...</span></li>' : ''}
                <li class="page-item">
                    <a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a>
                </li>
            `;
        }

        html += `
                <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                    <a class="page-link" href="#" data-page="${currentPage + 1}">Selanjutnya</a>
                </li>
            </ul>
        `;
        
        pagination.innerHTML = html;

        // Add click events to pagination links
        document.querySelectorAll('.page-link[data-page]').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                currentPage = parseInt(this.dataset.page);
                loadData();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        });
    }

    // Function to show detail modal
    async function showDetailModal(id) {
        try {
            const modal = $('#detailModal');
            const modalBody = modal.find('.modal-body');
            
            modalBody.html(`
                <div class="text-center my-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="sr-only">Loading...</span>
                    </div>
                    <p>Memuat detail data...</p>
                </div>
            `);
            
            modal.modal('show');
            
            const response = await fetch(`/api/ppatk_validasi/${id}`);
            const result = await response.json();
            
            if (!response.ok) throw new Error(result.message || 'Gagal memuat detail');
            
            const data = result.data;
            
            modalBody.html(`
                <div class="row">
                    <div class="col-md-6">
                        <h6>Informasi Pemohon</h6>
                        <table class="table table-sm">
                            <tr>
                                <th width="40%">Nomor Validasi</th>
                                <td>${data.nomor_validasi || '-'}</td>
                            </tr>
                            <tr>
                                <th>Nama Pemohon</th>
                                <td>${data.nama_pemohon || '-'}</td>
                            </tr>
                            <tr>
                                <th>No. Telepon</th>
                                <td>${data.no_telepon || '-'}</td>
                            </tr>
                            <tr>
                                <th>Alamat Pemohon</th>
                                <td>${data.alamat_pemohon || '-'}</td>
                            </tr>
                        </table>
                    </div>
                    <div class="col-md-6">
                        <h6>Informasi Wajib Pajak</h6>
                        <table class="table table-sm">
                            <tr>
                                <th width="40%">Nama Wajib Pajak</th>
                                <td>${data.nama_wajib_pajak || '-'}</td>
                            </tr>
                            <tr>
                                <th>Alamat Wajib Pajak</th>
                                <td>${data.alamat_wajib_pajak || '-'}</td>
                            </tr>
                            <tr>
                                <th>Kabupaten/Kota</th>
                                <td>${data.kabupaten_kota || '-'}</td>
                            </tr>
                            <tr>
                                <th>Kecamatan</th>
                                <td>${data.kecamatan || '-'}</td>
                            </tr>
                            <tr>
                                <th>Kelurahan</th>
                                <td>${data.kelurahan || '-'}</td>
                            </tr>
                        </table>
                    </div>
                </div>
                <div class="row mt-3">
                    <div class="col-md-12">
                        <h6>Informasi Tambahan</h6>
                        <table class="table table-sm">
                            <tr>
                                <th width="30%">NOP PBB</th>
                                <td>${data.nop || '-'}</td>
                            </tr>
                            <tr>
                                <th>Atas Nama</th>
                                <td>${data.atas_nama || '-'}</td>
                            </tr>
                            <tr>
                                <th>Luas Tanah</th>
                                <td>${data.luas_tanah || '-'} m²</td>
                            </tr>
                            <tr>
                                <th>Luas Bangunan</th>
                                <td>${data.luas_bangunan || '-'} m²</td>
                            </tr>
                            <tr>
                                <th>Status</th>
                                <td>
                                    <span class="badge ${data.status === 'used' ? 'badge-success' : 'badge-secondary'}">
                                        ${data.status === 'used' ? 'Sudah Dipakai' : 'Tidak Dipakai'}
                                    </span>
                                </td>
                            </tr>
                            <tr>
                                <th>Tanggal Validasi</th>
                                <td>${formatDateTime(data.tanggal_validasi)}</td>
                            </tr>
                        </table>
                    </div>
                </div>
            `);
            
        } catch (error) {
            console.error('Error loading detail:', error);
            $('#detailModal .modal-body').html(`
                <div class="alert alert-danger">
                    Gagal memuat detail data: ${error.message}
                </div>
            `);
        }
    }

    // Helper function to format date
    function formatDateTime(dateString) {
        if (!dateString) return '-';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleString('id-ID', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Asia/Jakarta'
            });
        } catch (e) {
            return dateString;
        }
    }
});
///////////////||||||||         |||||||//////////////////////////////
// Fungsi untuk copy nomor validasi
async function copyNovalToTable(noval, targetTable) {
    try {
        const response = await fetch('/api/copy-noval', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nomor_validasi: noval,
                tujuan: targetTable
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccessNotification('Nomor validasi berhasil disalin ke tabel tujuan');
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        showErrorNotification(`Gagal menyalin: ${error.message}`);
    }
}

// Contoh penggunaan di event listener:
document.querySelector('#btnCopyNoval').addEventListener('click', () => {
    const noval = document.getElementById('nomorValidasi').value;
    const targetTable = 'transaksi'; // Ganti dengan tabel tujuan
    
    if (!noval) {
        showErrorNotification('Harap pilih nomor validasi terlebih dahulu');
        return;
    }
    
    copyNovalToTable(noval, targetTable);
});

///////////////////////////////////////

