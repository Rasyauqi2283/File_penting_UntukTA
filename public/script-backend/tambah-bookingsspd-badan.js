document.addEventListener('DOMContentLoaded', () => {
    const jenisPerolehanEl = document.getElementById('jenisperolehan');
    const npoptkpField = document.getElementById('nilaiPerolehanObjekPajakTidakKenaPajak');
    const npoptkpDisplay = document.getElementById('npoptkp-display'); // Elemen tambahan untuk display

    if (jenisPerolehanEl) {
        jenisPerolehanEl.addEventListener('change', () => {
            const kode = jenisPerolehanEl.value;
            const npoptkp = getNpoptkp(kode);
                function getNpoptkp(kode) {

                    const npoptkpMap = {
                    '03': 300000000,
                    '04': 300000000,
                    '05': 300000000,
                    '24': 300000000,
                    '30': 300000000,
                    '28': 40000000,
                    '29': 49000000,
                    '34': 0
                };
                return npoptkpMap[kode] ?? 80000000;
            }
            if (npoptkpField) {
                npoptkpField.value = npoptkp; // Simpan nilai plain number
            }
            if (npoptkpDisplay) {
                npoptkpDisplay.textContent = npoptkp.toLocaleString('id-ID'); // Tampilkan format Rupiah
            }
        });
    }
});

