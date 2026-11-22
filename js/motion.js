/* Maison Zee, round 2 motion layer.
   Three.js satin, GSAP scroll choreography, pointer 3D.
   Everything is progressive enhancement: if a library fails to
   load, or the visitor prefers reduced motion, this file does
   nothing and the calm base site from main.js carries on. */
(function () {
  "use strict";

  window.__mz = { satin: false, gsap: false, scrollTrigger: false };

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) return;

  var hasGsap = typeof window.gsap !== "undefined";
  var hasST = hasGsap && typeof window.ScrollTrigger !== "undefined";
  var finePointer = window.matchMedia("(pointer: fine)").matches;
  var doc = document.documentElement;

  /* The marquee cylinder is pure CSS and needs no library. */
  doc.classList.add("fx3d");

  if (hasGsap && hasST) {
    window.__mz.gsap = true;
    window.__mz.scrollTrigger = true;
    gsap.registerPlugin(ScrollTrigger);
    doc.classList.add("gsap-on");
    initChoreography();
  }
  if (hasGsap && doc.classList.contains("gsap-on") && finePointer) {
    initPointerFx();
  }
  if (hasGsap) initHeroFlip();
  initSatin();

  /* ================= Three.js satin ================= */
  function initSatin() {
    if (typeof window.THREE === "undefined") return;
    var canvas = document.createElement("canvas");
    canvas.className = "satin-gl";
    canvas.setAttribute("aria-hidden", "true");
    document.body.insertBefore(canvas, document.body.firstChild);

    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: canvas, antialias: false, alpha: false, powerPreference: "low-power"
      });
    } catch (e) {
      canvas.remove();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);

    var scene = new THREE.Scene();
    var camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 2;

    var uniforms = {
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0.5, 0.68) },
      uScroll: { value: 0 }
    };

    var vertexShader = [
      "uniform float uTime;",
      "varying vec2 vUv;",
      "varying float vElev;",
      "varying vec3 vNrm;",
      "float elev(vec2 p){",
      "  float t = uTime;",
      "  float e = 0.0;",
      "  e += sin(p.x * 2.3 + t * 0.35) * 0.055;",
      "  e += sin(p.y * 3.1 - t * 0.26) * 0.045;",
      "  e += sin((p.x + p.y) * 1.5 + t * 0.18) * 0.035;",
      "  e += sin(length(p - vec2(0.2, 0.3)) * 3.4 - t * 0.30) * 0.020;",
      "  return e;",
      "}",
      "void main(){",
      "  vUv = uv;",
      "  vec3 pos = position;",
      "  float e = elev(pos.xy);",
      "  pos.z += e;",
      "  float eps = 0.04;",
      "  float ex = elev(pos.xy + vec2(eps, 0.0));",
      "  float ey = elev(pos.xy + vec2(0.0, eps));",
      "  vNrm = normalize(vec3(-(ex - e) / eps, -(ey - e) / eps, 1.0));",
      "  vElev = e;",
      "  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);",
      "}"
    ].join("\n");

    var fragmentShader = [
      "uniform vec2 uMouse;",
      "uniform float uScroll;",
      "varying vec2 vUv;",
      "varying float vElev;",
      "varying vec3 vNrm;",
      "void main(){",
      "  vec3 deep = vec3(0.075, 0.028, 0.020);",
      "  vec3 base = vec3(0.125, 0.048, 0.036);",
      "  vec3 warm = vec3(0.200, 0.095, 0.062);",
      "  vec3 gold = vec3(0.902, 0.773, 0.431);",
      "  float shade = smoothstep(-0.18, 0.20, vElev);",
      "  vec3 col = mix(deep, base, 0.35 + vUv.y * 0.30 + shade * 0.35);",
      "  col = mix(col, warm, shade * 0.22);",
      "  vec2 lp = vec2(uMouse.x, uMouse.y - uScroll * 0.22);",
      "  vec2 asp = vec2(1.35, 1.0);",
      "  float d = distance(vUv * asp, lp * asp);",
      "  float glow = exp(-d * d * 4.5);",
      "  float facing = clamp(dot(normalize(vNrm), normalize(vec3(lp - vUv, 0.6))), 0.0, 1.0);",
      "  col += gold * glow * (0.16 + 0.14 * facing);",
      "  vec2 lp2 = vec2(1.0 - uMouse.x, 0.12 + uScroll * 0.20);",
      "  float d2 = distance(vUv, lp2);",
      "  col += vec3(0.42, 0.17, 0.10) * exp(-d2 * d2 * 3.0) * 0.18;",
      "  col += gold * pow(max(0.0, sin((vUv.x + vUv.y) * 7.0 + vElev * 22.0)), 6.0) * 0.04;",
      "  float dith = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);",
      "  col += (dith - 0.5) * 0.012;",
      "  gl_FragColor = vec4(col, 1.0);",
      "}"
    ].join("\n");

    var mat = new THREE.ShaderMaterial({
      uniforms: uniforms, vertexShader: vertexShader, fragmentShader: fragmentShader
    });
    var mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2, 44, 30), mat);
    scene.add(mesh);

    var tx = 0.5, ty = 0.68, cx = 0.5, cy = 0.68, tScroll = 0, cScroll = 0;
    window.addEventListener("mousemove", function (e) {
      tx = e.clientX / window.innerWidth;
      ty = 1 - e.clientY / window.innerHeight;
    }, { passive: true });
    window.addEventListener("scroll", function () {
      var max = document.body.scrollHeight - window.innerHeight;
      tScroll = max > 0 ? Math.min(1, window.scrollY / max) : 0;
    }, { passive: true });

    var running = true;
    document.addEventListener("visibilitychange", function () {
      running = !document.hidden;
      if (running) requestAnimationFrame(loop);
    });
    window.addEventListener("resize", function () {
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    var clock = new THREE.Clock();
    var firstFrame = true;
    function loop() {
      if (!running) return;
      requestAnimationFrame(loop);
      cx += (tx - cx) * 0.045;
      cy += (ty - cy) * 0.045;
      cScroll += (tScroll - cScroll) * 0.06;
      uniforms.uTime.value = clock.getElapsedTime();
      uniforms.uMouse.value.set(cx, cy);
      uniforms.uScroll.value = cScroll;
      renderer.render(scene, camera);
      if (firstFrame) {
        firstFrame = false;
        window.__mz.satin = true;
        doc.classList.add("gl-on");
      }
    }
    requestAnimationFrame(loop);
  }

  /* ================= GSAP scroll choreography ================= */
  function initChoreography() {
    /* Headings: words rise with a soft spring, one after another. */
    gsap.utils.toArray("[data-words]").forEach(function (el) {
      var words = el.querySelectorAll(".w");
      if (!words.length) return;
      gsap.fromTo(words,
        { yPercent: 115 },
        {
          yPercent: 0, duration: 1.05, ease: "back.out(1.25)", stagger: 0.06,
          scrollTrigger: { trigger: el, start: "top 90%", once: true }
        });
    });

    /* Everything else: calm fade and rise, staggered by section order. */
    gsap.utils.toArray(".reveal").forEach(function (el, i) {
      gsap.fromTo(el,
        { opacity: 0, y: 28 },
        {
          opacity: 1, y: 0, duration: 0.95, ease: "power3.out",
          delay: (i % 3) * 0.06,
          scrollTrigger: { trigger: el, start: "top 90%", once: true }
        });
    });

    /* Hero style chips pop in with a spring stagger. */
    var chips = document.querySelectorAll(".style-chip");
    if (chips.length) {
      gsap.fromTo(chips,
        { scale: 0.55, opacity: 0, y: 14 },
        {
          scale: 1, opacity: 1, y: 0, duration: 0.7, ease: "back.out(2.1)",
          stagger: 0.07, delay: 0.1,
          scrollTrigger: { trigger: ".hero-stage", start: "top 88%", once: true }
        });
    }

    /* Diagonal gold streaks sweep as their section arrives. */
    gsap.utils.toArray(".streak span").forEach(function (span) {
      gsap.set(span, { rotation: -7, xPercent: -40, opacity: 0 });
      var tl = gsap.timeline({
        scrollTrigger: { trigger: span.parentNode, start: "top 88%", once: true }
      });
      tl.to(span, { xPercent: 90, opacity: 1, duration: 0.35, ease: "power1.out" })
        .to(span, { xPercent: 330, opacity: 0, duration: 0.8, ease: "power2.in" });
    });

    /* Signature curtains: panels fold back in true 3D, portrait settles. */
    gsap.utils.toArray(".curtain-card").forEach(function (card) {
      var left = card.querySelector(".curtain-l");
      var right = card.querySelector(".curtain-r");
      var img = card.querySelector(".card-media img");
      var tl = gsap.timeline({
        scrollTrigger: { trigger: card, start: "top 84%", once: true }
      });
      if (img) tl.fromTo(img, { scale: 1.18 }, { scale: 1, duration: 1.5, ease: "power2.out" }, 0);
      if (left) tl.fromTo(left,
        { rotationY: 0, xPercent: 0 },
        { rotationY: 82, xPercent: -14, duration: 1.3, ease: "power3.inOut" }, 0.1);
      if (right) tl.fromTo(right,
        { rotationY: 0, xPercent: 0 },
        { rotationY: -82, xPercent: 14, duration: 1.3, ease: "power3.inOut" }, 0.1);
    });

    window.addEventListener("load", function () { ScrollTrigger.refresh(); });
  }

  /* ================= Hero flip for the style switcher ================= */
  function initHeroFlip() {
    window.MZFlip = function (img, fromLeft) {
      var wrap = img.closest ? img.closest(".arch-photo") : null;
      if (!wrap) return false;
      gsap.fromTo(wrap,
        { rotationY: fromLeft ? -30 : 30, scale: 1.05 },
        { rotationY: 0, scale: 1, duration: 0.75, ease: "power3.out" });
      gsap.fromTo(img,
        { clipPath: fromLeft ? "inset(0% 100% 0% 0%)" : "inset(0% 0% 0% 100%)" },
        { clipPath: "inset(0% 0% 0% 0%)", duration: 0.75, ease: "power3.inOut" });
      return true;
    };
  }

  /* ================= Pointer 3D: parallax, tilt, magnetic ================= */
  function initPointerFx() {
    /* Hero parallax: glow drifts most, frame least, portrait between. */
    var hero = document.querySelector(".hero");
    var glow = document.querySelector(".arch-glow");
    var arch = document.querySelector(".hero-arch");
    var photo = document.querySelector(".arch-photo");
    if (hero && glow && arch && photo) {
      gsap.set(glow, { xPercent: -50, yPercent: -52 });
      var gx = gsap.quickTo(glow, "x", { duration: 0.9, ease: "power3" });
      var gy = gsap.quickTo(glow, "y", { duration: 0.9, ease: "power3" });
      var ax = gsap.quickTo(arch, "x", { duration: 0.7, ease: "power3" });
      var ay = gsap.quickTo(arch, "y", { duration: 0.7, ease: "power3" });
      var px = gsap.quickTo(photo, "x", { duration: 0.55, ease: "power3" });
      var py = gsap.quickTo(photo, "y", { duration: 0.55, ease: "power3" });
      hero.addEventListener("pointermove", function (e) {
        var r = hero.getBoundingClientRect();
        var nx = (e.clientX - r.left) / r.width - 0.5;
        var ny = (e.clientY - r.top) / r.height - 0.5;
        gx(nx * 34); gy(ny * 24);
        ax(nx * -9); ay(ny * -7);
        px(nx * 14); py(ny * 10);
      });
      hero.addEventListener("pointerleave", function () {
        gx(0); gy(0); ax(0); ay(0); px(0); py(0);
      });
    }

    /* Signature cards: 3D tilt with an elastic settle. */
    document.querySelectorAll(".card").forEach(function (card) {
      var baseRz = card.classList.contains("tilt-l") ? -2 :
                   card.classList.contains("tilt-r") ? 2 : 0.6;
      var baseY = card.classList.contains("tilt-c") ? 10 : 0;
      gsap.set(card, { rotationZ: baseRz, y: baseY, rotationX: 0, rotationY: 0 });
      card.addEventListener("pointermove", function (e) {
        var r = card.getBoundingClientRect();
        var relX = (e.clientX - r.left) / r.width - 0.5;
        var relY = (e.clientY - r.top) / r.height - 0.5;
        gsap.to(card, {
          rotationY: relX * 13, rotationX: relY * -10, scale: 1.02,
          duration: 0.5, ease: "power2.out"
        });
      });
      card.addEventListener("pointerleave", function () {
        gsap.to(card, {
          rotationX: 0, rotationY: 0, scale: 1,
          duration: 0.9, ease: "elastic.out(1, 0.55)"
        });
      });
    });

    /* Magnetic gold buttons lean toward the cursor. */
    document.querySelectorAll(".site-head .btn-gold, .hero .btn-gold").forEach(function (btn) {
      btn.classList.add("magnetic");
      btn.addEventListener("pointermove", function (e) {
        var r = btn.getBoundingClientRect();
        gsap.to(btn, {
          x: (e.clientX - (r.left + r.width / 2)) * 0.28,
          y: (e.clientY - (r.top + r.height / 2)) * 0.34,
          duration: 0.4, ease: "power3.out"
        });
      });
      btn.addEventListener("pointerleave", function () {
        gsap.to(btn, { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1, 0.4)" });
      });
    });
  }
})();
