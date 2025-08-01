// Constants
const API_ENDPOINT = 'http://localhost:3000/api/paraf/get-berkas-till-clear';
const REQUEST_TIMEOUT = 10000;
const REQUIRED_FIELDS = [
    'no_validasi', 'no_registrasi', 'nobooking', 'tahunajb',
    'namawajibpajak', 'namapemilikobjekpajak', 'status', 'trackstatus'
];

// State
let selectedNoBooking = null;

// Main Function
async function loadTableDataParafValidasi() {
    try {
        await validateUserAccess();
        const { data } = await fetchData();
        renderTable(data);
    } catch (error) {
        handleMainError(error);
    }
}

// Helper Functions
async function validateUserAccess() {
    const userDivisi = getUserDivisi();
    
    if (typeof userDivisi !== 'string') {
        throw new Error('Invalid user division data');
    }
    
    if (userDivisi !== 'Peneliti Validasi') {
        throw new Error('Anda tidak memiliki akses ke data Peneliti Validasi');
    }
}

async function fetchData() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
        const response = await fetch(API_ENDPOINT, {
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        clearTimeout(timeout);

        if (!response.ok) {
            const errorData = await parseErrorResponse(response);
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const responseData = await response.json();
        
        if (!responseData?.success) {
            throw new Error(responseData.message || 'Server returned unsuccessful response');
        }

        if (!Array.isArray(responseData.data)) {
            throw new Error('Expected array data not found in response');
        }

        return responseData;
    } catch (error) {
        clearTimeout(timeout);
        throw new Error(`Gagal memuat data: ${error.message}`);
    }
}

function parseErrorResponse(response) {
    return response.json().catch(() => ({
        message: `HTTP error! status: ${response.status}`
    }));
}

function renderTable(data) {
    const tbody = document.querySelector('.data-masuk');
    if (!tbody) throw new Error('Target table body element not found');

    clearTableBody(tbody);

    if (data.length === 0) {
        showEmptyState(tbody, 'Tidak ada data yang valid untuk ditampilkan');
        return;
    }

    data.forEach(item => {
        try {
            validateItemFields(item, REQUIRED_FIELDS);
            renderTableRow(tbody, item);
        } catch (itemError) {
            console.error('Error processing item:', itemError);
            appendErrorRow(tbody, `Gagal memuat data item: ${itemError.message}`);
        }
    });

    setupTableEventListeners();
}

function renderTableRow(tbody, item) {
    const row = tbody.insertRow();
    row.setAttribute('data-nobooking', item.nobooking);

    // Add data cells
    REQUIRED_FIELDS.forEach(field => {
        const cell = row.insertCell();
        cell.textContent = item[field] || '-';
        cell.setAttribute('data-field', field);
    });

    // Add action button
    const actionCell = row.insertCell();
    renderActionButton(actionCell, item);

    // Add dropdown row
    const dropdownRow = createDropdownRow(item);
    tbody.appendChild(dropdownRow);
}

function renderActionButton(container, item) {
    const button = document.createElement('button');
    button.className = 'btn-kirim-document';
    button.textContent = 'Kirim';
    
    button.addEventListener('click', () => handleSendAction(button, container, item));
    
    container.appendChild(button);
}

async function handleSendAction(button, container, item) {
    try {
        const confirmed = await showConfirmationDialog(
            'Konfirmasi Pengiriman',
            'Apakah kamu yakin ingin mengirim data ini? Sudah diperiksa?'
        );

        if (!confirmed) return;

        validateItemFields(item, ['nobooking', 'userid', 'namawajibpajak', 'namapemilikobjekpajak']);
        
        const result = await sendToParafValidate(item);
        
        if (result.success) {
            updateUIAfterSuccess(button, container, result.no_validasi, item.nobooking);
            showSuccessNotification(result.no_validasi);
        } else {
            throw new Error(result.message || "Gagal mengirim data ke LSB.");
        }
    } catch (error) {
        console.error('Button Action Error:', error);
        showUserNotification('Gagal Mengirim', error.message, 'error');
    }
}

function createDropdownRow(item) {
    const row = document.createElement('tr');
    row.className = 'dropdown-row';
    
    const cell = document.createElement('td');
    cell.colSpan = REQUIRED_FIELDS.length + 1; // +1 for action column
    cell.style.display = 'none';
    cell.innerHTML = generateDropdownContent(item);
    
    row.appendChild(cell);
    return row;
}

function setupTableEventListeners() {
    const tbody = document.querySelector('.data-masuk');
    if (!tbody) return;

    // Event delegation for row clicks
    tbody.addEventListener('click', (event) => {
        const row = event.target.closest('tr:not(.dropdown-row)');
        if (!row) return;

        const nobooking = row.getAttribute('data-nobooking');
        if (!nobooking) return;

        selectedNoBooking = nobooking;
        console.log(`Selected No Booking: ${selectedNoBooking}`);

        toggleDropdown(row);
        handleRowSelection(nobooking);
    });
}

function toggleDropdown(row) {
    const dropdownRow = row.nextElementSibling;
    if (!dropdownRow || !dropdownRow.classList.contains('dropdown-row')) return;

    const dropdownCell = dropdownRow.querySelector('td');
    if (!dropdownCell) return;

    const isVisible = dropdownCell.style.display === 'table-cell';
    dropdownCell.style.display = isVisible ? 'none' : 'table-cell';

    if (!isVisible && typeof enableViewDocumentButton === 'function') {
        enableViewDocumentButton(selectedNoBooking);
    }
}

function handleRowSelection(nobooking) {
    // Additional handling when a row is selected
    // Can be extended for BSRE integration or other features
}

// UI Helper Functions
function clearTableBody(tbody) {
    tbody.innerHTML = '';
}

function showEmptyState(tbody, message) {
    const row = tbody.insertRow();
    const cell = row.insertCell(0);
    cell.colSpan = REQUIRED_FIELDS.length + 1;
    cell.className = 'empty-state';
    cell.textContent = message;
}

function appendErrorRow(tbody, message) {
    const row = tbody.insertRow();
    const cell = row.insertCell(0);
    cell.colSpan = REQUIRED_FIELDS.length + 1;
    cell.className = 'error-row';
    cell.textContent = message;
}

function handleMainError(error) {
    console.error('Main Function Error:', error);
    
    const errorContainer = document.querySelector('.data-masuk') || document.body;
    errorContainer.innerHTML = `
        <div class="error-message">
            <h3>Terjadi Kesalahan</h3>
            <p>${error.message}</p>
            <button onclick="loadTableDataParafValidasi()">Coba Lagi</button>
        </div>
    `;
}

// Utility Functions
function validateItemFields(item, requiredFields) {
    const missingFields = requiredFields.filter(field => !item[field]);
    if (missingFields.length > 0) {
        throw new Error(`Data yang diperlukan tidak lengkap. Field yang hilang: ${missingFields.join(', ')}`);
    }
}

function getUserDivisi() {
    return localStorage.getItem('divisi') || sessionStorage.getItem('divisi');
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadTableDataParafValidasi().catch(error => {
        console.error('Initialization Error:', error);
        handleMainError(error);
    });
});
/////
// =====================
// DROPDOWN CONTENT GENERATOR
// =====================
function generateDropdownContent(item) {
    const hasSignature = item.peneliti_tanda_tangan_path && 
                        item.peneliti_tanda_tangan_path !== 'null' &&
                        item.peneliti_tanda_tangan_path.trim() !== '';

    return `
        <div class="dropdown-content-wrapper">
            <!-- Document Info Section -->
            <div class="document-info-section">
                <p><strong>No. Booking:</strong> ${item.nobooking || 'N/A'}</p>
            </div>

            <!-- Approval Section -->
            <div class="approval-section">
                ${hasSignature ? `
                    <div class="signature-approval">
                        <div class="form-check mb-3">
                            <input class="form-check-input approval-radio" 
                                   type="radio" 
                                   name="approval-${item.nobooking}" 
                                   id="approve-${item.nobooking}"
                                   value="approve" required>
                            <label class="form-check-label" for="approve-${item.nobooking}">
                                Setujui dan Tandatangani Dokumen
                            </label>
                        </div>
                        
                        <div class="signature-preview">
                            <p class="signature-label">Tanda Tangan Peneliti:</p>
                            <img src="${item.peneliti_tanda_tangan_path}" 
                                 alt="Tanda Tangan Peneliti"
                                 class="signature-image img-thumbnail"
                                 onerror="this.onerror=null;this.src='/assets/img/signature-error.png'">
                        </div>
                    </div>
                ` : `
                    <div class="alert alert-warning no-signature-alert">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        Dokumen belum memiliki tanda tangan yang valid
                    </div>
                `}
                <br />
                    <button type="button" class="btn-simpaninput" data-nobooking="${item.nobooking}" onclick="simpanData(this)">
                        <span class="btn-text">Simpan</span>
                        <span class="spinner" hidden>
                            <i class="fa fa-spinner fa-spin"></i>
                        </span>
                    </button>
            </div>

                <div class="action-buttons">
                    <h5>Dokumen Permohonan</h5>
                    <div class="form-actions">
                        <button class="btn-view" data-nobooking="${item.nobooking}" onclick="viewPDF('${item.nobooking}')">
                            <i class="fas fa-file-pdf"></i> Permohonan Dokumen
                        </button>
                    </div>
                </div>
            <!-- PDF Preview Section -->
            <div class="pdf-preview-section">
                <h6 class="section-title">Pratinjau Dokumen Validasi</h6>
                <div class="pdf-preview-container" id="pdf-preview-${item.nobooking}">
                    <div class="pdf-placeholder">
                        <i class="fas fa-file-pdf pdf-icon"></i>
                        <p>Dokumen siap untuk divalidasi</p>
                    </div>
                    <div class="form-actions">
                        <button class="btn btn-view-pdf" 
                                onclick="viewPDFValidasi('${item.nobooking}')">
                            <i class="fas fa-external-link-alt me-2"></i>Dokumen Validasi
                        </button>
                    </div>
                </div>
                <div class="pdf-meta-info">
                    <small class="text-muted">Dokumen akan ditandatangani secara digital setelah disetujui</small>
                </div>
            </div>

            <!-- Action Buttons -->
            <div class="action-buttons">
                <button type="button" 
                        class="btn btn-primary btn-simpan" 
                        data-nobooking="${item.nobooking}"
                        ${!hasSignature ? 'disabled' : ''}>
                    <span class="btn-text">Proses Validasi</span>
                    <span class="spinner-border spinner-border-sm" hidden></span>
                </button>
            </div>

            <!-- Document Links Section -->
            <div class="document-links-section">
                <h6 class="document-links-title">Dokumen Terkait:</h6>
                <div class="document-links-list">
                    ${generateDocumentLinks(item)}
                </div>
            </div>
        </div>
    `;
}

