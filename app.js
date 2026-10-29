// Two screens via hash routing:  #/  (home)  and  #/nv/<id>  (employee detail)
(function () {
  "use strict";

  const app = document.getElementById("app");
  const sheet = document.getElementById("qr-sheet");
  const backdrop = document.getElementById("sheet-backdrop");
  const toastEl = document.getElementById("toast");

  // ---------- Helpers ----------
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const fold = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();

  const icons = {
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
    qr: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM18 18h3v3h-3zM14 20h2M20 14v2"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    search: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
    phone: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2"/></svg>',
    mail: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
    org: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 21V5a1 1 0 011-1h9a1 1 0 011 1v16M15 9h4a1 1 0 011 1v11M3 21h18M8 8h3M8 12h3M8 16h3"/></svg>',
    badge: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M6 16c.5-1.5 1.7-2 3-2s2.5.5 3 2M14 10h4M14 14h3"/></svg>',
  };

  // Point on a circle around (50,50), used to lay out the BIDV marks
  const pt = (r, deg) => {
    const a = (deg * Math.PI) / 180;
    return [(50 + r * Math.cos(a)).toFixed(2), (50 + r * Math.sin(a)).toFixed(2)];
  };

  // Round BIDV emblem: dark green disc, five gold petals, green star in the middle
  const EMBLEM_SVG = (() => {
    const petals = [90, 162, 234, 306, 18].map((a) => {
      const [x, y] = pt(17, a);
      return `<circle cx="${x}" cy="${y}" r="14"/>`;
    });
    const star = Array.from({ length: 10 }, (_, i) => pt(i % 2 ? 9.5 : 22, -90 + i * 36).join(",")).join(" ");
    return (
      '<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="50" fill="#0B4A3C"/>' +
      `<g fill="#F2B33D" stroke="#0B4A3C" stroke-width="2">${petals.join("")}</g><polygon points="${star}" fill="#0B4A3C"/></svg>`
    );
  })();

  // Gold ring of petals next to the "BIDV" wordmark
  const RING_SVG = (() => {
    const dots = [270, 342, 54, 126, 198].map((a) => {
      const [x, y] = pt(30, a);
      return `<circle cx="${x}" cy="${y}" r="16"/>`;
    });
    return `<svg class="ring" viewBox="0 0 100 100" aria-hidden="true"><g fill="#F2B33D">${dots.join("")}</g></svg>`;
  })();

  const logo = () => `<span class="logo">BIDV${RING_SVG}</span>`;

  const avatar = (e, size) => {
    const emblem = `<span class="emblem">${EMBLEM_SVG}</span>`;
    const inner = e.photo
      ? `<img src="${esc(e.photo)}" alt="${esc(e.fullName)}" onerror="this.outerHTML='${emblem.replace(/"/g, "&quot;")}'">`
      : emblem;
    return `<div class="avatar" style="width:${size}px;height:${size}px">${inner}</div>`;
  };

  const vcardEscape = (s) => String(s).replace(/([\\;,])/g, "\\$1");
  // Vietnamese order: family name first, given name last, middle names between
  const nameParts = (fullName) => {
    const p = fullName.trim().split(/\s+/);
    if (p.length === 1) return { family: "", given: p[0], middle: "" };
    return { family: p[0], given: p[p.length - 1], middle: p.slice(1, -1).join(" ") };
  };

  const vCard = (e) => {
    const n = nameParts(e.fullName);
    return [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `N;CHARSET=UTF-8:${vcardEscape(n.family)};${vcardEscape(n.given)};${vcardEscape(n.middle)};;`,
      `FN;CHARSET=UTF-8:${vcardEscape(e.fullName)}`,
      `TITLE;CHARSET=UTF-8:${vcardEscape(e.title)}`,
      `ORG;CHARSET=UTF-8:BIDV;${vcardEscape(e.department)}`,
      `TEL;TYPE=CELL:${e.phone}`,
      `EMAIL:${e.email}`,
      "END:VCARD",
    ].join("\n");
  };

  // Quoted-printable UTF-8: "Trần" -> "Tr=E1=BA=A7n". Keeps the QR payload pure ASCII,
  // so scanner apps cannot mis-guess the charset ("Tráº§n", "Tr?n"); vCard parsers
  // decode it back to Vietnamese.
  const qp = (s) =>
    Array.from(new TextEncoder().encode(s))
      .map((b) => (b >= 0x20 && b < 0x7f && b !== 0x3d ? String.fromCharCode(b) : "=" + b.toString(16).toUpperCase().padStart(2, "0")))
      .join("");

  // vCard 2.1 for the QR code: the version that supports QUOTED-PRINTABLE
  const vCardQr = (e) => {
    const n = nameParts(e.fullName);
    const enc = "CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE";
    return [
      "BEGIN:VCARD",
      "VERSION:2.1",
      `N;${enc}:${qp(n.family)};${qp(n.given)};${qp(n.middle)};;`,
      `FN;${enc}:${qp(e.fullName)}`,
      `TITLE;${enc}:${qp(e.title)}`,
      `ORG;${enc}:BIDV;${qp(e.department)}`,
      `TEL;CELL:${e.phone}`,
      `EMAIL;INTERNET:${e.email}`,
      "END:VCARD",
    ].join("\r\n");
  };

  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toastEl.hidden = true), 2200);
  }

  // ---------- Home screen ----------
  function renderHome() {
    document.title = "BIDV Staff";
    app.innerHTML = `
      <header class="hero">
        ${logo()}
        <h1>Danh bạ nhân viên</h1>
        <p>${EMPLOYEES.length} nhân viên</p>
        <label class="search">
          ${icons.search}
          <input id="q" type="search" placeholder="Tìm theo tên, phòng ban…" autocomplete="off">
        </label>
      </header>
      <div class="section-label">Nhân viên</div>
      <ul class="staff-list" id="list"></ul>`;

    const list = document.getElementById("list");
    const input = document.getElementById("q");

    const draw = () => {
      const q = fold(input.value.trim());
      const rows = EMPLOYEES.filter((e) => !q || fold(`${e.fullName} ${e.department} ${e.title} ${e.id}`).includes(q));
      list.innerHTML = rows.length
        ? rows
            .map(
              (e) => `
            <li><a class="staff-item" href="#/nv/${encodeURIComponent(e.id)}">
              ${avatar(e, 52)}
              <div class="info">
                <div class="job-title">${esc(e.title)}</div>
                <div class="name">${esc(e.fullName)}</div>
                <div class="dept">${esc(e.department)}</div>
              </div>
              <span class="chev">&rsaquo;</span>
            </a></li>`
            )
            .join("")
        : '<li class="empty">Không tìm thấy nhân viên phù hợp</li>';
    };

    input.addEventListener("input", draw);
    draw();
  }

  // ---------- Employee detail screen ----------
  function renderDetail(id) {
    const e = EMPLOYEES.find((x) => x.id === id);
    if (!e) {
      location.replace("#/");
      return;
    }
    document.title = `${e.fullName} · BIDV Staff`;

    app.innerHTML = `
      <header class="topbar">
        <button class="icon-btn" id="back" aria-label="Quay lại">${icons.back}</button>
        <h1>Thông tin cá nhân</h1>
        <button class="icon-btn" id="open-qr" aria-label="Mã QR">${icons.qr}</button>
      </header>
      <section class="profile">
        ${avatar(e, 112)}
        <div class="job-title">${esc(e.title)}</div>
        <div class="name">${esc(e.fullName)}</div>
      </section>
      <div class="card">
        <a class="row" href="tel:${esc(e.phone)}">${icons.phone}
          <div><div class="label">Điện thoại di động</div><div class="value">${esc(e.phone)}</div></div></a>
        <a class="row" href="mailto:${esc(e.email)}">${icons.mail}
          <div><div class="label">Email</div><div class="value">${esc(e.email)}</div></div></a>
        <div class="row">${icons.org}
          <div><div class="label">Đơn vị công tác</div><div class="value">${esc(e.department)}</div></div></div>
        <div class="row">${icons.badge}
          <div><div class="label">Mã cán bộ</div><div class="value">${esc(e.id)}</div></div></div>
      </div>
      <div class="detail-actions">
        <button class="btn-primary" id="open-qr-2">Hiển thị mã QR</button>
      </div>`;

    document.getElementById("back").onclick = () => (history.length > 1 ? history.back() : location.replace("#/"));
    document.getElementById("open-qr").onclick = () => openSheet(e);
    document.getElementById("open-qr-2").onclick = () => openSheet(e);
  }

  // ---------- QR bottom sheet ----------
  function qrSvg(text) {
    const qr = qrcode(0, "M");
    qr.addData(text, "Byte");
    qr.make();
    return qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
  }

  function openSheet(e) {
    sheet.innerHTML = `
      <div class="handle"></div>
      <div class="sheet-header">
        <button class="icon-btn" id="close-sheet" aria-label="Đóng">${icons.close}</button>
        <h2>QR code</h2>
        <span class="lang">VIE <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></span>
      </div>
      <div class="sheet-body">
        ${logo()}
        <div class="qr">${qrSvg(vCardQr(e))}</div>
        <div class="qr-caption">Quét mã QR để lưu thông tin liên hệ</div>
        <div class="sheet-sep"></div>
        <div class="job-title">${esc(e.title)}</div>
        <div class="name">${esc(e.fullName.toUpperCase())}</div>
        <div class="meta">${esc(e.phone)}</div>
        <div class="meta">${esc(e.department)}</div>
        <button class="btn-primary" id="share">Chia sẻ</button>
      </div>`;

    document.getElementById("close-sheet").onclick = closeSheet;
    document.getElementById("share").onclick = () => share(e);

    backdrop.hidden = false;
    sheet.setAttribute("aria-hidden", "false");
    document.body.classList.add("no-scroll");
    requestAnimationFrame(() => sheet.classList.add("open"));
  }

  function closeSheet() {
    sheet.classList.remove("open");
    sheet.setAttribute("aria-hidden", "true");
    backdrop.hidden = true;
    document.body.classList.remove("no-scroll");
  }

  backdrop.onclick = closeSheet;
  document.addEventListener("keydown", (ev) => ev.key === "Escape" && closeSheet());

  async function share(e) {
    const text = `${e.fullName}\n${e.title} - ${e.department}\n${e.phone}\n${e.email}`;
    if (navigator.share) {
      try {
        // Attach the contact as a .vcf file where the browser supports it
        const file = new File([vCard(e)], `${e.id}.vcf`, { type: "text/vcard" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ title: e.fullName, text, files: [file] });
        } else {
          await navigator.share({ title: e.fullName, text });
        }
      } catch (err) {
        if (err.name !== "AbortError") toast("Không chia sẻ được");
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast("Đã sao chép thông tin liên hệ");
    } catch {
      toast("Trình duyệt không hỗ trợ chia sẻ");
    }
  }

  // ---------- Router ----------
  function route() {
    closeSheet();
    const m = location.hash.match(/^#\/nv\/(.+)$/);
    if (m) renderDetail(decodeURIComponent(m[1]));
    else renderHome();
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", route);
  route();

  // ---------- Add to home screen ----------
  const banner = document.getElementById("install-banner");
  const installBtn = document.getElementById("install-btn");
  const hint = document.getElementById("install-hint");
  const DISMISS_KEY = "bidv-staff-install-dismissed";

  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const dismissed = () => {
    try { return localStorage.getItem(DISMISS_KEY) === "1"; } catch { return false; }
  };

  let deferredPrompt = null;

  // Android / desktop Chrome, Edge, Samsung Internet
  window.addEventListener("beforeinstallprompt", (ev) => {
    ev.preventDefault();
    deferredPrompt = ev;
    if (!isStandalone && !dismissed()) banner.hidden = false;
  });

  installBtn.onclick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    banner.hidden = true;
  };

  window.addEventListener("appinstalled", () => {
    banner.hidden = true;
    toast("Đã thêm vào màn hình chính");
  });

  // iOS Safari has no install prompt: show manual instructions instead
  if (isIos && !isStandalone && !dismissed()) {
    hint.innerHTML = 'Nhấn <b>Chia sẻ</b> <span aria-hidden="true">⎋</span> rồi chọn <b>Thêm vào MH chính</b>.';
    installBtn.hidden = true;
    banner.hidden = false;
  }

  document.getElementById("install-close").onclick = () => {
    banner.hidden = true;
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* storage unavailable */ }
  };

  // Service worker: required for install on Android, and lets the app open offline
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }
})();
