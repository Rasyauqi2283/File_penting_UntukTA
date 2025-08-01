// Menampilkan logout box saat mencapai akhir halaman
document.addEventListener('scroll', function() {
    const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrolledPosition = window.scrollY;
    logoutBox.classList.toggle('visible', scrolledPosition >= scrollableHeight);  // Menampilkan logout box saat scroll di akhir halaman
});


document.addEventListener("DOMContentLoaded", () => {
    // Ambil data pengguna dari API (dari session backend)
    fetch('/api/user/dashboard')
        .then(response => response.json())
        .then(data => {
            // Pastikan data ada
            if (data.userid && data.divisi && data.username) {
                // Update elemen-elemen HTML dengan data pengguna
                const usernameElement = document.querySelector('.Username');
                const divisiElement = document.querySelector('.Divisi');

                // Memasukkan data ke dalam elemen
                usernameElement.textContent = data.username;
                divisiElement.textContent = data.divisi;
            } else {
                console.log('Data pengguna tidak ditemukan');
            }
        })
        .catch(error => {
            console.error('Error fetching user data:', error);
        });
});

//
//
const months = [
    'January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'
];

let currentMonthIndex = new Date().getMonth(); // Get current month index (0-11)
let currentYear = new Date().getFullYear();

const monthElement = document.getElementById('calendar-month');
const calendarGrid = document.getElementById('calendar-grid');
const monthDropdown = document.getElementById('monthDropdown');

// Show current month and year
monthElement.textContent = `${months[currentMonthIndex]} ${currentYear}`;

// Toggle month dropdown visibility
monthElement.addEventListener('click', () => {
    monthDropdown.style.display = monthDropdown.style.display === 'none' ? 'block' : 'none';
});

// Set the selected month
const monthOptions = document.querySelectorAll('.month-option');
monthOptions.forEach((option, index) => {
    option.addEventListener('click', () => {
        currentMonthIndex = index;
        updateCalendar();
        monthDropdown.style.display = 'none';
    });
});

// Generate and display the calendar days
function updateCalendar() {
    const firstDayOfMonth = new Date(currentYear, currentMonthIndex, 1).getDay(); // 0=Sunday, 6=Saturday
    const totalDaysInMonth = new Date(currentYear, currentMonthIndex + 1, 0).getDate(); // Get total days in month

    // Clear the previous calendar grid
    calendarGrid.innerHTML = `
        <div class="day">Mo</div>
        <div class="day">Tu</div>
        <div class="day">We</div>
        <div class="day">Th</div>
        <div class="day">Fr</div>
        <div class="day weekend">Sa</div>
        <div class="day weekend">Su</div>
    `;

    // Create empty spaces before the first day of the month
    for (let i = 0; i < firstDayOfMonth - 1; i++) {
        calendarGrid.innerHTML += '<div class="empty"></div>';
    }

    // Generate days of the month
    for (let day = 1; day <= totalDaysInMonth; day++) {
        const dayElement = document.createElement('div');
        dayElement.classList.add('date');
        dayElement.textContent = day;

        // Highlight weekend days
        if ((firstDayOfMonth + day - 1) % 7 === 0 || (firstDayOfMonth + day - 1) % 7 === 6) {
            dayElement.classList.add('weekend');
        }

        calendarGrid.appendChild(dayElement);
    }

    // Update the month/year in the calendar header
    monthElement.textContent = `${months[currentMonthIndex]} ${currentYear}`;
}

// Initialize the calendar with the current month
updateCalendar();