function generateDocumentLinks(item) {
    const documents = [
        { path: item.akta_tanah_path, label: 'Akta Tanah' },
        { path: item.sertifikat_tanah_path, label: 'Sertifikat Tanah' },
        { path: item.pelengkap_path, label: 'Dokumen Pelengkap' },
        { path: item.open_dokumen, label: 'Dokumen Validasi' }
    ];

    return documents.map(doc => {
        if (!doc.path) return '';
        return `
            <div class="document-link-item">
                <span class="document-label">${doc.label}:</span>
                <a href="${encodeURI(doc.path)}" 
                   target="_blank" 
                   class="document-link">
                    <button class="btn btn-sm btn-outline-secondary btn-view">
                        <i class="fas fa-eye me-1"></i> Lihat Dokumen
                    </button>
                </a>
            </div>
        `;
    }).join('');
}

async function viewPDFValidasi(nobooking) {
    try {
        // Buka jendela baru
        const pdfWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
        
        // Tampilkan loading state
        pdfWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Loading Dokumen Validasi - ${nobooking}</title>
                <style>
                    body { 
                        font-family: Arial, sans-serif; 
                        display: flex; 
                        justify-content: center; 
                        align-items: center; 
                        height: 100vh; 
                        margin: 0; 
                        background: #f5f5f5;
                    }
                    .loading-container {
                        text-align: center;
                    }
                    .spinner {
                        font-size: 3rem;
                        color: #007bff;
                        margin-bottom: 1rem;
                    }
                </style>
            </head>
            <body>
                <div class="loading-container">
                    <div class="spinner"><i class="fas fa-spinner fa-spin"></i></div>
                    <h2>Memuat Dokumen Validasi...</h2>
                    <p>No. Booking: ${nobooking}</p>
                </div>
            </body>
            </html>
        `);

        // Fetch PDF
        const response = await fetch(`/api/Validasi/generate-pdf/${nobooking}`);
        if (!response.ok) throw new Error('Gagal memuat dokumen');

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        // Render PDF di jendela baru
        pdfWindow.location.href = url;
        
        // Simpan reference window untuk nanti
        window.pdfViewerWindows = window.pdfViewerWindows || {};
        window.pdfViewerWindows[nobooking] = pdfWindow;

    } catch (error) {
        console.error('PDF View Error:', error);
        
        // Jika window masih terbuka, tampilkan error
        if (pdfWindow && !pdfWindow.closed) {
            pdfWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Error - Dokumen Validasi</title>
                    <style>
                        body { 
                            font-family: Arial, sans-serif; 
                            display: flex; 
                            justify-content: center; 
                            align-items: center; 
                            height: 100vh; 
                            margin: 0; 
                            background: #f5f5f5;
                        }
                        .error-container {
                            text-align: center;
                            color: #dc3545;
                        }
                        .error-icon {
                            font-size: 3rem;
                            margin-bottom: 1rem;
                        }
                    </style>
                </head>
                <body>
                    <div class="error-container">
                        <div class="error-icon"><i class="fas fa-exclamation-triangle"></i></div>
                        <h2>Gagal Memuat Dokumen</h2>
                        <p>${error.message}</p>
                        <button onclick="window.location.reload()" style="padding: 8px 16px; margin-top: 1rem;">
                            Coba Lagi
                        </button>
                    </div>
                </body>
                </html>
            `);
        } else {
            alert(`Gagal memuat dokumen: ${error.message}`);
        }
    }
}
// ===== \\
async function processDigitalSignature(nobooking) {
    try {
        // 1. Dapatkan PDF untuk ditandatangani dari jendela preview
        const pdfWindow = window.pdfViewerWindows?.[nobooking];
        if (pdfWindow && !pdfWindow.closed) {
            // Beri tahu user untuk tidak menutup jendela preview
            alert('Harap tutup jendela preview dokumen sebelum melanjutkan proses tanda tangan');
            return { success: false, message: 'Jendela preview masih terbuka' };
        }

        // 2. Tampilkan konfirmasi final
        const confirmed = await showConfirmationDialog(
            'Konfirmasi Tanda Tangan Digital',
            'Anda yakin ingin menandatangani dokumen ini secara digital?'
        );
        if (!confirmed) return { success: false, message: 'Proses dibatalkan' };

        // 3. Proses tanda tangan via BSRE
        const response = await fetch('/api/Validasi/sign-document', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                nobooking,
                signature_type: 'DIGITAL',
                timestamp: new Date().toISOString()
            })
        });

        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || 'Gagal memproses tanda tangan digital');
        }

        // 4. Tampilkan dokumen yang sudah ditandatangani
        if (result.signed_url) {
            const signedWindow = window.open(result.signed_url, '_blank');
            window.signedViewerWindows = window.signedViewerWindows || {};
            window.signedViewerWindows[nobooking] = signedWindow;
        }

        return result;

    } catch (error) {
        console.error('Signature Process Error:', error);
        return { success: false, message: error.message };
    }
}
// ===== View PDF validasi valid\\
async function viewPDF_validasi(nobooking, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
        // Show loading state
        container.innerHTML = '<div class="pdf-loading-state"><i class="fas fa-spinner fa-spin"></i> Memuat dokumen...</div>';

        // Fetch PDF as blob
        const response = await fetch(`/api/Validasi/generate-pdf/${nobooking}`);
        if (!response.ok) throw new Error('Gagal memuat dokumen');

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        // Create iframe for preview
        container.innerHTML = `
            <iframe src="${url}" 
                    class="pdf-iframe" 
                    frameborder="0" 
                    allowfullscreen></iframe>
            <div class="pdf-actions">
                <button class="btn btn-sm btn-outline-secondary zoom-in">
                    <i class="fas fa-search-plus"></i>
                </button>
                <button class="btn btn-sm btn-outline-secondary zoom-out">
                    <i class="fas fa-search-minus"></i>
                </button>
            </div>
        `;

        // Setup zoom controls
        setupPDFZoomControls(container);
    } catch (error) {
        console.error('PDF Preview Error:', error);
        container.innerHTML = `
            <div class="pdf-error-state">
                <i class="fas fa-exclamation-circle"></i> Gagal memuat dokumen
            </div>
        `;
    }
}
/////////////////////////////==================== View PDF permohonan Validasi \\
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
///////////===================\\\\
function setupPDFZoomControls(container) {
    const iframe = container.querySelector('.pdf-iframe');
    const zoomInBtn = container.querySelector('.zoom-in');
    const zoomOutBtn = container.querySelector('.zoom-out');
    
    let scale = 1;
    const ZOOM_FACTOR = 0.25;

    zoomInBtn.addEventListener('click', () => {
        scale += ZOOM_FACTOR;
        iframe.style.transform = `scale(${scale})`;
    });

    zoomOutBtn.addEventListener('click', () => {
        scale = Math.max(0.5, scale - ZOOM_FACTOR);
        iframe.style.transform = `scale(${scale})`;
    });
}
//////////
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
    const special_parafv = sessionStorage.getItem('special_parafv') || localStorage.getItem('special_parafv');
    try {
        const response = await fetch(`/api/getCreatorByBooking/${encodeURIComponent(nobooking)}`);
        const data = await response.json();  // Mengonversi respons ke JSON

        if (response.ok && data && data.userid) {
            const creatorUserid = data.userid;  // Ambil userid pembuat berdasarkan nobooking
            // Buat URL untuk mengakses PDF menggunakan userid pembuat
            const pdfUrl = `http://localhost:3000/api/peneliti_lanjutan-generate-pdf-badan/${
                encodeURIComponent(nobooking)}?userid=${
                encodeURIComponent(creatorUserid)}&nama=${
                encodeURIComponent(data.nama)}&special_parafv=${
                encodeURIComponent(special_parafv || '')}`;

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
///////
// =======
///////
async function handleApprovalSubmission(button) {
    const nobooking = button.dataset.nobooking;
    if (!nobooking) return;

    try {
        // Show loading state
        button.disabled = true;
        const spinner = button.querySelector('.spinner-border');
        const btnText = button.querySelector('.btn-text');
        spinner.hidden = false;
        btnText.textContent = 'Memproses...';

        // Verify approval selection
        const approvalRadio = document.querySelector(`input[name="approval-${nobooking}"]:checked`);
        if (!approvalRadio) {
            throw new Error('Harap pilih persetujuan terlebih dahulu');
        }

        // Process with BSRE
        const result = await processDigitalSignature(nobooking);
        
        if (result.success) {
            showUserNotification('Berhasil', 'Dokumen telah divalidasi dan ditandatangani', 'success');
            
            // Update UI and reload preview
            const previewContainer = document.getElementById(`pdf-preview-${nobooking}`);
            if (previewContainer) {
                await loadPDFPreview(nobooking, `pdf-preview-${nobooking}`);
            }
        } else {
            throw new Error(result.message || 'Proses validasi gagal');
        }
    } catch (error) {
        console.error('Approval Error:', error);
        showUserNotification('Gagal', error.message, 'error');
    } finally {
        // Reset button state
        button.disabled = false;
        const spinner = button.querySelector('.spinner-border');
        const btnText = button.querySelector('.btn-text');
        spinner.hidden = true;
        btnText.textContent = 'Proses Validasi';
    }
}

async function processDigitalSignature(nobooking) {
    // Implementasi BSRE akan dibahas lebih detail
    try {
        const response = await fetch('/api/Validasi/sign-document', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                nobooking,
                signature_type: 'DIGITAL',
                timestamp: new Date().toISOString()
            })
        });

        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || 'Gagal memproses tanda tangan digital');
        }

        return result;
    } catch (error) {
        console.error('BSRE Process Error:', error);
        return { success: false, message: error.message };
    }
}
// =====================
// DROPDOWN EVENT HANDLERS
// =====================
function setupDropdownEventListeners() {
    document.addEventListener('click', (e) => {
        // Handle simpan persetujuan
        if (e.target.closest('.btn-simpan')) {
            const button = e.target.closest('.btn-simpan');
            handleApprovalSubmission(button);
        }
        
        // Handle radio button selection
        if (e.target.classList.contains('approval-radio')) {
            const radio = e.target;
            toggleSaveButton(radio);
        }
    });
}

