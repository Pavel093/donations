window.addEventListener('scroll', function() {
  const header = document.querySelector('.main-header');
  const scrollPosition = window.scrollY || document.documentElement.scrollTop;
  
  if (scrollPosition > 10) {
    header.classList.add('scrolled');
  } else {
    header.classList.remove('scrolled');
  }
});