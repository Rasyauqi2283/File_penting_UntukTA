document.addEventListener('DOMContentLoaded', () => {
    // Elemen untuk logo dan header
    const logoContainer = document.querySelector('.logo-container');
    const logo = document.querySelector('.logo');
    const kabupatenBogorText = document.getElementById('kabupaten-bogor');
    const headerTitle = document.querySelector('.header-title');
    const dekorasiImage = document.querySelector('.dekorasi-image');
    const mainContent = document.querySelector('.main-content');
    const footerContent = document.querySelector('.footer-content');
    
    // Fungsi untuk mengaktifkan animasi logo dan memperluas sidebar, mainContent, dan footerContent
    function activateLogoAnimation() {
        // Perbesar logo dan pindahkan elemen header
        logo.classList.add('shrink');
        logo.style.cursor = 'pointer';
        logo.style.transform = 'scale(0.6) translateX(-50px)';
        headerTitle.style.transform = 'translateX(320px)';
        dekorasiImage.style.opacity = '1';
        dekorasiImage.style.transform = 'translateX(-30px)';
        kabupatenBogorText.style.opacity = '1';
        kabupatenBogorText.style.transform = 'translateX(-40px)';
        kabupatenBogorText.style.cursor = 'pointer';
    
        // Tambahkan kelas untuk memperluas sidebar, mainContent, dan footerContent
        expandSidebar();
    }
    
    // Fungsi untuk menonaktifkan animasi logo dan mengembalikan sidebar, mainContent, dan footerContent ke posisi awal
    function deactivateLogoAnimation() {
        // Kembalikan ukuran dan posisi logo serta elemen header
        logo.classList.remove('shrink');
        logo.style.cursor = 'pointer';
        logo.style.transform = 'scale(1) translateX(0)';
        headerTitle.style.transform = 'translateX(0)';
        dekorasiImage.style.opacity = '0';
        dekorasiImage.style.transform = 'translateX(-50px)';
        kabupatenBogorText.style.opacity = '0';
        kabupatenBogorText.style.transform = 'translateX(-65px)';
        kabupatenBogorText.style.cursor = 'default';
    
        // Hapus kelas expand untuk mengembalikan posisi sidebar, mainContent, dan footerContent
        collapseSidebar();
    }
    
    // Event listener untuk klik pada logoContainer dan kabupatenBogorText
    logoContainer.addEventListener('click', function () {
        isSidebarExpanded ? deactivateLogoAnimation() : activateLogoAnimation();
    });
    
    kabupatenBogorText.addEventListener('click', function () {
        isSidebarExpanded ? deactivateLogoAnimation() : activateLogoAnimation();
    });
    ////
    
    // Mengambil elemen-elemen yang diperlukan dari HTML untuk diakses di JavaScript
    const sidebar = document.querySelector('.sidebar');
    const sidebarIcons = document.querySelectorAll('.sidebar-icon');
    const sidebarTexts = document.querySelectorAll('.sidebar-text');
    const menuItems = document.querySelectorAll('.menu-item.dropdown');
    const dropdownContents = document.querySelectorAll('.dropdown-content');
    
    let isSidebarExpanded = false; // Status apakah sidebar sedang expanded atau tidak
    
    // Fungsi untuk memperluas sidebar dan menampilkan teks
    function expandSidebar(callback) {
        if (!isSidebarExpanded) {
            isSidebarExpanded = true;
    
            sidebar.classList.add('expand');
            mainContent.classList.add('shifted');
            footerContent.classList.add('shifted');
    
            // Sembunyikan ikon dengan transisi
            sidebarIcons.forEach(icon => {
                icon.style.transform = 'translateX(180px)';
                icon.style.opacity = '0';
                setTimeout(() => icon.style.zIndex = '-1', 300);
            });
    
            // Tampilkan teks sidebar dengan transisi
            sidebarTexts.forEach(text => {
                text.style.display = 'block';
                setTimeout(() => {
                    text.style.opacity = '1';
                    text.style.transform = 'translateX(-20px)';
                    text.style.zIndex = '1';
                }, 300);
            });
    
            mainContent.style.width = 'calc(100vw - 250px)';
            setTimeout(callback, 300);
        } else {
            callback();
        }
    }
    
    // Fungsi untuk menutup sidebar dan menyembunyikan teks serta menutup dropdown aktif
    function collapseSidebar() {
        isSidebarExpanded = false;
    
        sidebar.classList.remove('expand');
        mainContent.classList.remove('shifted');
        footerContent.classList.remove('shifted');
    
        // Sembunyikan teks dengan transisi
        sidebarTexts.forEach(text => {
            text.style.opacity = '0';
            text.style.transform = 'translateX(-150px)';
            setTimeout(() => text.style.display = 'none', 300);
            text.style.zIndex = '-1';
        });
    
        // Tampilkan ikon dengan transisi
        sidebarIcons.forEach(icon => {
            icon.style.transform = 'translateX(0)';
            icon.style.opacity = '1';
            icon.style.zIndex = '1';
        });
    
        mainContent.style.width = 'calc(100vw - 60px)';
        // Tutup semua dropdown saat sidebar ditutup
        closeAllDropdowns();
    }
    
    // Fungsi untuk menampilkan atau menyembunyikan dropdown-content
    function toggleDropdownContent(dropdownContent, menuItem) {
        const isActive = dropdownContent.classList.contains('active');
    
        closeAllDropdowns(); // Menutup dropdown lainnya
    
        if (!isActive) {
            dropdownContent.classList.add('active');
            dropdownContent.style.maxHeight = dropdownContent.scrollHeight + 'px';
            dropdownContent.style.opacity = '1';
            menuItem.classList.add('active');
        } else {
            dropdownContent.classList.remove('active');
            dropdownContent.style.maxHeight = '0';
            dropdownContent.style.opacity = '0';
            menuItem.classList.remove('active');
        }
    }
    
    // Fungsi untuk menutup semua dropdown yang aktif
    function closeAllDropdowns() {
        dropdownContents.forEach(content => {
            content.classList.remove('active');
            content.style.maxHeight = '0';
            content.style.opacity = '0';
        });
        menuItems.forEach(item => {
            item.classList.remove('active');
        });
    }
    
    // Event listener untuk dropdown menu sidebar
    menuItems.forEach(menuItem => {
        const dropdownContent = menuItem.nextElementSibling;
    
        menuItem.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!isSidebarExpanded) {
                expandSidebar(() => toggleDropdownContent(dropdownContent, menuItem));
            } else {
                // Jika sidebar sudah diperluas, langsung toggle dropdown
                toggleDropdownContent(dropdownContent, menuItem);
            }
        });
    });
    ////
    
    // Custom Scrollbar
    const customScrollbar = document.querySelector('.custom-scrollbar');
    const scrollbarThumb = document.querySelector('.custom-scrollbar-thumb');
    
    
    // Drag Scroll pada Thumb
    let isDragging = false;
    let startY, startThumbTop;
    
    scrollbarThumb.addEventListener('mousedown', (e) => {
        isDragging = true;
        startY = e.clientY;
        startThumbTop = parseInt(scrollbarThumb.style.top) || 0;
        document.body.classList.add('no-select');
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const deltaY = e.clientY - startY;
        const thumbTop = Math.min(
            Math.max(startThumbTop + deltaY, 0),
            customScrollbar.clientHeight - scrollbarThumb.clientHeight
        );
        const scrollRatio = thumbTop / (customScrollbar.clientHeight - scrollbarThumb.clientHeight);
        sidebar.scrollTop = scrollRatio * (sidebar.scrollHeight - sidebar.clientHeight);
    });
    
    document.addEventListener('mouseup', () => {
        isDragging = false;
        document.body.classList.remove('no-select');
    });
    
    // Update scrollbar saat ukuran window berubah
    window.addEventListener('resize', function() {
        updateScrollbar();
    });
    
    });