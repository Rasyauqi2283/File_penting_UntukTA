document.addEventListener("DOMContentLoaded", () => {

      // Tombol profile akan mengarahkan ke halaman profil
      document.getElementById("profileButton").addEventListener("click", () => {
        window.location.href = "profile.html"; // Arahkan ke profile.html
      });
    //
    //
    const memberList = document.getElementById('member-list');
    const memberOverlay = document.getElementById('member-overlay');
    const memberCount = document.getElementById('divisiMemberCount');

    memberCount.addEventListener('click', function() {
        memberOverlay.classList.toggle('active');
        fetchMemberList();
    });
    // Close overlay jika klik di luar area overlay
    document.addEventListener('click', function (event) {
        if (!memberOverlay.contains(event.target) && !memberCount.contains(event.target)) {
            memberOverlay.classList.remove('active');
        }
    }, true);

    async function fetchMemberList() {
        try {
            const response = await fetch('/api/members-header');
            const data = await response.json();

            if (data && data.usersm) {
                memberList.innerHTML = '';  // Clear current member list
                data.usersm.forEach(user => {
                    const memberItem = document.createElement('li');
                    
                    // Tambahkan kelas berdasarkan status (online/offline)
                    const statusClass = user.statuspengguna === 'online' ? 'online' : 'offline';
                    memberItem.classList.add('member-item', statusClass);

                    // Profile picture
                    const profileImg = document.createElement('img');
                    profileImg.src = user.fotoprofil || 'default-avatar.png';
                    profileImg.alt = `${user.username}'s photo`;
                    profileImg.onerror = () => { 
                        this.src = 'fallback-avatar.png'; 
                    };

                    // Name element
                    const nameSpan = document.createElement('span');
                    nameSpan.textContent = user.nama;
                    nameSpan.classList.add('member-name');

                    // Status indicator
                    const statusSpan = document.createElement('span');
                    statusSpan.classList.add('status');
                    statusSpan.title = user.statuspengguna === 'online' ? 'Online' : 'Offline';

                    // Append elements
                    memberItem.appendChild(profileImg);
                    memberItem.appendChild(nameSpan);
                    memberItem.appendChild(statusSpan);

                    memberList.appendChild(memberItem);
                });
            }
        } catch (error) {
            console.error('Error:', error);
            memberList.innerHTML = `
                <li class="error-message">
                    Gagal memuat daftar anggota. 
                    <button onclick="fetchMemberList()">Coba Lagi</button>
                </li>
            `;
        }
    }
});
//
//
// Mengambil data profil pengguna dari API
fetch('/api/profile')
.then(response => response.json())
.then(user => {
    console.log('Data pengguna diperoleh', user);
    console.log('Data userID:', user.userid);
    console.log('Data pengguna:', user.statuspengguna);

    // Mengubah textContent atau value untuk semua elemen dengan class yang sesuai
    document.querySelectorAll('.userid').forEach(element => {
        element.value = user.userid;
        element.textContent = user.userid;
    });
    document.querySelectorAll('.nama').forEach(element => {
        element.value = user.nama;
        element.textContent = user.nama;
    });
        // Memperbaiki path gambar untuk src
        const fotoProfilUrl = decodeURIComponent(user.fotoprofil.replace('\\', '/'));  // Path relatif dari root
    // Pilih semua elemen dengan class 'fotoprofil' dan perbarui src-nya
    const fotoProfilElements = document.querySelectorAll('.fotoprofil');
    fotoProfilElements.forEach(element => {
        element.src = fotoProfilUrl;
    });

    console.log('Foto Profil yang Ditampilkan:', fotoProfilUrl);
})
.catch(err => console.error('Gagal mengambil data profil:', err));
//
//
