document.addEventListener('DOMContentLoaded', () => {
    // Password overlay elements
    const passwordOverlay = document.getElementById('password-overlay');
    const changePasswordLink = document.querySelector('.change-password-link');
    const cancelPasswordButton = document.getElementById('cancel-password-change');


    // Photo overlay elements
    const photoOverlay = document.getElementById('photo-overlay');
    const changePhotoButton = document.querySelector('.gfot');
    const cancelPhotoButton = document.getElementById('cancel-photo-change');

    // Overlay backdrop for dark background effect
    const overlayBackdrop = document.getElementById('overlay-backdrop');

    // Image preview elements for photo overlay
    const newProfilePhoto = document.getElementById('new-profile-photo');
    const previewImage = document.getElementById('preview-image-change');
    const previewText = document.getElementById('preview-text');

     // Event listener to close password overlay when "Cancel" button is clicked
     cancelPasswordButton.addEventListener('click', function(event) {
        event.stopPropagation();
        closeOverlays();
    });
    // General function to show an overlay
    function showOverlay(overlay) {
        closeOverlays(); // Close any open overlays
        overlay.style.display = 'block';
        overlayBackdrop.style.display = 'block';
    }

    // General function to close all overlays
    function closeOverlays() {
        passwordOverlay.style.display = 'none';
        photoOverlay.style.display = 'none';
        overlayBackdrop.style.display = 'none';
        resetPhotoInput();
    }

    // Event listener to open password overlay
    changePasswordLink.addEventListener('click', function(event) {
        event.stopPropagation();
        showOverlay(passwordOverlay);
    });

    // Event listener to open photo overlay
    changePhotoButton.addEventListener('click', function(event) {
        event.stopPropagation();
        showOverlay(photoOverlay);
    });

    // Event listener to close photo overlay when "Cancel" button is clicked
    cancelPhotoButton.addEventListener('click', function(event) {
        event.stopPropagation();
        closeOverlays();
    });

    // Event listener to close overlays when backdrop is clicked
    overlayBackdrop.addEventListener('click', function() {
        closeOverlays();
    });

    // Function to reset photo input and hide the preview
    function resetPhotoInput() {
        newProfilePhoto.value = '';
        previewImage.style.display = 'none';
        previewText.style.display = 'block';
    }

    // Modal functionality for profile picture
    const profileImg = document.getElementById("profileImg");
    const modal = document.getElementById("imageModal");
    const modalImg = modal.querySelector("img");
    const blackBackground = modal.querySelector(".blackbackground");

    // Show modal when profile image is clicked
    profileImg.onclick = function () {
        modal.style.display = "flex"; // Tampilkan modal
        modalImg.src = profileImg.src; // Set gambar modal dengan gambar profil yang diklik
    };

    // Hide modal when clicking outside the modal image (clicking on the black background)
    blackBackground.onclick = function () {
        modal.style.display = "none"; // Sembunyikan modal
    };

    // Hide modal when clicking outside the modal image
    modal.onclick = function (event) {
        if (event.target === modal) {
            modal.style.display = "none"; // Sembunyikan modal jika klik di luar gambar
        }
    };


});