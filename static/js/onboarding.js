// onboarding.js
// Lightweight Shepherd-based onboarding helper (no bundler). Assumes Shepherd CSS/JS are available via CDN in templates.

(function (window, document) {
  'use strict';

  /* exported startTour, startIfNotCompleted, waitFor */

  // Utility to read cookie
  function getCookie(name) {
    const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : undefined;
  }

  function fetchJSON(url, options) {
    return fetch(url, Object.assign({ credentials: 'same-origin' }, options)).then(function (r) {
      if (!r.ok) throw new Error('Network response was not ok: ' + r.status);
      return r.json();
    });
  }

  function waitFor(selector, timeoutMs) {
    return new Promise(function (resolve, reject) {
      const el = document.querySelector(selector);
      if (el) return resolve(el);
      const interval = 100;
      let elapsed = 0;
      const timer = setInterval(function () {
        const node = document.querySelector(selector);
        if (node) {
          clearInterval(timer);
          return resolve(node);
        }
        elapsed += interval;
        if (elapsed >= timeoutMs) {
          clearInterval(timer);
          return reject(new Error('Timeout waiting for ' + selector));
        }
      }, interval);
    });
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = function () { resolve(src); };
      s.onerror = function () { reject(new Error('Failed to load ' + src)); };
      document.head.appendChild(s);
    });
  }

  function ensureShepherdLoaded(callback) {
    if (window.Shepherd) {
      console.debug('[Onboarding] Shepherd already available');
      return callback();
    }

    var cdns = [
      'https://unpkg.com/shepherd.js/dist/js/shepherd.min.js',
      'https://cdn.jsdelivr.net/npm/shepherd.js/dist/js/shepherd.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/shepherd/8.1.0/shepherd.min.js'
    ];

    // Also ensure CSS is present (best-effort)
    if (!document.querySelector('link[href*="shepherd"][rel="stylesheet"]')) {
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/shepherd.js/dist/css/shepherd.css';
      document.head.appendChild(link);
    }

    // Try loading CDNs sequentially until Shepherd becomes available
    (function tryNext(i) {
      if (window.Shepherd) return callback();
      if (i >= cdns.length) {
        console.warn('[Onboarding] All Shepherd CDN attempts failed; Shepherd is not available');
        return callback();
      }
      var src = cdns[i];
      console.debug('[Onboarding] Attempting to load Shepherd from', src);
      loadScript(src).then(function () {
        // Wait a short tick for the global to appear
        setTimeout(function () {
          if (window.Shepherd) {
            console.debug('[Onboarding] Shepherd loaded from', src);
            return callback();
          }
          // Try next
          tryNext(i + 1);
        }, 150);
      }).catch(function (err) {
        console.warn('[Onboarding] Failed to load Shepherd from', src, err);
        tryNext(i + 1);
      });
    })(0);
  }

  function postComplete(tourName) {
    var url = '/users/api/onboarding/complete/' + encodeURIComponent(tourName) + '/';
    console.debug('[Onboarding] Posting completion for tour:', tourName, 'to', url);
    // store locally so anonymous users don't see the tour again in this browser
    try { localStorage.setItem('onboarding_completed_' + tourName, '1'); } catch (e) { /* ignore */ }

    var csrf = getCookie('csrftoken') || (document.querySelector('meta[name="csrf-token"]') && document.querySelector('meta[name="csrf-token"]').getAttribute('content'));

    // Get user_id from window.userData if available
    var userId = null;
    if (window.userData && window.userData.id) {
      userId = window.userData.id;
    }

    // Use direct fetch to ensure proper Django session/CSRF handling
    return fetch(url, {
      method: 'POST',
      credentials: 'include', // Include session cookies
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-CSRFToken': csrf || '',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify({ user_id: userId }) // Send user_id from userData
    }).then(function (r) {
      var ct = r.headers.get('content-type') || '';
      if (r.redirected || ct.indexOf('text/html') !== -1) {
        console.warn('[Onboarding] completion POST may have been redirected (not authenticated) or returned HTML:', r.url);
      }
      if (!r.ok) {
        console.warn('[Onboarding] completion POST returned status', r.status);
        // For 401, it's expected for anonymous users - they get localStorage fallback
        if (r.status === 401) {
          console.debug('[Onboarding] User not authenticated, using localStorage only');
        }
      } else {
        console.debug('[Onboarding] Completion successfully saved to server');
      }
      return r;
    }).catch(function (err) {
      console.warn('[Onboarding] Failed to post onboarding completion', err);
      try { localStorage.setItem('onboarding_completed_' + tourName, '1'); } catch (e) { /* ignore */ }
    });
  }

  function startTour(tourName, steps) {
    console.debug('[Onboarding] startTour called for', tourName, 'with steps', steps && steps.length);
    ensureShepherdLoaded(function () {
      try {
        if (!window.Shepherd) {
          console.warn('[Onboarding] Shepherd is not available after loading attempts; cannot start tour');
          return;
        }

        var tour = new Shepherd.Tour({ useModalOverlay: true, defaultStepOptions: { scrollTo: true } });

        // Prevent Shepherd buttons from acting as form submits when placed inside a form
        function fixShepherdButtons() {
          try {
            var buttons = document.querySelectorAll('.shepherd-button, .shepherd-footer .btn');
            buttons.forEach(function (b) {
              if (b && b.tagName && b.tagName.toLowerCase() === 'button') {
                b.type = 'button';
              }
            });
          } catch (e) {
            // noop
          }
        }

        for (var i = 0; i < steps.length; i++) {
          var s = steps[i];
          var elPresent = !!(s.selector && document.querySelector(s.selector));
          if (s.selector && !elPresent) {
            console.debug('[Onboarding] selector not present for step, adding floating step:', s.selector);
          }
          // Default buttons: if not provided, use Next for intermediate steps and Done for last step
          var defaultButtons;
          if (s.buttons && Array.isArray(s.buttons) && s.buttons.length) {
            defaultButtons = s.buttons;
          } else if (i < steps.length - 1) {
            defaultButtons = [ { text: 'Next', action: function () { tour.next(); } } ];
          } else {
            defaultButtons = [ { text: 'Done', action: function () { try { tour.complete(); } catch (e) { console.warn('[Onboarding] complete action failed', e); } } } ];
          }

          var step = {
            id: s.id || (s.selector || 'step') + '-' + Math.random().toString(36).slice(2, 8),
            text: s.text || '',
            attachTo: (s.selector && elPresent) ? { element: s.selector, on: s.attachTo || 'bottom' } : undefined,
            classes: s.classes || undefined,
            buttons: defaultButtons
          };
          tour.addStep(step);
        }

        tour.on('show', function () { fixShepherdButtons(); });
        tour.on('start', function () { fixShepherdButtons(); });
        tour.on('complete', function () { postComplete(tourName); });
        tour.on('cancel', function () { postComplete(tourName); });

        // Wait for first step element(s) if they are required
        var firstSelectors = steps.map(function (s) { return s.selector; }).filter(Boolean);
        if (firstSelectors.length) {
          // wait for all selectors to appear (short timeout)
          Promise.all(firstSelectors.map(function (sel) { return waitFor(sel, 5000).catch(function () { return null; }); })).then(function () {
            try {
              tour.start();
              // ensure buttons aren't submit buttons
              setTimeout(fixShepherdButtons, 50);
              console.debug('[Onboarding] Tour started:', tourName);
            } catch (e) {
              console.warn('[Onboarding] Tour failed to start', e);
            }
          });
        } else {
          try {
            tour.start();
            setTimeout(fixShepherdButtons, 50);
            console.debug('[Onboarding] Tour started:', tourName);
          } catch (e) {
            console.warn('[Onboarding] Tour failed to start', e);
          }
        }
      } catch (err) {
        console.warn('[Onboarding] Failed to start tour', err);
      }
    });
  }

  // Helper: check status and start if not completed
  function startIfNotCompleted(tourName, steps) {
    console.debug('[Onboarding] Checking status for', tourName);
    // First check localStorage to avoid re-showing tours already completed in this browser
    try {
      var localFlag = localStorage.getItem('onboarding_completed_' + tourName);
      if (localFlag === '1') {
        console.debug('[Onboarding] local completion flag found for', tourName, '- skipping tour');
        return;
      }
    } catch (e) {
      // ignore localStorage errors and proceed to server check
    }

    // Get user_id from window.userData if available
    var userId = null;
    if (window.userData && window.userData.id) {
      userId = window.userData.id;
    }

    // Build URL with user_id query parameter
    var statusUrl = '/users/api/onboarding/status/' + encodeURIComponent(tourName) + '/';
    if (userId) {
      statusUrl += '?user_id=' + encodeURIComponent(userId);
    }

    fetchJSON(statusUrl)
      .then(function (json) {
        console.debug('[Onboarding] status response for', tourName, json);
        if (!json || !json.completed) {
          startTour(tourName, steps);
        } else {
          console.debug('[Onboarding] tour already completed (server):', tourName);
          try { localStorage.setItem('onboarding_completed_' + tourName, '1'); } catch (e) { /* ignore */ }
        }
      })
      .catch(function (err) {
        console.warn('[Onboarding] Failed to fetch onboarding status', err, ' — starting tour as fallback');
        // If the status call fails (network/CORS), we still start the tour — but be conservative: we won't overwrite local completion flag here.
        startTour(tourName, steps);
      });
  }

  // Expose API
  window.Onboarding = {
    startTour: startTour,
    startIfNotCompleted: startIfNotCompleted,
    waitFor: waitFor
  };

})(window, document);
