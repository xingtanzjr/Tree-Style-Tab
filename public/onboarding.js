/*global chrome*/

(function () {
  // Apply i18n translations to all elements with data-i18n or data-i18n-html attributes
  function applyI18n() {
    if (typeof chrome === 'undefined' || !chrome.i18n) return;
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var msg = chrome.i18n.getMessage(el.getAttribute('data-i18n'));
      if (msg) el.textContent = msg;
    });
    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      var msg = chrome.i18n.getMessage(el.getAttribute('data-i18n-html'));
      if (msg) el.innerHTML = msg;
    });
    // Update page title
    var titleEl = document.querySelector('title[data-i18n]');
    if (titleEl) {
      var titleMsg = chrome.i18n.getMessage(titleEl.getAttribute('data-i18n'));
      if (titleMsg) document.title = titleMsg;
    }
  }
  applyI18n();

  var TOTAL_STEPS = 7;
  let currentStep = 0;

  const steps = document.querySelectorAll('.step');
  const dots = document.querySelectorAll('.dot');
  const progressFill = document.getElementById('progressFill');
  const btnNext = document.getElementById('btnNext');
  const btnBack = document.getElementById('btnBack');
  const btnSkip = document.getElementById('btnSkip');

  function t(key, fallback) {
    if (typeof chrome !== 'undefined' && chrome.i18n) {
      var msg = chrome.i18n.getMessage(key);
      if (msg) return msg;
    }
    return fallback;
  }

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
    btnNext.textContent = index === TOTAL_STEPS - 1 ? t('onb_done', 'Done') : t('onb_next', 'Next');
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
    // Open side panel before closing
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ action: 'openSidePanel' }, function () {
        window.close();
      });
    } else {
      window.close();
    }
  }

  // ---- Tab Groups Permission Request ----
  var btnEnable = document.getElementById('btnEnableTabGroups');
  var permRequestInner = document.getElementById('permissionRequestInner');
  var permGranted = document.getElementById('permissionGranted');

  function showPermissionGranted() {
    if (permRequestInner) permRequestInner.style.display = 'none';
    if (permGranted) permGranted.style.display = '';
  }

  // Check if already granted on page load
  if (typeof chrome !== 'undefined' && chrome.permissions) {
    chrome.permissions.contains({ permissions: ['tabGroups'] }, function (result) {
      if (result) showPermissionGranted();
    });
  }

  if (btnEnable) {
    btnEnable.addEventListener('click', function () {
      if (typeof chrome !== 'undefined' && chrome.permissions) {
        chrome.permissions.request({ permissions: ['tabGroups'] }, function (granted) {
          if (granted) showPermissionGranted();
        });
      }
    });
  }

  // Initialize first step
  showStep(0);
})();
