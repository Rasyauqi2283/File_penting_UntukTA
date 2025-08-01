// loading-utils.js
const photoLoadingInstances = new Map();

const photoLoadingStyles = document.createElement('style');
photoLoadingStyles.textContent = `
  .photo-loading-container {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    background: rgba(0,0,0,0.3);
    border-radius: 50%;
    z-index: 10;
  }
  
  .photo-loading-spinner {
    border: 3px solid rgba(255,255,255,0.3);
    border-radius: 50%;
    border-top: 3px solid #ffffff;
    width: 30px;
    height: 30px;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(photoLoadingStyles);

class PhotoLoadingIndicator {
  constructor(targetElement) {
    this.target = targetElement;
    this.id = `photo-loading-${Date.now()}`;
    this.isShowing = false;
    
    this.init();
  }

  init() {
    if (photoLoadingInstances.has(this.id)) {
      console.warn(`Photo loading instance ${this.id} already exists`);
      return;
    }

    this.container = document.createElement('div');
    this.container.className = 'photo-loading-container';
    this.container.style.display = 'none';

    this.spinner = document.createElement('div');
    this.spinner.className = 'photo-loading-spinner';

    this.container.appendChild(this.spinner);
    this.target.appendChild(this.container);
    
    photoLoadingInstances.set(this.id, this);
  }

  show() {
    if (this.isShowing) return;
    
    this.container.style.display = 'flex';
    this.isShowing = true;
  }

  hide() {
    if (!this.isShowing) return;
    
    this.container.style.display = 'none';
    this.isShowing = false;
  }

  destroy() {
    this.hide();
    this.container.remove();
    photoLoadingInstances.delete(this.id);
  }
}

export const photoLoading = {
  create: (targetElement) => {
    const instance = new PhotoLoadingIndicator(targetElement);
    return instance.id;
  },
  show: (id) => {
    const instance = photoLoadingInstances.get(id);
    if (instance) instance.show();
  },
  hide: (id) => {
    const instance = photoLoadingInstances.get(id);
    if (instance) instance.hide();
  },
  destroy: (id) => {
    const instance = photoLoadingInstances.get(id);
    if (instance) instance.destroy();
  }
};