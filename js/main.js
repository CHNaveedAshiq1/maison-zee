(function () {
  "use strict";
  var root = document.documentElement;

  /* ---------- Satin background: light follows mouse and scroll ---------- */
  var ticking = false;
  function onMove(e) {
    var x = (e.clientX / window.innerWidth) * 100;
    var y = (e.clientY / window.innerHeight) * 100;
    root.style.setProperty("--mx", x.toFixed(1) + "%");
    root.style.setProperty("--my", y.toFixed(1) + "%");
  }
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var max = document.body.scrollHeight - window.innerHeight;
      var p = max > 0 ? window.scrollY / max : 0;
      root.style.setProperty("--scroll", p.toFixed(3));
      ticking = false;
    });
  }
  window.addEventListener("mousemove", onMove, { passive: true });
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Split headings into rising words ---------- */
  document.querySelectorAll("[data-words]").forEach(function (el) {
    var words = el.textContent.trim().split(/\s+/);
    el.textContent = "";
    words.forEach(function (word, i) {
      var wrap = document.createElement("span");
      wrap.className = "w-wrap";
      var w = document.createElement("span");
      w.className = "w";
      w.style.setProperty("--i", i);
      w.textContent = word;
      wrap.appendChild(w);
      el.appendChild(wrap);
      el.appendChild(document.createTextNode(" "));
    });
  });

  /* ---------- Reveal on scroll ---------- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      var el = entry.target;
      el.classList.add("in");
      if (el.hasAttribute("data-words")) el.classList.add("words-in");
      io.unobserve(el);
    });
  }, { threshold: 0.22 });
  document.querySelectorAll(".reveal, [data-words], .curtain-card, .streak").forEach(function (el) {
    io.observe(el);
  });

  /* ---------- Marquee: duplicate group for a seamless loop ---------- */
  var track = document.getElementById("marqueeTrack");
  if (track) {
    var clone = track.children[0].cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    track.appendChild(clone);
  }

  /* ---------- Hero mirror: style chips slice a new portrait in ---------- */
  var heroImg = document.getElementById("heroImg");
  var chips = document.querySelectorAll(".style-chip[data-img]");
  chips.forEach(function (chip) {
    chip.addEventListener("click", function (e) {
      var src = chip.getAttribute("data-img");
      chips.forEach(function (c) { c.classList.remove("is-active"); });
      chip.classList.add("is-active");
      if (!heroImg || heroImg.getAttribute("src") === src) return;
      var rect = chip.getBoundingClientRect();
      var fromLeft = (e.clientX || rect.left + rect.width / 2) < rect.left + rect.width / 2;
      var pre = new Image();
      pre.onload = function () {
        heroImg.src = src;
        if (window.MZFlip && window.MZFlip(heroImg, fromLeft)) return;
        heroImg.classList.remove("slice-l", "slice-r");
        void heroImg.offsetWidth;
        heroImg.classList.add(fromLeft ? "slice-l" : "slice-r");
      };
      pre.src = src;
    });
  });

  /* ---------- Text that lights up as you scroll ---------- */
  var lightEl = document.querySelector("[data-lightup]");
  var lightWords = [];
  if (lightEl) {
    var parts = lightEl.textContent.trim().split(/\s+/);
    lightEl.textContent = "";
    parts.forEach(function (word) {
      var s = document.createElement("span");
      s.className = "lw";
      s.textContent = word;
      lightEl.appendChild(s);
      lightEl.appendChild(document.createTextNode(" "));
      lightWords.push(s);
    });
    var lightTick = false;
    var updateLight = function () {
      var r = lightEl.getBoundingClientRect();
      var vh = window.innerHeight;
      var progress = (vh * 0.88 - r.top) / (r.height + vh * 0.35);
      progress = Math.max(0, Math.min(1, progress));
      var lit = Math.round(progress * lightWords.length);
      lightWords.forEach(function (w, i) { w.classList.toggle("lit", i < lit); });
      lightTick = false;
    };
    window.addEventListener("scroll", function () {
      if (!lightTick) { lightTick = true; requestAnimationFrame(updateLight); }
    }, { passive: true });
    updateLight();
  }

  /* ---------- Booking form ---------- */
  var form = document.getElementById("bookForm");
  if (!form) return;
  var done = document.getElementById("bookDone");
  var doneText = document.getElementById("doneText");
  var nameIn = document.getElementById("fName");
  var contactIn = document.getElementById("fContact");
  var serviceIn = document.getElementById("fService");
  var dateIn = document.getElementById("fDate");
  var slots = Array.prototype.slice.call(document.querySelectorAll(".slot"));
  var chosenTime = "";

  var today = new Date();
  var iso = today.toISOString().split("T")[0];
  dateIn.min = iso;

  slots.forEach(function (slot) {
    slot.addEventListener("click", function () {
      slots.forEach(function (s) { s.classList.remove("selected"); });
      slot.classList.add("selected");
      chosenTime = slot.getAttribute("data-time");
      setError("slotGroup", "");
    });
  });

  function setError(key, msg) {
    var p = form.querySelector('[data-error-for="' + key + '"]');
    if (p) p.textContent = msg;
  }
  function mark(input, bad) { input.classList.toggle("invalid", bad); }

  function isEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); }
  function isPhone(v) {
    var digits = v.replace(/[^\d]/g, "");
    return /^[+\d][\d\s()-]{6,}$/.test(v) && digits.length >= 7 && digits.length <= 15;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var ok = true;

    var name = nameIn.value.trim();
    if (name.length < 2) { setError("fName", "Please tell us your full name."); mark(nameIn, true); ok = false; }
    else { setError("fName", ""); mark(nameIn, false); }

    var contact = contactIn.value.trim();
    if (!isEmail(contact) && !isPhone(contact)) {
      setError("fContact", "Please add a valid phone number or email so we can confirm.");
      mark(contactIn, true); ok = false;
    } else { setError("fContact", ""); mark(contactIn, false); }

    if (!serviceIn.value) { setError("fService", "Please choose a service."); mark(serviceIn, true); ok = false; }
    else { setError("fService", ""); mark(serviceIn, false); }

    if (!dateIn.value) { setError("fDate", "Please pick a date."); mark(dateIn, true); ok = false; }
    else if (dateIn.value < iso) { setError("fDate", "That date has passed. Please pick a day ahead."); mark(dateIn, true); ok = false; }
    else { setError("fDate", ""); mark(dateIn, false); }

    if (!chosenTime) { setError("slotGroup", "Please choose a time slot."); ok = false; }

    if (!ok) return;

    var niceDate = new Date(dateIn.value + "T12:00:00").toLocaleDateString("en-GB", {
      weekday: "long", day: "numeric", month: "long", year: "numeric"
    });
    doneText.textContent = "Thank you, " + name.split(" ")[0] + ". Your request for " +
      serviceIn.value + " on " + niceDate + " at " + chosenTime +
      " is with us. We will confirm to " + contact + " shortly.";
    form.hidden = true;
    done.hidden = false;
    done.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  document.getElementById("bookAgain").addEventListener("click", function () {
    form.reset();
    slots.forEach(function (s) { s.classList.remove("selected"); });
    chosenTime = "";
    done.hidden = true;
    form.hidden = false;
    form.scrollIntoView({ behavior: "smooth", block: "center" });
  });
})();
