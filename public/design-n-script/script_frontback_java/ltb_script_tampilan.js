// Ambil semua gambar dengan tag <img>
var images = document.querySelectorAll('img');
var modal = document.getElementById('modal');
var modalImg = document.getElementById("img01");
var captionText = document.getElementById("caption");

// Ketika gambar diklik
images.forEach((image) => {
  image.onclick = function(){
    modal.style.display = "block";
    modalImg.src = this.src;
    captionText.innerHTML = this.alt;
  }
});

// Menutup modal ketika klik pada tombol close
var span = document.getElementsByClassName("close")[0];
span.onclick = function() {
  modal.style.display = "none";
}
///
///
//
var pdfLinks = document.querySelectorAll('.btn-view');  // Semua tombol PDF
  var pdfModal = document.getElementById('pdf-modal');
  var pdfViewer = document.getElementById("pdf-viewer");

  // Ketika tombol PDF diklik
  pdfLinks.forEach((btn) => {
    btn.onclick = function(){
      var pdfUrl = this.getAttribute('href');  // Ambil URL PDF
      pdfModal.style.display = "block";
      pdfViewer.src = pdfUrl;
    }
  });

  // Menutup modal ketika klik pada tombol close
  var span = document.getElementsByClassName("close")[0];
  span.onclick = function() {
    pdfModal.style.display = "none";
  }
