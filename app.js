if (typeof window.THREE === "undefined") {
  window.addEventListener("DOMContentLoaded", () => {
    const body = document.body;
    const msg = document.createElement("div");
    msg.setAttribute("role", "alert");
    msg.style.position = "fixed";
    msg.style.inset = "0";
    msg.style.display = "grid";
    msg.style.placeItems = "center";
    msg.style.padding = "24px";
    msg.style.background = "rgba(4,7,15,.96)";
    msg.style.color = "#c8d8f0";
    msg.style.fontFamily = "'Share Tech Mono', monospace";
    msg.style.textAlign = "center";
    msg.style.zIndex = "9999";
    msg.innerHTML =
      "⚠ Unable to load 3D engine (Three.js CDN).<br>Please refresh or check network access.";
    body.appendChild(msg);
  });
} else {
  /* ════════════════════════════════════════
TOOLTIP
════════════════════════════════════════ */
  const TT = document.getElementById("tt");
  let TTt;
  const TTAC = ["#00d4ff", "#ff6b35", "#00ff9d", "#ffc93c", "#c084fc"];
  function showTT(mx, my, title, rows, col = "#00d4ff") {
    document.getElementById("tt-t").textContent = title;
    TT.style.borderLeftColor = col;
    document.getElementById("tt-b").innerHTML = rows
      .map((r) => `<div class="ttr">${r.l}: <b>${r.v}</b></div>`)
      .join("");
    TT.style.left = Math.min(mx + 16, window.innerWidth - 250) + "px";
    TT.style.top = my + "px";
    TT.classList.add("on");
    clearTimeout(TTt);
  }
  function hideTT() {
    TTt = setTimeout(() => TT.classList.remove("on"), 80);
  }

  /* ════════════════════════════════════════
TAB SWITCHING
════════════════════════════════════════ */
  let curTab = 0;
  function goTab(i) {
    curTab = i;
    document
      .querySelectorAll(".tab-btn")
      .forEach((b, j) => b.classList.toggle("on", i === j));
    document
      .querySelectorAll(".mod-form")
      .forEach((f, j) => f.classList.toggle("on", i === j));
    if (i === 1) {
      // Profit tab: always show 2D canvas area
      document.getElementById("ph").style.display = "none";
      document.getElementById("c3d").style.display = "none";
      document.getElementById("badge3d").style.display = "none";
      document.getElementById("badge2d").style.display = "flex";
      const c2 = document.getElementById("c2d");
      c2.style.display = "block";
      // If profit was already computed, redraw
      if (window._profitData) draw2DProfit(window._profitData);
      else draw2DPlaceholder();
    } else {
      document.getElementById("c2d").style.display = "none";
      document.getElementById("p2d-tip").style.display = "none";
      document.getElementById("badge2d").style.display = "none";
      document.getElementById("badge3d").style.display = "flex";
      if (!SCENES[i]) {
        showPH();
      } else {
        hidePH();
        refit();
      }
    }
  }
  function showPH() {
    document.getElementById("ph").style.display = "flex";
    document.getElementById("c3d").style.display = "none";
  }
  function hidePH() {
    document.getElementById("ph").style.display = "none";
    document.getElementById("c3d").style.display = "block";
  }

  /* ════════════════════════════════════════
THREE.JS ENGINE
════════════════════════════════════════ */
  const canvas = document.getElementById("c3d");
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const cam = new THREE.PerspectiveCamera(52, 1, 0.1, 500);
  // Shared state
  let rotX = 0.3,
    rotY = 0.6,
    tRotX = 0.3,
    tRotY = 0.6,
    zoom = 10,
    tZoom = 10;
  let dragging = false,
    lmx = 0,
    lmy = 0,
    autoRot = true,
    arTimer;

  // Scene pool: one THREE.Scene per tab (null until computed)
  const SCENES = [null, null, null, null, null];
  const MESHES = [null, null, null, null, null]; // hover meshes per tab
  const PIVOTS = [null, null, null, null, null];
  const TICKERS = [null, null, null, null, null]; // tick functions
  let curTHREEScene = null;

  const clock = new THREE.Clock();
  let elapsed = 0;

  function refit() {
    const wrap = canvas.parentElement;
    renderer.setSize(wrap.clientWidth, wrap.clientHeight, true);
    cam.aspect = wrap.clientWidth / wrap.clientHeight;
    cam.updateProjectionMatrix();
  }
  window.addEventListener("resize", () => {
    refit();
  });

  // Mouse / touch
  canvas.addEventListener("mousedown", (e) => {
    dragging = true;
    lmx = e.clientX;
    lmy = e.clientY;
    autoRot = false;
    clearTimeout(arTimer);
    e.preventDefault();
  });
  window.addEventListener("mousemove", (e) => {
    if (dragging) {
      tRotY += (e.clientX - lmx) * 0.007;
      tRotX += (e.clientY - lmy) * 0.007;
      tRotX = Math.max(-1.1, Math.min(1.1, tRotX));
      lmx = e.clientX;
      lmy = e.clientY;
    }
    rayHover(e);
  });
  window.addEventListener("mouseup", () => {
    dragging = false;
    arTimer = setTimeout(() => (autoRot = true), 4000);
  });
  canvas.addEventListener(
    "wheel",
    (e) => {
      tZoom = Math.max(3, Math.min(22, tZoom + e.deltaY * 0.013));
      e.preventDefault();
    },
    { passive: false },
  );
  canvas.addEventListener(
    "touchstart",
    (e) => {
      dragging = true;
      autoRot = false;
      lmx = e.touches[0].clientX;
      lmy = e.touches[0].clientY;
      e.preventDefault();
    },
    { passive: false },
  );
  canvas.addEventListener(
    "touchmove",
    (e) => {
      if (!dragging) return;
      tRotY += (e.touches[0].clientX - lmx) * 0.007;
      tRotX += (e.touches[0].clientY - lmy) * 0.007;
      lmx = e.touches[0].clientX;
      lmy = e.touches[0].clientY;
      e.preventDefault();
    },
    { passive: false },
  );
  canvas.addEventListener("touchend", () => {
    dragging = false;
    setTimeout(() => (autoRot = true), 4000);
  });

  function rayHover(e) {
    if (!SCENES[curTab] || !MESHES[curTab]) return;
    const r = canvas.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    ) {
      hideTT();
      return;
    }
    const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
    const ny = -((e.clientY - r.top) / r.height) * 2 + 1;
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(nx, ny), cam);
    const hits = ray.intersectObjects(MESHES[curTab], true);
    if (hits.length) {
      let node = hits[0].object;
      while (node && !node.userData.info) node = node.parent;
      if (node?.userData?.info) {
        const inf = node.userData.info(hits[0].point);
        showTT(e.clientX, e.clientY, inf.t, inf.r, TTAC[curTab]);
        canvas.style.cursor = "crosshair";
        return;
      }
    }
    hideTT();
    canvas.style.cursor = dragging ? "grabbing" : "grab";
  }

  function updateCam() {
    rotX += (tRotX - rotX) * 0.09;
    rotY += (tRotY - rotY) * 0.09;
    zoom += (tZoom - zoom) * 0.09;
    if (autoRot) tRotY += 0.004;
    cam.position.set(
      zoom * Math.sin(rotY) * Math.cos(rotX),
      zoom * Math.sin(rotX),
      zoom * Math.cos(rotY) * Math.cos(rotX),
    );
    cam.lookAt(0, 0, 0);
  }

  // Render loop
  function loop() {
    requestAnimationFrame(loop);
    const dt = clock.getDelta();
    elapsed += dt;
    updateCam();
    if (SCENES[curTab]) {
      if (TICKERS[curTab]) TICKERS[curTab](elapsed, dt);
      renderer.render(SCENES[curTab], cam);
    } else {
      renderer.clear();
    }
  }
  showPH();
  refit();
  loop();

  /* ════════════════════════════════════════
HELPERS
════════════════════════════════════════ */
  const f2 = (n, d = 2) => Number(n).toFixed(d);
  const fBig = (n) =>
    n >= 1e6
      ? (n / 1e6).toFixed(2) + "M"
      : n >= 1e3
        ? (n / 1e3).toFixed(1) + "K"
        : n.toFixed(1);

  function makeScene(accent) {
    const sc = new THREE.Scene();
    sc.fog = new THREE.FogExp2(0x04070f, 0.02);
    sc.add(new THREE.AmbientLight(0x0a1428, 3));
    const sun = new THREE.DirectionalLight(0xffffff, 1.8);
    sun.position.set(6, 14, 9);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -12;
    sun.shadow.camera.right = 12;
    sun.shadow.camera.top = 12;
    sun.shadow.camera.bottom = -12;
    sc.add(sun);
    const ac = new THREE.PointLight(new THREE.Color(accent), 3, 28);
    ac.position.set(-4, 8, -4);
    sc.add(ac);
    sc.add(new THREE.DirectionalLight(0x112244, 0.6)).position.set(-6, 3, -8);
    const grid = new THREE.GridHelper(26, 26, 0x152040, 0x0d1628);
    grid.position.y = -0.02;
    sc.add(grid);
    return sc;
  }

  function helix(sc, sx, sz, y1, y2, col, turns = 7) {
    const pts = [];
    const segs = 80;
    for (let i = 0; i <= segs; i++) {
      const t = i / segs,
        a = t * turns * Math.PI * 2;
      pts.push(
        new THREE.Vector3(
          sx + 0.18 * Math.cos(a),
          y1 + t * (y2 - y1),
          sz + 0.18 * Math.sin(a),
        ),
      );
    }
    const g = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(pts),
      segs,
      0.04,
      6,
      false,
    );
    const m = new THREE.MeshStandardMaterial({
      color: new THREE.Color(col),
      emissive: new THREE.Color(col),
      emissiveIntensity: 0.25,
      metalness: 0.6,
      roughness: 0.3,
    });
    const msh = new THREE.Mesh(g, m);
    sc.add(msh);
    return msh;
  }

  function sprite(text, color, sc) {
    const cv = document.createElement("canvas");
    cv.width = 380;
    cv.height = 64;
    const cx = cv.getContext("2d");
    cx.fillStyle = "rgba(4,7,15,.9)";
    function rr(c, x, y, w, h, r) {
      c.beginPath();
      c.moveTo(x + r, y);
      c.arcTo(x + w, y, x + w, y + h, r);
      c.arcTo(x + w, y + h, x, y + h, r);
      c.arcTo(x, y + h, x, y, r);
      c.arcTo(x, y, x + w, y, r);
      c.closePath();
    }
    rr(cx, 2, 2, 376, 60, 6);
    cx.fill();
    cx.strokeStyle = color;
    cx.lineWidth = 1.5;
    rr(cx, 2, 2, 376, 60, 6);
    cx.stroke();
    cx.fillStyle = color;
    cx.font = "bold 21px Share Tech Mono";
    cx.textAlign = "center";
    cx.textBaseline = "middle";
    cx.fillText(text, 190, 32);
    const t = new THREE.CanvasTexture(cv);
    const sp = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: t,
        transparent: true,
        depthTest: false,
      }),
    );
    sp.scale.set(3.2, 0.65, 1);
    sc.add(sp);
    return sp;
  }

  function resRow(lbl, val, col = "var(--text)") {
    return `<div class="res-row"><span class="rl">${lbl}</span><span class="rv" style="color:${col}">${val}</span></div>`;
  }
  function showResult(id, html) {
    document.getElementById(id + "-e").style.display = "none";
    document.getElementById(id).innerHTML = html;
  }

  function resetView() {
    tRotX = 0.3;
    tRotY = 0.6;
    tZoom = 10;
  }

  /* ════════════════════════════════════════
COMPUTE DISPATCHER
════════════════════════════════════════ */
  function compute(i) {
    switch (i) {
      case 0:
        compVibration();
        break;
      case 1:
        compProfit();
        break;
      case 2:
        compPipe();
        break;
      case 3:
        compSlab();
        break;
      case 4:
        compVortex();
        break;
    }
  }

  /* ════════════════════════════════════════
MODULE 0 · VIBRATION (EIGENVALUE)
════════════════════════════════════════ */
  function compVibration() {
    const m1 = +document.getElementById("v-m1").value * 1000; // kg
    const m2 = +document.getElementById("v-m2").value * 1000;
    const k1 = +document.getElementById("v-k1").value * 1000; // N/m
    const k2 = +document.getElementById("v-k2").value * 1000;
    const fe = +document.getElementById("v-fe").value;

    const A = m1 * m2,
      B = -(m1 * k2 + m2 * (k1 + k2)),
      C = k1 * k2;
    const disc = B * B - 4 * A * C;
    if (disc < 0) {
      alert("No real eigenvalues. Check inputs.");
      return;
    }
    const l1 = (-B - Math.sqrt(disc)) / (2 * A),
      l2 = (-B + Math.sqrt(disc)) / (2 * A);
    const w1 = Math.sqrt(l1),
      f1 = w1 / (2 * Math.PI);
    const w2 = Math.sqrt(l2),
      f2 = w2 / (2 * Math.PI);
    const r1 = Math.abs(fe - f1) / f1,
      r2 = Math.abs(fe - f2) / f2;
    const minSep = Math.min(r1, r2);
    const danger = minSep < 0.1,
      warn = minSep < 0.25 && !danger;

    showResult(
      "r0",
      resRow("Mode 1 f₁", f1.toFixed(3) + " Hz", "#00d4ff") +
        resRow("Mode 2 f₂", f2.toFixed(3) + " Hz", "#00d4ff") +
        resRow("ω₁", w1.toFixed(2) + " rad/s", "var(--muted)") +
        resRow("ω₂", w2.toFixed(2) + " rad/s", "var(--muted)") +
        resRow("Excitation fₑ", fe.toFixed(3) + " Hz", "#ff6b35") +
        resRow(
          "Min separation",
          (minSep * 100).toFixed(1) + "%",
          danger ? "#ff5050" : warn ? "#ffc93c" : "#00ff9d",
        ) +
        `<div class="alert ${danger ? "a-bad" : warn ? "a-warn" : "a-ok"}">${danger ? "⚠ RESONANCE RISK — Redesign needed!" : warn ? "⚡ Caution: Add damping system" : "✓ Safe — Frequencies well separated"}</div>`,
    );

    // Build 3D
    const d = { m1, m2, k1, k2, f1, f2, fe, danger, warn };
    build3D_Vibration(d);
    hidePH();
    resetView();
    tZoom = 11;
  }

  function build3D_Vibration(d) {
    const sc = makeScene("#00d4ff");
    const pivot = new THREE.Group();
    sc.add(pivot);
    const meshes = [];

    // Ground
    const gnd = new THREE.Mesh(
      new THREE.BoxGeometry(6, 0.18, 4.4),
      new THREE.MeshStandardMaterial({
        color: 0x112035,
        metalness: 0.5,
        roughness: 0.6,
      }),
    );
    gnd.receiveShadow = true;
    pivot.add(gnd);

    // Columns
    const cPos = [
      [-2, -1.6],
      [2, -1.6],
      [-2, 1.6],
      [2, 1.6],
    ];
    const cMat = new THREE.MeshStandardMaterial({
      color: 0x1a2d4a,
      metalness: 0.6,
      roughness: 0.4,
    });
    const cGeo = new THREE.CylinderGeometry(0.1, 0.13, 1.9, 10);
    cPos.forEach(([cx, cz]) => {
      [1.05, 3.6].forEach((cy) => {
        const c = new THREE.Mesh(cGeo, cMat.clone());
        c.position.set(cx, cy, cz);
        c.castShadow = true;
        pivot.add(c);
      });
    });

    // Springs (helix)
    const spMat1 = [];
    const spMat2 = [];
    cPos.forEach(([cx, cz]) => {
      const s1 = helix(sc, cx, cz, 0.09, 1.95, 0x00d4ff);
      s1.userData.info = () => ({
        t: "🔩 Spring k₁",
        r: [
          { l: "Stiffness k₁", v: (d.k1 / 1000).toFixed(0) + " kN/m" },
          { l: "Between", v: "Ground → Floor 1" },
          { l: "Analogy", v: "RC shear walls+beams" },
        ],
      });
      meshes.push(s1);
      spMat1.push(s1.material);

      const s2 = helix(sc, cx, cz, 2.25, 4.5, 0xff6b35);
      s2.userData.info = () => ({
        t: "🔩 Spring k₂",
        r: [
          { l: "Stiffness k₂", v: (d.k2 / 1000).toFixed(0) + " kN/m" },
          { l: "Between", v: "Floor 1 → Floor 2" },
          { l: "Less stiff", v: "Upper stories thinner" },
        ],
      });
      meshes.push(s2);
      spMat2.push(s2.material);
    });

    // Floor slabs
    const fGeo = new THREE.BoxGeometry(5, 0.3, 3.6);
    const f1Mat = new THREE.MeshStandardMaterial({
      color: 0x0a1e38,
      emissive: 0x003366,
      emissiveIntensity: 0.15,
      metalness: 0.3,
      roughness: 0.5,
    });
    const floor1 = new THREE.Mesh(fGeo, f1Mat);
    floor1.position.y = 2.1;
    floor1.castShadow = true;
    floor1.userData.info = () => ({
      t: "🏢 Floor 1 — Mass m₁",
      r: [
        { l: "Mass m₁", v: (d.m1 / 1000).toFixed(0) + " tonnes" },
        { l: "f₁ (Mode 1)", v: d.f1.toFixed(3) + " Hz" },
        { l: "f₂ (Mode 2)", v: d.f2.toFixed(3) + " Hz" },
        { l: "Slab type", v: "RCC flat slab" },
      ],
    });
    pivot.add(floor1);
    meshes.push(floor1);
    floor1.add(
      new THREE.LineSegments(
        new THREE.EdgesGeometry(fGeo),
        new THREE.LineBasicMaterial({
          color: 0x00d4ff,
          transparent: true,
          opacity: 0.4,
        }),
      ),
    );

    const floor2 = new THREE.Mesh(
      fGeo.clone(),
      new THREE.MeshStandardMaterial({
        color: 0x071628,
        emissive: 0x002244,
        emissiveIntensity: 0.12,
        metalness: 0.3,
        roughness: 0.5,
      }),
    );
    floor2.position.y = 4.65;
    floor2.userData.info = () => ({
      t: "🏢 Floor 2 — Mass m₂",
      r: [
        { l: "Mass m₂", v: (d.m2 / 1000).toFixed(0) + " tonnes" },
        { l: "f₁ natural", v: d.f1.toFixed(3) + " Hz" },
        { l: "f₂ natural", v: d.f2.toFixed(3) + " Hz" },
        {
          l: "Status",
          v: d.danger ? "⚠ Resonance risk!" : d.warn ? "⚡ Caution" : "✓ Safe",
        },
      ],
    });
    pivot.add(floor2);
    meshes.push(floor2);
    floor2.add(
      new THREE.LineSegments(
        new THREE.EdgesGeometry(fGeo),
        new THREE.LineBasicMaterial({
          color: 0x0088cc,
          transparent: true,
          opacity: 0.35,
        }),
      ),
    );

    // Earthquake arrows
    const qkArrows = [];
    for (let i = -2; i <= 2; i++) {
      const arr = new THREE.ArrowHelper(
        new THREE.Vector3(1, 0, 0),
        new THREE.Vector3(i * 0.8, -0.35, 0),
        0.6,
        d.danger ? 0xff0000 : 0xff6633,
        0.2,
        0.13,
      );
      arr.userData.info = () => ({
        t: "⚡ Base Excitation",
        r: [
          { l: "Frequency fₑ", v: d.fe + " Hz" },
          { l: "f₁ natural", v: d.f1.toFixed(3) + " Hz" },
          {
            l: "Separation",
            v: ((Math.abs(d.fe - d.f1) / d.f1) * 100).toFixed(1) + "%",
          },
          { l: "Status", v: d.danger ? "⚠ TOO CLOSE!" : "✓ Safe margin" },
        ],
      });
      pivot.add(arr);
      qkArrows.push(arr);
      meshes.push(arr);
    }

    // Labels
    sprite(
      "f₁=" +
        d.f1.toFixed(3) +
        "Hz  f₂=" +
        d.f2.toFixed(3) +
        "Hz  fₑ=" +
        d.fe +
        "Hz",
      "#00d4ff",
      sc,
    ).position.set(0, 5.95, 0);
    sprite(
      "m₁=" +
        ((d.m1 / 1000) | 0) +
        "t  k₁=" +
        ((d.k1 / 1000) | 0) +
        "kN/m",
      "#00d4ff",
      sc,
    ).position.set(0, 2.85, 0);
    sprite(
      "m₂=" +
        ((d.m2 / 1000) | 0) +
        "t  k₂=" +
        ((d.k2 / 1000) | 0) +
        "kN/m",
      "#4499cc",
      sc,
    ).position.set(0, 5.42, 0);

    SCENES[0] = sc;
    PIVOTS[0] = pivot;
    MESHES[0] = meshes;
    TICKERS[0] = (t, dt) => {
      const a1 = 0.09 * Math.sin(t * d.f1 * Math.PI * 2);
      const a2 = 0.06 * Math.sin(t * d.f2 * Math.PI * 2 + 0.5);
      floor1.position.x = a1;
      floor2.position.x = a1 + a2;
      const amp = Math.abs(a1) + Math.abs(a2);
      spMat1.forEach((m) => {
        m.emissiveIntensity = 0.2 + amp * 2;
      });
      spMat2.forEach((m) => {
        m.emissiveIntensity = 0.2 + Math.abs(a2) * 2.5;
      });
      qkArrows.forEach((a, i) => {
        const s = 0.4 + 0.4 * Math.sin(t * 4 + i * 0.4);
        a.setLength(0.5 + s * 0.35, 0.2, 0.13);
      });
    };
    curTHREEScene = sc;
  }

  /* ════════════════════════════════════════
MODULE 1 · PROFIT (MAX/MIN)
════════════════════════════════════════ */
  function compProfit() {
    const price = +document.getElementById("p-pr").value;
    const fixed = +document.getElementById("p-fc").value;
    const varC = +document.getElementById("p-vc").value;
    const a = +document.getElementById("p-a").value;
    const maxX = +document.getElementById("p-mx").value;
    const margin = price - varC;
    if (margin <= 0) {
      alert("Variable cost >= selling price. No profit possible.");
      return;
    }
    const xOpt = Math.round(margin / (2 * a));
    const xStar = Math.min(xOpt, maxX);
    const P = (x) => -a * x * x + margin * x - fixed;
    const pMax = P(xStar);
    const disc2 = margin * margin - 4 * a * fixed;
    const be1 = disc2 >= 0 ? Math.ceil((margin - Math.sqrt(disc2)) / (2 * a)) : null;
    const be2 = disc2 >= 0 ? Math.floor((margin + Math.sqrt(disc2)) / (2 * a)) : null;

    showResult(
      "r1",
      resRow("Optimal units x*", xStar.toLocaleString(), "#ff6b35") +
        resRow("Max Profit", "₹" + fBig(pMax), "#00ff9d") +
        resRow("Revenue @ x*", "₹" + fBig(price * xStar), "var(--text)") +
        resRow("P″(x*)", "-" + (2 * a).toFixed(3) + " < 0 -> Max OK", "#00ff9d") +
        (be1 ? resRow("Break-even range", be1 + "->" + be2 + " units", "var(--muted)") : "") +
        '<div class="alert ' +
        (pMax > 0 ? "a-ok" : "a-bad") +
        '">' +
        (pMax > 0
          ? "OK Produce " + xStar.toLocaleString() + " units -> ₹" + fBig(pMax) + " profit"
          : "Cannot break even with these parameters") +
        "</div>",
    );

    window._profitData = { price, fixed, varC, a, maxX, xStar, pMax, P, be1, be2, margin };
    // Switch right panel to 2D mode
    document.getElementById("ph").style.display = "none";
    document.getElementById("c3d").style.display = "none";
    document.getElementById("badge3d").style.display = "none";
    document.getElementById("badge2d").style.display = "flex";
    const c2 = document.getElementById("c2d");
    c2.style.display = "block";
    draw2DProfit(window._profitData);
  }

  function draw2DPlaceholder() {
    const c2 = document.getElementById("c2d");
    const wrap = c2.parentElement;
    const W = wrap.clientWidth,
      H = wrap.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    c2.width = W * dpr;
    c2.height = H * dpr;
    const ctx = c2.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "rgba(4,7,15,0.0)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#1e2d4a";
    ctx.font = "bold 14px Share Tech Mono";
    ctx.textAlign = "center";
    ctx.fillText("Enter values and click Compute & Visualize", W / 2, H / 2 - 10);
    ctx.fillStyle = "#4a5a7a";
    ctx.font = "11px Share Tech Mono";
    ctx.fillText("Profit curve will appear here", W / 2, H / 2 + 16);
  }

  function draw2DProfit(d) {
    const c2 = document.getElementById("c2d");
    const wrap = c2.parentElement;
    const W = wrap.clientWidth || 800,
      H = wrap.clientHeight || 500;
    const dpr = window.devicePixelRatio || 1;
    c2.width = W * dpr;
    c2.height = H * dpr;
    const ctx = c2.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    const pad = { t: 50, r: 30, b: 60, l: 72 };
    const pw = W - pad.l - pad.r,
      ph = H - pad.t - pad.b;

    // Compute range
    const { price, fixed, varC, a, maxX, xStar, pMax, P, be1, be2 } = d;
    const N = 300;
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const x = (i / N) * maxX;
      pts.push({ x, y: P(x) });
    }
    const allY = pts.map((p) => p.y);
    const minY = Math.min(...allY),
      maxY = Math.max(...allY);
    const yPad = (maxY - minY) * 0.12 || 100;
    const yMin = minY - yPad,
      yMax = maxY + yPad;

    const toSX = (x) => pad.l + (x / maxX) * pw;
    const toSY = (y) => pad.t + ph - ((y - yMin) / (yMax - yMin)) * ph;

    // ── Background
    ctx.fillStyle = "#04070f";
    ctx.fillRect(0, 0, W, H);

    // ── Grid
    ctx.setLineDash([4, 6]);
    const gridCols = 8,
      gridRows = 6;
    ctx.lineWidth = 1;
    for (let i = 0; i <= gridCols; i++) {
      const x = pad.l + i * (pw / gridCols);
      ctx.strokeStyle = "#111d30";
      ctx.beginPath();
      ctx.moveTo(x, pad.t);
      ctx.lineTo(x, pad.t + ph);
      ctx.stroke();
    }
    for (let i = 0; i <= gridRows; i++) {
      const y = pad.t + i * (ph / gridRows);
      ctx.strokeStyle = "#111d30";
      ctx.beginPath();
      ctx.moveTo(pad.l, y);
      ctx.lineTo(pad.l + pw, y);
      ctx.stroke();
      // Y axis label
      const val = yMax - (i * (yMax - yMin)) / gridRows;
      ctx.fillStyle = "#4a5a7a";
      ctx.font = "10px Share Tech Mono";
      ctx.textAlign = "right";
      ctx.fillText(val >= 1000 ? (val / 1000).toFixed(0) + "K" : val.toFixed(0), pad.l - 8, y + 4);
    }
    ctx.setLineDash([]);

    // ── Zero line
    if (yMin < 0 && yMax > 0) {
      const zy = toSY(0);
      ctx.strokeStyle = "rgba(255,80,80,0.35)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([8, 5]);
      ctx.beginPath();
      ctx.moveTo(pad.l, zy);
      ctx.lineTo(pad.l + pw, zy);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(255,50,50,0.12)";
      ctx.fillRect(pad.l, zy, pw, pad.t + ph - zy);
      ctx.fillStyle = "#ff5050";
      ctx.font = "10px Share Tech Mono";
      ctx.textAlign = "left";
      ctx.fillText("Loss Zone", pad.l + 6, zy + 13);
    }

    // ── Revenue line (dashed)
    ctx.strokeStyle = "rgba(0,212,255,0.25)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    pts.forEach((p, i) => {
      const ry = toSY(Math.max(yMin, Math.min(yMax, price * p.x - fixed)));
      i === 0 ? ctx.moveTo(toSX(p.x), ry) : ctx.lineTo(toSX(p.x), ry);
    });
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(0,212,255,0.5)";
    ctx.font = "10px Share Tech Mono";
    ctx.textAlign = "left";
    ctx.fillText("Revenue line", pad.l + 6, pad.t + 14);

    // ── Profit curve with gradient fill
    // Fill below
    ctx.beginPath();
    pts.forEach((p, i) => {
      const sx = toSX(p.x),
        sy = toSY(Math.max(yMin, p.y));
      i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
    });
    ctx.lineTo(toSX(maxX), toSY(0 > yMin ? 0 : yMin));
    ctx.lineTo(toSX(0), toSY(0 > yMin ? 0 : yMin));
    ctx.closePath();
    const fillGrad = ctx.createLinearGradient(pad.l, pad.t, pad.l, pad.t + ph);
    fillGrad.addColorStop(0, "rgba(0,255,157,0.18)");
    fillGrad.addColorStop(1, "rgba(0,255,157,0.02)");
    ctx.fillStyle = fillGrad;
    ctx.fill();

    // Stroke
    const lineGrad = ctx.createLinearGradient(pad.l, 0, pad.l + pw, 0);
    lineGrad.addColorStop(0, "#ff6b35");
    lineGrad.addColorStop(0.5, "#ffc93c");
    lineGrad.addColorStop(1, "#00ff9d");
    ctx.beginPath();
    pts.forEach((p, i) => {
      const sx = toSX(p.x),
        sy = toSY(p.y);
      i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
    });
    ctx.strokeStyle = lineGrad;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // ── Break-even markers
    [be1, be2].forEach((bx) => {
      if (bx == null || bx < 0 || bx > maxX) return;
      const bsx = toSX(bx),
        bsy = toSY(0);
      ctx.strokeStyle = "rgba(255,80,80,0.6)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(bsx, pad.t);
      ctx.lineTo(bsx, pad.t + ph);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#ff5050";
      ctx.beginPath();
      ctx.arc(bsx, bsy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ff5050";
      ctx.font = "10px Share Tech Mono";
      ctx.textAlign = "center";
      ctx.fillText("BE=" + bx.toLocaleString(), bsx, bsy - 10);
    });

    // ── x* optimal drop lines
    const ox = toSX(xStar),
      oy = toSY(pMax);
    ctx.strokeStyle = "rgba(0,255,157,0.4)";
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(ox, pad.t + ph);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(pad.l, oy);
    ctx.stroke();
    ctx.setLineDash([]);

    // ── Optimal point glow
    const grd = ctx.createRadialGradient(ox, oy, 0, ox, oy, 22);
    grd.addColorStop(0, "rgba(0,255,157,0.5)");
    grd.addColorStop(1, "rgba(0,255,157,0)");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(ox, oy, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#00ff9d";
    ctx.beginPath();
    ctx.arc(ox, oy, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ox, oy, 7, 0, Math.PI * 2);
    ctx.stroke();

    // ── Optimal label box
    const lbx = Math.min(ox + 14, pad.l + pw - 130);
    ctx.fillStyle = "rgba(4,7,15,0.88)";
    ctx.strokeStyle = "#00ff9d";
    ctx.lineWidth = 1;
    const lbTxt = [
      "MAXIMUM PROFIT",
      "₹" + fBig(pMax),
      "x* = " + xStar.toLocaleString() + " units",
    ];
    const lbH = lbTxt.length * 17 + 10;
    (function (c, x, y, w, h, r) {
      c.beginPath();
      c.moveTo(x + r, y);
      c.arcTo(x + w, y, x + w, y + h, r);
      c.arcTo(x + w, y + h, x, y + h, r);
      c.arcTo(x, y + h, x, y, r);
      c.arcTo(x, y, x + w, y, r);
      c.closePath();
    })(ctx, lbx, oy - lbH / 2 - 5, 130, lbH, 5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#00ff9d";
    ctx.font = "bold 10px Share Tech Mono";
    ctx.textAlign = "left";
    ctx.fillText(lbTxt[0], lbx + 8, oy - lbH / 2 + 12);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 13px Share Tech Mono";
    ctx.fillText(lbTxt[1], lbx + 8, oy - lbH / 2 + 27);
    ctx.fillStyle = "#4a5a7a";
    ctx.font = "10px Share Tech Mono";
    ctx.fillText(lbTxt[2], lbx + 8, oy - lbH / 2 + 43);

    // ── P''(x) annotation
    ctx.fillStyle = "rgba(0,255,157,0.7)";
    ctx.font = "11px Share Tech Mono";
    ctx.textAlign = "center";
    ctx.fillText(
      "P'(x*)=0  |  P''(x*)=" + (-2 * a).toFixed(3) + " < 0  =>  Maximum",
      W / 2,
      pad.t - 18,
    );

    // ── Axes
    ctx.strokeStyle = "#1e2d4a";
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(pad.l, pad.t);
    ctx.lineTo(pad.l, pad.t + ph);
    ctx.lineTo(pad.l + pw, pad.t + ph);
    ctx.stroke();

    // X-axis ticks & labels
    ctx.fillStyle = "#4a5a7a";
    ctx.font = "10px Share Tech Mono";
    ctx.textAlign = "center";
    for (let i = 0; i <= gridCols; i++) {
      const x = pad.l + i * (pw / gridCols);
      const val = Math.round((i / gridCols) * maxX);
      ctx.fillText(val >= 1000 ? (val / 1000).toFixed(0) + "K" : val, x, pad.t + ph + 18);
      ctx.strokeStyle = "#1e2d4a";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, pad.t + ph);
      ctx.lineTo(x, pad.t + ph + 5);
      ctx.stroke();
    }

    // Axis titles
    ctx.fillStyle = "#4a5a7a";
    ctx.font = "11px Share Tech Mono";
    ctx.textAlign = "center";
    ctx.fillText("Units Produced  (x)", pad.l + pw / 2, H - 8);
    ctx.save();
    ctx.translate(14, pad.t + ph / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("Profit  (₹)", 0, 0);
    ctx.restore();

    // Title
    ctx.fillStyle = "#ff6b35";
    ctx.font = "bold 13px Orbitron,Share Tech Mono";
    ctx.textAlign = "left";
    ctx.fillText("Profit Curve: P(x) = -ax² + (Price-VC)x - FC", pad.l, pad.t - 2);

    // Store chart data for hover
    c2._chartData = {
      pts,
      toSX,
      toSY,
      maxX,
      yMin,
      yMax,
      pad,
      W,
      H,
      P,
      price,
      fixed,
      varC,
      a,
      xStar,
      pMax,
    };
  }

  // 2D Chart hover
  (function () {
    const c2 = document.getElementById("c2d");
    const tip = document.getElementById("p2d-tip");
    c2.addEventListener("mousemove", function (e) {
      const cd = c2._chartData;
      if (!cd) return;
      const rect = c2.getBoundingClientRect();
      const mx = e.clientX - rect.left,
        my = e.clientY - rect.top;
      const { pts, toSX, toSY, maxX, yMin, yMax, pad, W, H, P, price, fixed, a, xStar, pMax } = cd;
      if (mx < pad.l || mx > W - pad.r || my < pad.t || my > H - pad.b) {
        tip.style.display = "none";
        return;
      }
      const x = ((mx - pad.l) / (W - pad.l - pad.r)) * maxX;
      const profit = P(x);
      const rev = price * x;
      const cost = fixed + cd.varC * x + a * x * x;
      tip.style.display = "block";
      tip.style.left = Math.min(e.clientX + 18, window.innerWidth - 200) + "px";
      tip.style.top = e.clientY - tip.offsetHeight / 2 + "px";
      tip.innerHTML =
        '<div style="color:#ff6b35;font-weight:bold;margin-bottom:6px;font-size:12px;">📈 Profit Curve</div>' +
        '<div style="color:#4a5a7a;padding:2px 0;">Units x: <b style="color:#fff">' +
        Math.round(x).toLocaleString() +
        "</b></div>" +
        '<div style="color:#4a5a7a;padding:2px 0;">P(x): <b style="color:' +
        (profit >= 0 ? "#00ff9d" : "#ff5050") +
        '">&#8377;' +
        fBig(profit) +
        "</b></div>" +
        '<div style="color:#4a5a7a;padding:2px 0;">Revenue: <b style="color:#00d4ff">&#8377;' +
        fBig(rev) +
        "</b></div>" +
        '<div style="color:#4a5a7a;padding:2px 0;">Total Cost: <b style="color:#aaa">&#8377;' +
        fBig(cost) +
        "</b></div>" +
        '<div style="color:#4a5a7a;padding:2px 0;">Zone: <b>' +
        (profit >= 0 ? '<span style="color:#00ff9d">Profit &#x2713;</span>' : '<span style="color:#ff5050">Loss &#x2717;</span>') +
        "</b></div>" +
        '<div style="color:#4a5a7a;padding:2px 0;">x* = ' +
        xStar.toLocaleString() +
        " units</div>";
    });
    c2.addEventListener("mouseleave", () => {
      tip.style.display = "none";
    });
    window.addEventListener("resize", () => {
      if (window._profitData && curTab === 1) draw2DProfit(window._profitData);
    });
  })();

  /* ════════════════════════════════════════
MODULE 2 · PIPE FLOW (BERNOULLI)
════════════════════════════════════════ */
  function compPipe() {
    const d1 = +document.getElementById("f-d1").value / 1000;
    const d2 = +document.getElementById("f-d2").value / 1000;
    const P1kpa = +document.getElementById("f-p1").value;
    const h1 = +document.getElementById("f-h1").value;
    const h2 = +document.getElementById("f-h2").value;
    const v1 = +document.getElementById("f-v1").value;
    const rho = +document.getElementById("f-rh").value;
    const g = 9.81;
    const A1 = (Math.PI * d1 * d1) / 4,
      A2 = (Math.PI * d2 * d2) / 4;
    const v2 = (A1 * v1) / A2;
    const P2kpa =
      P1kpa +
      (0.5 * rho * (v1 * v1 - v2 * v2)) / 1000 +
      (rho * g * (h1 - h2)) / 1000;
    const Q = A1 * v1;
    const Re1 = (rho * v1 * d1) / 0.001;
    const turb = Re1 > 4000;
    const cav = P2kpa < 0;

    showResult(
      "r2",
      resRow("Outlet velocity v₂", v2.toFixed(2) + " m/s", "#00ff9d") +
        resRow(
          "Outlet pressure P₂",
          P2kpa.toFixed(1) + " kPa",
          cav ? "#ff5050" : "#00ff9d",
        ) +
        resRow("Flow rate Q", (Q * 1000).toFixed(2) + " L/s", "#00d4ff") +
        resRow("Reynolds No.", fBig(Re1), "var(--muted)") +
        resRow(
          "Flow regime",
          turb ? "Turbulent" : "Laminar",
          turb ? "#ff6b35" : "#00ff9d",
        ) +
        resRow(
          "Velocity ratio v₂/v₁",
          (v2 / v1).toFixed(2) + "×",
          "var(--muted)",
        ) +
        `<div class="alert ${cav ? "a-bad" : "a-ok"}">${cav ? "⚠ Negative pressure! Cavitation risk!" : "✓ Stable flow — no cavitation"}</div>`,
    );

    build3D_Pipe({
      d1,
      d2,
      v1,
      v2,
      P1kpa,
      P2kpa,
      Q,
      rho,
      Re1,
      turb,
      h1,
      h2,
    });
    hidePH();
    resetView();
    tRotX = 0.22;
    tZoom = 9;
  }

  function build3D_Pipe({
    d1,
    d2,
    v1,
    v2,
    P1kpa,
    P2kpa,
    rho,
    Re1,
    turb,
    h1,
    h2,
  }) {
    const sc = makeScene("#00ff9d");
    const meshes = [];
    const r1 = Math.max(0.18, d1 * 5),
      r2 = Math.max(0.1, d2 * 5);

    function makeTube(x1, x2, r, col, info) {
      const pts = [
        new THREE.Vector3(x1, 0, 0),
        new THREE.Vector3(x2, 0, 0),
      ];
      const curve = new THREE.CatmullRomCurve3(pts);
      const og = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 4, r + 0.04, 20, false),
        new THREE.MeshStandardMaterial({
          color: 0x0d1e30,
          metalness: 0.75,
          roughness: 0.3,
        }),
      );
      og.castShadow = true;
      const ig = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 4, r, 20, false),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color(col),
          transparent: true,
          opacity: 0.28,
          side: THREE.DoubleSide,
        }),
      );
      const grp = new THREE.Group();
      grp.add(og);
      grp.add(ig);
      [og, ig].forEach((m) => {
        m.userData.info = info;
        grp.userData.info = info;
      });
      sc.add(grp);
      meshes.push(og, ig);
      return { grp, ig };
    }

    const pip1 = makeTube(-5, -0.15, r1, "#1144cc", () => ({
      t: "🚰 Inlet — Point 1",
      r: [
        { l: "Diameter d₁", v: (d1 * 1000).toFixed(0) + " mm" },
        { l: "Velocity v₁", v: v1.toFixed(2) + " m/s" },
        { l: "Pressure P₁", v: P1kpa.toFixed(0) + " kPa" },
        { l: "Elevation h₁", v: h1 + " m" },
        {
          l: "Flow area A₁",
          v: (((Math.PI * d1 * d1) / 4) * 1e4).toFixed(2) + " cm²",
        },
      ],
    }));

    // Cone reducer
    const coneG = new THREE.CylinderGeometry(r2, r1, 1.2, 20);
    coneG.rotateZ(Math.PI / 2);
    const cone = new THREE.Mesh(
      coneG,
      new THREE.MeshStandardMaterial({
        color: 0x0d1e30,
        metalness: 0.7,
        roughness: 0.3,
      }),
    );
    cone.position.x = 0.5;
    cone.castShadow = true;
    cone.userData.info = () => ({
      t: "🔄 Concentric Reducer",
      r: [
        {
          l: "d₁→d₂",
          v:
            (d1 * 1000).toFixed(0) + "→" + (d2 * 1000).toFixed(0) + " mm",
        },
        { l: "Continuity A₁v₁=A₂v₂", v: "✓ Verified" },
        { l: "Velocity jump", v: "×" + (v2 / v1).toFixed(2) },
        { l: "Type", v: "IS 1239 pipe fitting" },
      ],
    });
    sc.add(cone);
    meshes.push(cone);

    const pip2 = makeTube(1.15, 6, r2, "#00aa66", () => ({
      t: "💧 Outlet — Point 2",
      r: [
        { l: "Diameter d₂", v: (d2 * 1000).toFixed(0) + " mm" },
        { l: "Velocity v₂", v: v2.toFixed(2) + " m/s (faster!)" },
        { l: "Pressure P₂", v: P2kpa.toFixed(1) + " kPa" },
        { l: "Elevation h₂", v: h2 + " m" },
        { l: "Reynolds No.", v: Re1 > 4000 ? "Turbulent" : "Laminar" },
      ],
    }));

    // Pressure glow
    const pl1 = new THREE.PointLight(new THREE.Color(0.1, 0.3, 1), 2.5, 5);
    pl1.position.set(-3, 0, 0);
    sc.add(pl1);
    const pl2 = new THREE.PointLight(new THREE.Color(0, 0.8, 0.4), 2.5, 4);
    pl2.position.set(4, 0, 0);
    sc.add(pl2);

    // Pressure indicators (vertical bars above pipe)
    const barScale = 0.008;
    const pb1 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, P1kpa * barScale, 8),
      new THREE.MeshStandardMaterial({
        color: 0x2244ff,
        emissive: 0x2244ff,
        emissiveIntensity: 0.6,
      }),
    );
    pb1.position.set(-3, r1 + (P1kpa * barScale) / 2 + 0.1, 0);
    pb1.userData.info = () => ({
      t: "📊 Pressure Indicator",
      r: [
        { l: "P₁", v: P1kpa.toFixed(0) + " kPa" },
        { l: "Type", v: "High pressure inlet" },
      ],
    });
    sc.add(pb1);
    meshes.push(pb1);

    const P2clamped = Math.max(0, P2kpa);
    const pb2 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, P2clamped * barScale + 0.05, 8),
      new THREE.MeshStandardMaterial({
        color: P2kpa < 0 ? 0xff2200 : 0x00cc66,
        emissive: P2kpa < 0 ? 0xff2200 : 0x00cc66,
        emissiveIntensity: 0.6,
      }),
    );
    pb2.position.set(3.5, r2 + (P2clamped * barScale) / 2 + 0.1, 0);
    pb2.userData.info = () => ({
      t: "📊 Pressure Indicator",
      r: [
        { l: "P₂", v: P2kpa.toFixed(1) + " kPa" },
        { l: "Status", v: P2kpa < 0 ? "⚠ Cavitation!" : "✓ OK" },
      ],
    });
    sc.add(pb2);
    meshes.push(pb2);

    // Labels
    sprite(
      "P₁=" + P1kpa + "kPa  v₁=" + v1 + "m/s  d₁=" + d1 * 1000 + "mm",
      "#4488ff",
      sc,
    ).position.set(-3.2, 1.8, 0);
    sprite(
      "P₂=" +
        P2kpa.toFixed(0) +
        "kPa  v₂=" +
        v2.toFixed(1) +
        "m/s  d₂=" +
        d2 * 1000 +
        "mm",
      P2kpa < 0 ? "#ff4444" : "#00ff9d",
      sc,
    ).position.set(3.2, 1.3, 0);

    // Particles
    const N = 700;
    const pp = new Float32Array(N * 3),
      pc = new Float32Array(N * 3);
    const psp = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const inS2 = Math.random() > 0.5;
      const r = inS2 ? r2 : r1;
      const x = inS2 ? 1.2 + Math.random() * 4.8 : -5 + Math.random() * 4.8;
      const ang = Math.random() * Math.PI * 2,
        rad = Math.random() * r * 0.88;
      pp[i * 3] = x;
      pp[i * 3 + 1] = Math.cos(ang) * rad;
      pp[i * 3 + 2] = Math.sin(ang) * rad;
      psp[i] = inS2 ? v2 * 0.5 : v1 * 0.5;
      const t = inS2 ? 1 : 0;
      pc[i * 3] = 0.1;
      pc[i * 3 + 1] = 0.4 + t * 0.6;
      pc[i * 3 + 2] = 1 - t * 0.4;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(pp, 3));
    pGeo.setAttribute("color", new THREE.BufferAttribute(pc, 3));
    const parts = new THREE.Points(
      pGeo,
      new THREE.PointsMaterial({
        size: 0.1,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    sc.add(parts);

    SCENES[2] = sc;
    MESHES[2] = meshes;
    TICKERS[2] = (t, dt) => {
      for (let i = 0; i < N; i++) {
        pp[i * 3] += psp[i] * dt * 2;
        if (pp[i * 3] > 6) {
          pp[i * 3] = -5;
          const ang = Math.random() * Math.PI * 2,
            rad = Math.random() * r1 * 0.88;
          pp[i * 3 + 1] = Math.cos(ang) * rad;
          pp[i * 3 + 2] = Math.sin(ang) * rad;
          psp[i] = v1 * 0.5;
        }
        if (pp[i * 3] > 1.3 && psp[i] < v2 * 0.4) {
          const cy = pp[i * 3 + 1],
            cz = pp[i * 3 + 2],
            cr = Math.sqrt(cy * cy + cz * cz);
          if (cr > r2 * 0.88) {
            const s = (r2 * 0.88) / cr;
            pp[i * 3 + 1] *= s;
            pp[i * 3 + 2] *= s;
          }
          psp[i] = v2 * 0.5;
        }
      }
      pGeo.attributes.position.needsUpdate = true;
      pl1.intensity = 2 + 0.8 * Math.sin(t * 1.5);
      pl2.intensity = 2 + 0.8 * Math.sin(t * 1.5 + 1.2);
    };
  }

  /* ════════════════════════════════════════
MODULE 3 · SLAB LOAD (DOUBLE INTEGRAL)
════════════════════════════════════════ */
  function compSlab() {
    const L = +document.getElementById("s-L").value;
    const W = +document.getElementById("s-W").value;
    const H = +document.getElementById("s-H").value / 1000;
    const rho = +document.getElementById("s-rh").value;
    const q0 = +document.getElementById("s-q0").value;
    const q1 = +document.getElementById("s-q1").value;
    const q2 = +document.getElementById("s-q2").value;
    const g = 9.81;
    const vol = L * W * H,
      mass = vol * rho,
      sw = (mass * g) / 1000;
    const Ft = q0 * L * W + (q1 * W * L) / 2 + (q2 * L * W) / 2;
    const total = sw + Ft;
    const Mx = (q0 * L * L * W) / 2 + (q1 * L * L * W) / 3 + (q2 * L * L * W) / 4;
    const My = (q0 * L * W * W) / 2 + (q1 * L * W * W) / 4 + (q2 * L * W * W) / 3;
    const xBar = Mx / Ft,
      yBar = My / Ft;

    showResult(
      "r3",
      resRow("Volume V", vol.toFixed(3) + " m³", "#ffc93c") +
        resRow("Slab mass", fBig(mass) + " kg", "var(--text)") +
        resRow("Self weight", sw.toFixed(1) + " kN", "var(--muted)") +
        resRow("Live load ∬q dA", Ft.toFixed(2) + " kN", "#ffc93c") +
        resRow("Total foundation load", total.toFixed(1) + " kN", "#ff6b35") +
        resRow("Load per column", (total / 4).toFixed(1) + " kN", "#ff6b35") +
        resRow("Centroid (x̄,ȳ)", "(" + xBar.toFixed(2) + "," + yBar.toFixed(2) + ") m", "var(--muted)") +
        `<div class="alert ${total / L / W > 12 ? "a-warn" : "a-ok"}">${total / L / W > 12 ? "⚡ High intensity — review column section" : "✓ Load within normal RCC limits"}</div>`,
    );

    build3D_Slab({
      L,
      W,
      H,
      rho,
      q0,
      q1,
      q2,
      vol,
      mass,
      sw,
      Ft,
      total,
      xBar,
      yBar,
    });
    hidePH();
    resetView();
    tRotX = 0.55;
    tZoom = 13;
  }

  function build3D_Slab({
    L,
    W,
    H,
    rho,
    q0,
    q1,
    q2,
    vol,
    total,
    xBar,
    yBar,
  }) {
    const sc = makeScene("#ffc93c");
    const meshes = [];
    const sc2 = 0.65;
    const colH = 2.8,
      baseY = colH * sc2 * 0.5 + 0.1;

    // Columns
    const cMat = new THREE.MeshStandardMaterial({
      color: 0x1a2840,
      metalness: 0.6,
      roughness: 0.4,
    });
    [
      [-L / 2, -W / 2],
      [L / 2, -W / 2],
      [-L / 2, W / 2],
      [L / 2, W / 2],
    ].forEach(([cx, cz]) => {
      const col = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.14, colH * sc2, 12),
        cMat.clone(),
      );
      col.position.set(cx * sc2, (colH * sc2) / 2, cz * sc2);
      col.castShadow = true;
      col.userData.info = () => ({
        t: "🏛 RC Column",
        r: [
          { l: "Load per column", v: (total / 4).toFixed(0) + " kN" },
          { l: "Position", v: "Corner support" },
          { l: "Column size", v: "400×400 mm (IS 456)" },
          { l: "Foundation load", v: total.toFixed(0) + " kN total" },
        ],
      });
      sc.add(col);
      meshes.push(col);
    });

    // Slab with load gradient
    const nx = 32,
      nz = 24;
    const verts2 = [],
      vcols2 = [],
      inds2 = [];
    const maxQ = q0 + q1 + q2;
    for (let i = 0; i <= nx; i++) {
      for (let j = 0; j <= nz; j++) {
        const xN = i / nx,
          zN = j / nz;
        const xw = (xN - 0.5) * L * sc2,
          zw = (zN - 0.5) * W * sc2;
        const q = q0 + q1 * xN + q2 * zN;
        const t = (q - q0) / Math.max(maxQ - q0, 0.001);
        verts2.push(xw, 0, zw);
        vcols2.push(0.9 + 0.1 * t, 0.5 * (1 - t) + 0.75 * t, 0.05 * (1 + t));
        if (i < nx && j < nz) {
          const a = i * (nz + 1) + j,
            b = a + 1,
            c = a + (nz + 1),
            d = c + 1;
          inds2.push(a, b, c, b, d, c);
        }
      }
    }
    const off2 = (nx + 1) * (nz + 1);
    for (let i = 0; i <= nx; i++) {
      for (let j = 0; j <= nz; j++) {
        const xw = (i / nx - 0.5) * L * sc2,
          zw = (j / nz - 0.5) * W * sc2;
        verts2.push(xw, -H * sc2, zw);
        vcols2.push(0.07, 0.12, 0.22);
        if (i < nx && j < nz) {
          const a = off2 + i * (nz + 1) + j,
            b = a + 1,
            c = a + (nz + 1),
            d = c + 1;
          inds2.push(a, c, b, b, c, d);
        }
      }
    }

    const sGeo = new THREE.BufferGeometry();
    sGeo.setAttribute("position", new THREE.Float32BufferAttribute(verts2, 3));
    sGeo.setAttribute("color", new THREE.Float32BufferAttribute(vcols2, 3));
    sGeo.setIndex(inds2);
    sGeo.computeVertexNormals();
    const slab = new THREE.Mesh(
      sGeo,
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
        metalness: 0.1,
        roughness: 0.7,
      }),
    );
    slab.position.y = baseY;
    slab.castShadow = true;
    slab.userData.info = (pt) => {
      const xN = pt.x / (L * sc2) + 0.5,
        zN = pt.z / (W * sc2) + 0.5;
      const q = q0 + q1 * Math.max(0, Math.min(1, xN)) + q2 * Math.max(0, Math.min(1, zN));
      return {
        t: "🏗 Slab Load q(x,y)",
        r: [
          { l: "x position", v: (xN * L).toFixed(2) + " m" },
          { l: "y position", v: (zN * W).toFixed(2) + " m" },
          { l: "q(x,y) here", v: q.toFixed(2) + " kN/m²" },
          { l: "∬ q dA total", v: total.toFixed(0) + " kN" },
          { l: "Volume", v: vol.toFixed(3) + " m³" },
        ],
      };
    };
    sc.add(slab);
    meshes.push(slab);
    sc.add(
      new THREE.LineSegments(
        new THREE.EdgesGeometry(sGeo),
        new THREE.LineBasicMaterial({
          color: 0xffc93c,
          transparent: true,
          opacity: 0.3,
        }),
      ),
    ).position.y = baseY;

    // Load arrows
    const arrs = [];
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 5; j++) {
        const xN = (i + 0.5) / 7,
          zN = (j + 0.5) / 5;
        const xw = (xN - 0.5) * L * sc2,
          zw = (zN - 0.5) * W * sc2;
        const q = q0 + q1 * xN + q2 * zN;
        const t = (q - q0) / Math.max(maxQ - q0, 0.001);
        const col = new THREE.Color(0.8 + 0.2 * t, 0.9 - t * 0.4, 0.05);
        const len = 0.2 + t * 0.35;
        const arr = new THREE.ArrowHelper(
          new THREE.Vector3(0, -1, 0),
          new THREE.Vector3(xw, baseY + 0.5 + t * 0.25, zw),
          len,
          col.getHex(),
          len * 0.35,
          len * 0.22,
        );
        arr.userData.info = () => ({
          t: "↓ Load q(x,y)",
          r: [
            {
              l: "At (" + (xN * L).toFixed(1) + "," + (zN * W).toFixed(1) + ")",
              v: "",
            },
            { l: "q(x,y)", v: q.toFixed(2) + " kN/m²" },
            { l: "Relative intensity", v: (t * 100).toFixed(0) + "% of max" },
            { l: "IS 875 type", v: "Distributed live load" },
          ],
        });
        sc.add(arr);
        arrs.push({ arr, len, t });
        meshes.push(arr);
      }
    }

    // Centroid
    const centroid = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 12, 12),
      new THREE.MeshStandardMaterial({
        color: 0xffc93c,
        emissive: 0xffc93c,
        emissiveIntensity: 1.4,
      }),
    );
    centroid.position.set((xBar / L - 0.5) * L * sc2, baseY + 0.9, (yBar / W - 0.5) * W * sc2);
    centroid.userData.info = () => ({
      t: "⊕ Resultant Load Centroid",
      r: [
        { l: "x̄ = ∬x·q dA / ∬q dA", v: xBar.toFixed(2) + " m" },
        { l: "ȳ = ∬y·q dA / ∬q dA", v: yBar.toFixed(2) + " m" },
        {
          l: "Foundation eccentricity",
          v: "ex=" + Math.abs(xBar - L / 2).toFixed(2) + " m",
        },
        { l: "Total load", v: total.toFixed(0) + " kN" },
      ],
    });
    sc.add(centroid);
    meshes.push(centroid);

    sprite(
      "L=" +
        L +
        "m × W=" +
        W +
        "m × H=" +
        H * 1000 +
        "mm  ∬q=" +
        total.toFixed(0) +
        "kN",
      "#ffc93c",
      sc,
    ).position.set(0, baseY + 1.7, 0);
    sc.getObjectByName = () => {}; // suppress warning
    sc.add(new THREE.AmbientLight(0x0a1428, 0)); // dummy to reuse makeScene result

    SCENES[3] = sc;
    MESHES[3] = meshes;
    TICKERS[3] = (t) => {
      arrs.forEach(({ arr, len, t: ti }, i) => {
        const p = 1 + 0.08 * Math.sin(t * 1.8 + i * 0.25);
        arr.setLength(len * p, len * 0.35 * p, len * 0.25 * p);
      });
      centroid.material.emissiveIntensity = 1 + 0.7 * Math.sin(t * 3);
      centroid.scale.setScalar(1 + 0.1 * Math.sin(t * 3));
    };
  }

  /* ════════════════════════════════════════
MODULE 4 · VORTEX (STOKES)
════════════════════════════════════════ */
  function toggleStType() {
    const t = document.getElementById("st-type").value;
    document.getElementById("st-fluid").style.display =
      t === "magnetic" ? "none" : "block";
    document.getElementById("st-mag").style.display =
      t === "magnetic" ? "block" : "none";
  }

  function compVortex() {
    const type = document.getElementById("st-type").value;
    let html = "";

    if (type === "magnetic") {
      const B = +document.getElementById("st-B").value;
      const R = +document.getElementById("st-Br").value;
      const N = +document.getElementById("st-N").value;
      const A = Math.PI * R * R;
      const flux = B * A;
      const total = N * flux;
      const emf = total / 0.01; // 10ms
      html =
        resRow("Loop area A=πR²", A.toFixed(4) + " m²", "#c084fc") +
        resRow("Flux/turn Φ=B·A", (flux * 1000).toFixed(3) + " mWb", "#c084fc") +
        resRow("Total flux NΦ", (total * 1000).toFixed(2) + " mWb", "var(--text)") +
        resRow("Induced EMF (10ms)", emf.toFixed(1) + " V", "#ffc93c") +
        resRow("Stokes ∬(∇×B)·dS", (total * 1000).toFixed(2) + " mWb = ∮A·dl ✓", "var(--muted)") +
        `<div class="alert a-ok">✓ Stokes verified: ∮C A·dl = ∬S B·dA = ${(total * 1000).toFixed(2)} mWb</div>`;
      build3D_Vortex({ type, B, R, N, flux, total });
    } else {
      const G = +document.getElementById("st-G").value;
      const R = +document.getElementById("st-R").value;
      const rho = +document.getElementById("st-rh").value;
      const vAtR = G / (2 * Math.PI * R);
      const omega_core = G / (Math.PI * R * R);
      const dp = (0.5 * rho * vAtR * vAtR) / 1000;
      const isWind = type === "wind";
      const cyclone = isWind && vAtR > 17.2;
      html =
        resRow("Circulation Γ=∮v·dl", G + " m²/s", "#c084fc") +
        resRow("v_θ at radius R", vAtR.toFixed(3) + " m/s", "#c084fc") +
        resRow("Core vorticity ω=Γ/πR²", omega_core.toFixed(4) + " rad/s", "var(--text)") +
        resRow("Outer zone", "Irrotational (ω=0)", "var(--muted)") +
        resRow("Pressure drop Δp", dp.toFixed(3) + " kPa", "var(--muted)") +
        resRow("∬ω·dA = Γ", G + " m²/s ✓", "#00ff9d") +
        `<div class="alert ${cyclone ? "a-bad" : "a-ok"}">${cyclone ? "⚠ Cyclone-strength — structural risk!" : "✓ Stokes: ∮v·dl = ∬ω·dA = " + G + " m²/s"}</div>`;
      build3D_Vortex({ type, G, R, rho, vAtR, omega_core });
    }
    showResult("r4", html);
    hidePH();
    resetView();
    tRotX = 0.3;
    tZoom = 11;
  }

  function build3D_Vortex(d) {
    const sc = makeScene("#c084fc");
    const meshes = [];

    if (d.type === "magnetic") {
      const R = Math.min(
        d.R * 180,
        0.85 *
          (Math.min(
            document.getElementById("carea").clientWidth,
            document.getElementById("carea").clientHeight,
          ) /
            120),
      );
      // Dot grid (B field into page)
      for (let x = -R + 0.3; x < R; x += 0.45) {
        for (let y = -R + 0.3; y < R; y += 0.45) {
          if (x * x + y * y < R * R) {
            const dot = new THREE.Mesh(
              new THREE.SphereGeometry(0.05, 6, 6),
              new THREE.MeshStandardMaterial({
                color: 0xc084fc,
                emissive: 0xc084fc,
                emissiveIntensity: 0.7,
              }),
            );
            dot.position.set(x, 0, y);
            sc.add(dot);
          }
        }
      }
      // Loop ring
      const lPts = [];
      for (let i = 0; i <= 128; i++) {
        const a = (i / 128) * Math.PI * 2;
        lPts.push(new THREE.Vector3(R * Math.cos(a), 0, R * Math.sin(a)));
      }
      const loop = new THREE.Mesh(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(lPts, true),
          128,
          0.07,
          8,
          true,
        ),
        new THREE.MeshStandardMaterial({
          color: 0xc084fc,
          emissive: 0xc084fc,
          emissiveIntensity: 0.6,
        }),
      );
      loop.userData.info = () => ({
        t: "∮ Magnetic Loop",
        r: [
          { l: "Radius R", v: d.R + " m" },
          { l: "B field", v: d.B + " T" },
          { l: "Flux Φ=B·πR²", v: (d.flux * 1000).toFixed(3) + " mWb" },
          { l: "N turns × Φ", v: (d.total * 1000).toFixed(2) + " mWb" },
          { l: "Stokes: ∮A·dl=∬B·dS", v: "Verified ✓" },
        ],
      });
      sc.add(loop);
      meshes.push(loop);
      const arrLoop = new THREE.ArrowHelper(
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(R, 0, 0),
        0.8,
        0xc084fc,
        0.3,
        0.2,
      );
      arrLoop.userData.info = () => ({
        t: "→ Current Direction",
        r: [
          { l: "B field direction", v: "Into page (×)" },
          { l: "Stokes surface integral", v: "∬(∇×B)·dS" },
          { l: "= Line integral", v: "∮ A·dl" },
        ],
      });
      sc.add(arrLoop);
      meshes.push(arrLoop);
      sprite(
        "B=" +
          d.B +
          "T  N=" +
          d.N +
          "  NΦ=" +
          (d.total * 1000).toFixed(2) +
          "mWb",
        "#c084fc",
        sc,
      ).position.set(0, R + 0.8, 0);

      SCENES[4] = sc;
      MESHES[4] = meshes;
      TICKERS[4] = (t) => {
        const a = -Math.PI / 4 + t * 0.6;
        arrLoop.position.set(R * Math.cos(a), 0, R * Math.sin(a));
        arrLoop.setDirection(new THREE.Vector3(-Math.sin(a), 0, Math.cos(a)));
      };
    } else {
      // Fluid/wind vortex
      const R = Math.max(0.8, Math.min(d.R * 0.9, 4));
      const core = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.07, 6, 10),
        new THREE.MeshStandardMaterial({
          color: 0xc084fc,
          emissive: 0xc084fc,
          emissiveIntensity: 2.2,
          transparent: true,
          opacity: 0.85,
        }),
      );
      sc.add(core);
      const cL = new THREE.PointLight(0xc084fc, 5, 9);
      sc.add(cL);

      // Loop
      const lPts = [];
      for (let i = 0; i <= 128; i++) {
        const a = (i / 128) * Math.PI * 2;
        lPts.push(new THREE.Vector3(R * Math.cos(a), 0, R * Math.sin(a)));
      }
      const loop = new THREE.Mesh(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(lPts, true),
          128,
          0.07,
          8,
          true,
        ),
        new THREE.MeshStandardMaterial({
          color: 0xc084fc,
          emissive: 0xc084fc,
          emissiveIntensity: 0.6,
        }),
      );
      loop.userData.info = () => ({
        t: "∮ Circulation Loop",
        r: [
          { l: "Radius R", v: d.R + " m" },
          { l: "Γ = ∮ v·dl", v: d.G + " m²/s" },
          { l: "v_θ at R", v: d.vAtR.toFixed(3) + " m/s" },
          { l: "= ∬ ω·dA", v: d.G + " m²/s ✓" },
          {
            l: "Real example",
            v: d.type === "wind" ? "Tropical cyclone core" : "Turbine runner",
          },
        ],
      });
      sc.add(loop);
      meshes.push(loop);

      // Velocity field
      const fArrows = [];
      for (let i = -4; i <= 4; i++) {
        for (let j = -4; j <= 4; j++) {
          const x = i * 1.25,
            z = j * 1.25,
            r = Math.sqrt(x * x + z * z);
          if (r < 0.25 || r > 5.2) continue;
          const vt =
            r < d.R
              ? (d.G / (2 * Math.PI * d.R * d.R)) * r
              : d.G / (2 * Math.PI * r);
          const ang = Math.atan2(z, x) + Math.PI / 2;
          const len = Math.min(vt * 0.5, 0.8);
          const t = Math.min(r / d.R, 1);
          const col = new THREE.Color(0.5 + 0.4 * (1 - t), 0.1, 0.8 + 0.2 * t);
          const arr = new THREE.ArrowHelper(
            new THREE.Vector3(Math.cos(ang), 0, Math.sin(ang)),
            new THREE.Vector3(x, 0, z),
            len,
            col.getHex(),
            len * 0.35,
            len * 0.22,
          );
          const rFin = r;
          arr.userData.info = () => {
            const vr =
              rFin < d.R
                ? (d.G / (2 * Math.PI * d.R * d.R)) * rFin
                : d.G / (2 * Math.PI * rFin);
            return {
              t: "↗ Velocity v_θ(r)",
              r: [
                { l: "r from center", v: rFin.toFixed(2) + " m" },
                { l: "v_θ(r)", v: vr.toFixed(3) + " m/s" },
                {
                  l: "Zone",
                  v:
                    rFin < d.R
                      ? "🔴 Core: solid body"
                      : "🔵 Outer: free vortex",
                },
                {
                  l: "Vorticity ω",
                  v:
                    rFin < d.R
                      ? d.omega_core.toFixed(4) + " rad/s"
                      : "≈0 (irrotational)",
                },
              ],
            };
          };
          sc.add(arr);
          fArrows.push(arr);
          meshes.push(arr);
        }
      }

      // Moving arrow
      const mobArr = new THREE.ArrowHelper(
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(R, 0, 0),
        0.7,
        0xc084fc,
        0.28,
        0.18,
      );
      mobArr.userData.info = () => ({
        t: "→ Tangential velocity",
        r: [
          { l: "v_θ at R", v: d.vAtR.toFixed(3) + " m/s" },
          { l: "Γ = ∮v·dl", v: d.G + " m²/s" },
          {
            l: "Type",
            v: d.type === "wind" ? "Wind circulation" : "Fluid vortex",
          },
        ],
      });
      sc.add(mobArr);
      meshes.push(mobArr);

      sprite(
        "Γ=" +
          d.G +
          "m²/s  R=" +
          d.R +
          "m  v_θ=" +
          d.vAtR.toFixed(3) +
          "m/s",
        "#c084fc",
        sc,
      ).position.set(0, 3.4, 0);

      // Particles
      const N2 = 900;
      const pp2 = new Float32Array(N2 * 3);
      const pph = new Float32Array(N2),
        prr = new Float32Array(N2),
        pyy = new Float32Array(N2);
      for (let i = 0; i < N2; i++) {
        const r2 = 0.1 + Math.random() * d.R * 1.7,
          ph = Math.random() * Math.PI * 2,
          hy = (Math.random() - 0.5) * 4;
        pph[i] = ph;
        prr[i] = r2;
        pyy[i] = hy;
        pp2[i * 3] = r2 * Math.cos(ph);
        pp2[i * 3 + 1] = hy;
        pp2[i * 3 + 2] = r2 * Math.sin(ph);
      }
      const ppGeo = new THREE.BufferGeometry();
      ppGeo.setAttribute("position", new THREE.BufferAttribute(pp2, 3));
      const pc2 = new Float32Array(N2 * 3);
      for (let i = 0; i < N2; i++) {
        const t = Math.min(prr[i] / d.R, 1);
        pc2[i * 3] = 0.4 + 0.4 * (1 - t);
        pc2[i * 3 + 1] = 0.1;
        pc2[i * 3 + 2] = 0.7 + 0.3 * t;
      }
      ppGeo.setAttribute("color", new THREE.BufferAttribute(pc2, 3));
      const vparts = new THREE.Points(
        ppGeo,
        new THREE.PointsMaterial({
          size: 0.09,
          vertexColors: true,
          transparent: true,
          opacity: 0.8,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      sc.add(vparts);

      SCENES[4] = sc;
      MESHES[4] = meshes;
      TICKERS[4] = (t, dt) => {
        for (let i = 0; i < N2; i++) {
          const r2 = prr[i];
          const om =
            r2 < d.R
              ? d.G / (2 * Math.PI * d.R * d.R)
              : d.G / (2 * Math.PI * r2 * r2);
          pph[i] += om * dt * 4;
          pp2[i * 3] = r2 * Math.cos(pph[i]);
          pp2[i * 3 + 2] = r2 * Math.sin(pph[i]);
        }
        ppGeo.attributes.position.needsUpdate = true;
        const la = t * 1.8;
        mobArr.position.set(R * Math.cos(la), 0, R * Math.sin(la));
        mobArr.setDirection(new THREE.Vector3(-Math.sin(la), 0, Math.cos(la)));
        core.material.emissiveIntensity = 1.8 + 1.2 * Math.sin(t * 3.5);
        cL.intensity = 4 + 2.5 * Math.sin(t * 3.5);
      };
    }
  }

  /* init */
  window.addEventListener("load", () => {
    refit();
    showPH();
  });
}
