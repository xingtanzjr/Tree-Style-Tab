/*global chrome*/

(function () {
  const TOTAL_STEPS = 6;
  let currentStep = 0;

  const steps = document.querySelectorAll('.step');
  const dots = document.querySelectorAll('.dot');
  const progressFill = document.getElementById('progressFill');
  const btnNext = document.getElementById('btnNext');
  const btnBack = document.getElementById('btnBack');
  const btnSkip = document.getElementById('btnSkip');

  function showStep(index) {
    currentStep = index;

    // Update steps visibility
    steps.forEach((step, i) => {
      step.classList.toggle('active', i === index);
    });

    // Update dots
    dots.forEach((dot, i) => {
      dot.classList.remove('active', 'completed');
      if (i === index) {
        dot.classList.add('active');
      } else if (i < index) {
        dot.classList.add('completed');
      }
    });

    // Update progress bar
    progressFill.style.width = ((index + 1) / TOTAL_STEPS * 100) + '%';

    // Update buttons
    btnBack.style.display = index === 0 ? 'none' : 'inline-block';
    btnNext.textContent = index === TOTAL_STEPS - 1 ? 'Done' : 'Next';
    btnSkip.style.display = index === TOTAL_STEPS - 1 ? 'none' : 'inline-block';
  }

  btnNext.addEventListener('click', function () {
    if (currentStep < TOTAL_STEPS - 1) {
      showStep(currentStep + 1);
    } else {
      closePage();
    }
  });

  btnBack.addEventListener('click', function () {
    if (currentStep > 0) {
      showStep(currentStep - 1);
    }
  });

  btnSkip.addEventListener('click', closePage);

  // Dot click navigation
  dots.forEach(function (dot) {
    dot.addEventListener('click', function () {
      var step = parseInt(dot.getAttribute('data-step'), 10);
      showStep(step);
    });
  });

  // Keyboard navigation
  document.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight' || e.key === 'Enter') {
      if (currentStep < TOTAL_STEPS - 1) {
        showStep(currentStep + 1);
      } else {
        closePage();
      }
    } else if (e.key === 'ArrowLeft') {
      if (currentStep > 0) {
        showStep(currentStep - 1);
      }
    } else if (e.key === 'Escape') {
      closePage();
    }
  });

  function closePage() {
    // Mark onboarding as completed
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ onboardingCompleted: true });
    }
    window.close();
  }

  // Initialize first step
  showStep(0);
})();
