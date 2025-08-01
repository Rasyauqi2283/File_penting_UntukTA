////////////////////////////////////////////////////////////////////////////////
document.getElementById('tanggaloleh').addEventListener('input', function() {
  if (this.value.length > 2) this.value = this.value.slice(0, 2);
  if (this.value > 31) this.value = 31;
});
document.getElementById('bulanoleh').addEventListener('input', function() {
  if (this.value.length > 2) this.value = this.value.slice(0, 2);
  if (this.value > 12) this.value = 12;
});
document.getElementById('tahunoleh').addEventListener('input', function() {
  if (this.value.length > 4) this.value = this.value.slice(0, 4);
});
//////////////////////////////////////////////////////////////////////////////////
document.getElementById('tanggalbayar').addEventListener('input', function() {
  if (this.value.length > 2) this.value = this.value.slice(0, 2);
  if (this.value > 31) this.value = 31;
});
document.getElementById('bulanbayar').addEventListener('input', function() {
  if (this.value.length > 2) this.value = this.value.slice(0, 2);
  if (this.value > 12) this.value = 12;
});
document.getElementById('tahunbayar').addEventListener('input', function() {
  if (this.value.length > 4) this.value = this.value.slice(0, 4);
});
////////////////////////////////////////////////////////////////////////////////////////////////
// Versi teroptimasi
function setupNumberInputs(containerSelector) {
  const inputs = document.querySelectorAll(`${containerSelector} input[type="number"]`);
  
  inputs.forEach(input => {
    const maxDigits = parseInt(input.getAttribute('maxlength')) || 
                     parseInt(input.getAttribute('data-digits')) || 
                     2;

    input.addEventListener('input', function() {
      if (this.value.length > maxDigits) {
        this.value = this.value.slice(0, maxDigits);
      }
      if (!this.readOnly && this.value.length >= maxDigits) {
        focusNextInput(this, containerSelector);
      }
    });

    input.addEventListener('keydown', function(e) {
      if (e.key === 'Backspace' && this.value.length === 0) {
        focusPrevInput(this, containerSelector);
        e.preventDefault();
      }
    });
  });
}

// Fungsi bantu generik
function focusNextInput(currentInput, selector) {
  const inputs = Array.from(document.querySelectorAll(`${selector} input[type="number"]`));
  const currentIndex = inputs.indexOf(currentInput);
  if (currentIndex < inputs.length - 1) inputs[currentIndex + 1].focus();
}

function focusPrevInput(currentInput, selector) {
  const inputs = Array.from(document.querySelectorAll(`${selector} input[type="number"]`));
  const currentIndex = inputs.indexOf(currentInput);
  if (currentIndex > 0) inputs[currentIndex - 1].focus();
}

// Inisialisasi
setupNumberInputs('.nop-pbb-inputs');
setupNumberInputs('.npwp-inputs');