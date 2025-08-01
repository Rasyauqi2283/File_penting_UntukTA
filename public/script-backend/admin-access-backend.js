document.addEventListener("DOMContentLoaded", () => {
    const divisiDropdown = document.getElementById('jumlahKaryawan'); // Dropdown untuk divisi
    const memberValue = document.getElementById('memberValue'); // Elemen untuk menampilkan jumlah anggota

    // Event listener ketika divisi dipilih
    divisiDropdown.addEventListener('change', async (event) => {
        const selectedDivisi = event.target.value; // Mendapatkan divisi yang dipilih

        try {
            // Mengirim permintaan ke backend untuk mendapatkan jumlah anggota berdasarkan divisi
            const response = await fetch(`/api/member-count/admin-access?divisi=${selectedDivisi}`);
            const data = await response.json();

            // Menampilkan jumlah anggota pada elemen memberValue
            if (data.count) {
                memberValue.textContent = `Jumlah Anggota: ${data.count}`;
            } else {
                memberValue.textContent = 'Tidak ada anggota.';
            }
        } catch (error) {
            console.error('Error fetching member count:', error);
            memberValue.textContent = 'Terjadi kesalahan dalam mengambil data.';
        }
    });
//
    

});
//
//
//// Fungsi untuk memeriksa apakah ada data yang diproses oleh LTB
async function checkProcessedData() {
    try {
        const response = await fetch('http://localhost:3000/api/admin/ltb-processed');
        const data = await response.json();

        // Menampilkan notifikasi jika ada data yang diproses oleh LTB
        if (data.success && data.bookingData.length > 0) {
            const notificationBadge = document.getElementById('notification-badge');
            notificationBadge.textContent = `Ada ${data.bookingData.length} data yang telah diproses oleh LTB`;
            notificationBadge.classList.remove('hidden'); // Menampilkan notifikasi
        } else {
            const notificationBadge = document.getElementById('notification-badge');
            notificationBadge.classList.add('hidden'); // Menyembunyikan notifikasi jika tidak ada data
        }
    } catch (error) {
        console.error('Error checking processed data:', error);
    }
}

// Cek setiap 5 detik apakah ada data yang telah diproses oleh LTB
setInterval(checkProcessedData, 5000);
