const images = document.querySelectorAll('.image-section img, .colour-item img');
const modal = document.getElementById('imageModal');
const modalImg = document.getElementById('modalImage');
const captionText = document.getElementById('caption');
const closeBtn = document.querySelector('.close');

images.forEach((img) => {
    img.addEventListener('click', (e) => {
    	console.log('clicked', img.src)
        modal.style.display = 'flex';
        modalImg.src = img.src;
        captionText.innerHTML = img.alt;

        document.body.style.overflow = 'hidden';
    });
});

closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
});

modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
});
