const socket = new WebSocket('ws://localhost:8080');

// Mendengarkan pesan yang datang
socket.onmessage = function(event) {
  const message = event.data; // Pesan yang dikirim dari backend
  // Membuat elemen notifikasi bubble
  const notificationBubble = document.createElement('div');
  notificationBubble.classList.add('notification-bubble');
  notificationBubble.innerHTML = message;

  // Menambahkan bubble notifikasi ke dalam container notifikasi
  document.getElementById('notification-container').appendChild(notificationBubble);

  // Menampilkan notifikasi ping pada ikon
  showNotificationPing();  // Fungsi untuk menampilkan ping pada ikon notifikasi

    // Menampilkan bubble dot saat ada pesan
    const notificationIcon = document.getElementById('notification-icon');
    notificationIcon.classList.remove('no-notification'); // Tampilkan dot
  
      // Menambahkan bubble notifikasi ke dalam container notifikasi
      document.getElementById('notification-container').appendChild(notificationBubble);
      };
  
      // Fungsi untuk menghapus bubble dot jika tidak ada notifikasi
      function hideNotificationDot() {
      const notificationIcon = document.getElementById('notification-icon');
      notificationIcon.classList.add('no-notification'); // Sembunyikan dot
      
};

// Fungsi untuk menunjukkan ping pada ikon notifikasi
function showNotificationPing() {
  const notificationIcon = document.getElementById('notification-icon');
  notificationIcon.classList.add('new-notification');
  setTimeout(() => notificationIcon.classList.remove('new-notification'), 2000);
}
///
//
/////
///
//
// Mendapatkan elemen-elemen yang diperlukan
const notificationIcon = document.getElementById('notification-icon');
const overlay = document.getElementById('overlay-notifikasi');
const closeOverlayButton = document.getElementById('close-overlay');
const orderList = document.getElementById('order-list');

// Menampilkan overlay saat notifikasi diklik
notificationIcon.addEventListener('click', () => {
  overlay.style.display = 'flex'; // Menampilkan overlay
  fetchOrders();
});

// Menutup overlay saat tombol "Tutup" diklik
closeOverlayButton.addEventListener('click', () => {
  overlay.style.display = 'none'; // Menutup overlay
});

// Mengambil data pesanan dari API dan mengisi daftar pesanan
function fetchOrders() {
    fetch('/api/get-orders') // Memanggil API untuk mendapatkan data pesanan
      .then(response => response.json())
      .then(data => {
        populateOrderList(data); // Mengisi daftar pesanan di overlay
      })
      .catch(error => {
        console.error('Error fetching orders:', error);
      });
  }
  
  // Mengisi daftar pesanan di dalam overlay
  function populateOrderList(orders) {
    orderList.innerHTML = ''; // Kosongkan daftar sebelumnya
  
    orders.forEach(order => {
      const orderItem = document.createElement('div');
      orderItem.classList.add('order-item');
      orderItem.innerHTML = `No Booking: ${order.nobooking} <br> Pengirim: ${order.nama} <br> Jenis Wajib Pajak: ${order.jenis_wajib_pajak}`;
      orderItem.addEventListener('click', () => {
        window.location.href = `/LTB/TerimaBerkas-SSPD/terima-berkas-sspd.html`; // Mengarahkan ke halaman tabel berdasarkan nobooking
      });
      orderList.appendChild(orderItem);
    });
  }