function setAutoDate(isTomorrow = false) {
    const date = new Date();
    if (isTomorrow) {
        date.setDate(date.getDate() + 1);
    }  
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    const displayEl = document.getElementById('tanggalDisplay');
    if (displayEl) {
        displayEl.textContent = `${day}-${month}-${year}`;
    }
    document.getElementById('tanggal').value = day;
    document.getElementById('bulan').value = month;
    document.getElementById('tahun').value = year;
    
    return `${day}-${month}-${year}`;
}
document.addEventListener('DOMContentLoaded', function() {
    setAutoDate();
});
/////////
document.getElementById('formBadanUsaha_Bphtb').addEventListener('submit', async function(event) {
    event.preventDefault();
    const formattedDate = setAutoDate();
    
    // Untuk keperluan debugging
    console.log('Tanggal otomatis:', formattedDate);
    // Ambil nilai dari input form untuk booking
    const nobooking = document.getElementById('noBooking').value;
    // Pastikan tanggal sudah ter-set
    const day = document.getElementById('tanggal').value;
    const month = document.getElementById('bulan').value;
    const year = document.getElementById('tahun').value;
    
    if (!day || !month || !year) {
        alert('Tanggal tidak valid. Sistem akan mengisi otomatis.');
        setAutoDate(); // Fallback
        return;
    }
    const formattedTanggal = `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${year}`;
    console.log('Tanggal yang akan dikirim:', formattedTanggal);
    //
    const digitprovinsi = document.getElementById('digitprovinsi').value;  // 2 digit provinsi
    const digitkabupatenkota = document.getElementById('digitkabupatenkota').value;  // 2 digit kabupaten/kota
    const digitkecamatan = document.getElementById('digitkecamatan').value;  // 3 digit kecamatan
    const digitkpp = document.getElementById('digitkpp').value;  // 3 digit KPP
    const digitblok = document.getElementById('digitblok').value;  // 3 digit Blok
    const digiturut = document.getElementById('digiturut').value;  // 4 digit Urut
    const digitpajak = document.getElementById('digitpajak').value;  // 1 digit pajak

    // Gabungkan menjadi NOP PBB
    const noppbb = `${digitprovinsi.padStart(2, '0')}.${digitkabupatenkota.padStart(2, '0')}.${digitkecamatan.padStart(3, '0')}.${digitkpp.padStart(3, '0')}.${digitblok.padStart(3, '0')}.${digiturut.padStart(4, '0')}.${digitpajak.padStart(1,'0')}`;

    // Ambil data lainnya untuk booking
    const namawajibpajak = document.getElementById('namawajibpajak').value;
    const alamatwajibpajak = document.getElementById('alamatwajibpajak').value;
    const namapemilikobjekpajak = document.getElementById('namapemilikobjekpajak').value;
    const alamatpemilikobjekpajak = document.getElementById('alamatpemilikobjekpajak').value;
    //npwp WP
    const spesial_1wp = document.getElementById('unik1wp').value;
    const spesial_2wp = document.getElementById('unik2wp').value;
    const spesial_3wp = document.getElementById('unik3wp').value;
    const spesial_4wp = document.getElementById('unik4wp').value;
    const kppwp = document.getElementById('kppwp').value;
    const pusatcwp = document.getElementById('pusatcwp').value;
    const npwpwp = `${spesial_1wp.padStart(2, '0')}.${spesial_2wp.padStart(3, '0')}.${spesial_3wp.padStart(3, '0')}.${spesial_4wp}-${kppwp.padStart(3, '0')}.${pusatcwp.padStart(3, '0')}`;

    //npwp OP
    const spesial_1op = document.getElementById('unik1op').value;
    const spesial_2op = document.getElementById('unik2op').value;
    const spesial_3op = document.getElementById('unik3op').value;
    const spesial_4op = document.getElementById('unik4op').value;
    const kppop = document.getElementById('kppop').value;
    const pusatcop = document.getElementById('pusatcop').value;
    const npwpop = `${spesial_1op.padStart(2, '0')}.${spesial_2op.padStart(3, '0')}.${spesial_3op.padStart(3, '0')}.${spesial_4op}-${kppop.padStart(3, '0')}.${pusatcop.padStart(3, '0')}`;

    //penghitungan otomatis pada bagian njop
    const luas_tanah = document.getElementById('luas_tanah').value;
    const njop_tanah = document.getElementById('njop_tanah').value;
    const luas_bangunan = document.getElementById('luas_bangunan').value;
    const njop_bangunan = document.getElementById('njop_bangunan').value;
    // Ambil data BPHTB
    const bphtb_yangtelah_dibayar = document.getElementById('bphtb_yangtelah_dibayar').value;
    const hargatransaksi = document.getElementById('hargatransaksi').value;
    const letaktanahdanbangunan = document.getElementById('letaktanahdanbangunan').value;

     const jenisPerolehan = document.getElementById('jenisperolehan').value;
    const npoptkpMap = {
        '03': 300000000,
        '04': 300000000,
        '05': 300000000,
        '24': 300000000,
        '30': 300000000,
        '28': 40000000,
        '29': 49000000,
        '34': 0
    };
    const nilaiPerolehanObjekPajakTidakKenaPajak = npoptkpMap[jenisPerolehan] ?? 80000000;

    const rt_rwobjekpajak = document.getElementById('rt_rwobjekpajak').value;
    const kelurahandesalp = document.getElementById('kelurahandesalp').value;
    const kecamatanlp = document.getElementById('kecamatanlp').value;
    // Ambil nilai dari dropdown status kepemilikan, jika tidak ada pilihannya, set default 'Milik Pribadi'
    const status_kepemilikan = document.getElementById('status_kepemilikan').value || 'Milik Pribadi';
    const keterangan = document.getElementById('keterangan').value;
    const nomor_sertifikat = document.getElementById('nomor_sertifikat').value;

    const formattedPerolehan = `${document.getElementById('tanggaloleh').value.padStart(2, '0')}-${document.getElementById('bulanoleh').value.padStart(2, '0')}-${document.getElementById('tahunoleh').value}`;
    const formattedPembayaran = `${document.getElementById('tanggalbayar').value.padStart(2, '0')}-${document.getElementById('bulanbayar').value.padStart(2, '0')}-${document.getElementById('tahunbayar').value}`;

    const nomor_bukti_pembayaran = document.getElementById('nomor_bukti_pembayaran').value;

    // Mengambil userID dari sessionStorage atau localStorage
    const userid = sessionStorage.getItem('userid') || localStorage.getItem('userid');

    if (!userid) {
        alert('UserID tidak ditemukan. Silakan login terlebih dahulu.');
        return; // Menghentikan proses jika userID tidak ditemukan
    }
    // Data yang akan dikirim ke backend
    const data = {
        userid,  // ID pengguna yang sedang login (bisa diambil dari session)
        jenis_wajib_pajak: 'Badan Usaha', // Jenis wajib pajak yang dipilih (badan usaha)
        nobooking,
        noppbb,
        namawajibpajak,
        alamatwajibpajak,
        namapemilikobjekpajak,
        alamatpemilikobjekpajak,
        tanggal: formattedDate,
        tahunajb: document.getElementById('tahunajb').value,
        kabupatenkotawp: document.getElementById('kabupatenkotawp').value,
        kecamatanwp: document.getElementById('kecamatanwp').value,
        kelurahandesawp: document.getElementById('kelurahandesawp').value,
        rtrwwp: document.getElementById('rtrwwp').value,
        npwpwp: npwpwp,
        kodeposwp: document.getElementById('kodeposwp').value,
        kabupatenkotaop: document.getElementById('kabupatenkotaop').value,
        kecamatanop: document.getElementById('kecamatanop').value,
        kelurahandesaop: document.getElementById('kelurahandesaop').value,
        rtrwop: document.getElementById('rtrwop').value,
        npwpop: npwpop,
        kodeposop: document.getElementById('kodeposop').value,

        // Penghitungan luas x njop
        luas_tanah,
        njop_tanah,
        luas_bangunan,
        njop_bangunan,

        // Data perhitungan BPHTB
        nilaiPerolehanObjekPajakTidakKenaPajak,
        bphtb_yangtelah_dibayar,

        // Data Objek Pajak
        hargatransaksi,
        letaktanahdanbangunan, 
        rt_rwobjekpajak,
        kecamatanlp,
        kelurahandesalp, 
        status_kepemilikan,
        jenisPerolehan, 
        keterangan, 
        nomor_sertifikat, 
        tanggal_perolehan: formattedPerolehan, 
        tanggal_pembayaran: formattedPembayaran, 
        nomor_bukti_pembayaran,

        trackstatus: 'Draft'
    };

    // Kirim data booking dan perhitungan BPHTB ke backend menggunakan fetch dan async/await
    try {
        const response = await fetch('http://localhost:3000/api/ppatk_create-booking-and-bphtb', {
            method: 'POST',
            body: JSON.stringify(data),
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const responseData = await response.json();
        console.log("Response dari backend:", responseData);    

        if (responseData.success) {
            // Mengisi noBooking dengan nobooking yang diterima dari backend
            document.getElementById('noBooking').value = responseData.nobooking;
            alert('Booking dan perhitungan BPHTB untuk badan usaha berhasil, klik data di tabel untuk menambahkan akta,sertifikat dan pelengkap lainnya!');
            location.reload();
        } else {
            alert('Gagal menyimpan data');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Terjadi kesalahan saat menyimpan booking');
    }
});
///////////         ///////////////