async function handleApprovalSubmission(button) {
    const nobooking = button.dataset.nobooking;
    if (!nobooking) return;

    try {
        // Tampilkan loading state
        button.disabled = true;
        const spinner = button.querySelector('.spinner-border');
        const btnText = button.querySelector('.btn-text');
        spinner.hidden = false;
        btnText.textContent = 'Menyimpan...';

        // Dapatkan nilai persetujuan
        const approvalRadio = document.querySelector(`input[name="approval-${nobooking}"]:checked`);
        if (!approvalRadio) {
            throw new Error('Harap pilih persetujuan terlebih dahulu');
        }

        // Proses persetujuan (akan diganti dengan BSRE integration nanti)
        const result = await submitApprovalToServer(nobooking, approvalRadio.value);
        
        if (result.success) {
            showUserNotification('Berhasil', 'Persetujuan tanda tangan berhasil disimpan', 'success');
            // Refresh data atau update UI sesuai kebutuhan
            loadTableDataParafValidasi();
        } else {
            throw new Error(result.message || 'Gagal menyimpan persetujuan');
        }
    } catch (error) {
        console.error('Approval Error:', error);
        showUserNotification('Gagal', error.message, 'error');
    } finally {
        // Reset button state
        button.disabled = false;
        const spinner = button.querySelector('.spinner-border');
        const btnText = button.querySelector('.btn-text');
        spinner.hidden = true;
        btnText.textContent = 'Simpan Persetujuan';
    }
}

function toggleSaveButton(radio) {
    const container = radio.closest('.dropdown-content-wrapper');
    if (!container) return;
    
    const saveButton = container.querySelector('.btn-simpan');
    if (saveButton) {
        saveButton.disabled = !radio.checked;
    }
}

// =====================
// SUPPORTING FUNCTIONS
// =====================

async function submitApprovalToServer(nobooking, approvalStatus) {
    // Ini adalah placeholder untuk integrasi dengan BSRE
    // Akan diimplementasikan nanti setelah pembahasan BSRE
    
    try {
        const response = await fetch('/api/approve-signature', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                nobooking,
                status: approvalStatus,
                approval_time: new Date().toISOString()
            })
        });

        return await response.json();
    } catch (error) {
        console.error('Approval API Error:', error);
        return { success: false, message: 'Gagal menyimpan persetujuan' };
    }
}

// Initialize dropdown event listeners
document.addEventListener('DOMContentLoaded', () => {
    setupDropdownEventListeners();
});