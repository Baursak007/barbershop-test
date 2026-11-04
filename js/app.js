(function () {
  "use strict";

  var D = SITE_DATA;
  var C = CONFIG;

  /* ---------- Утилиты ---------- */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function money(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " ₸"; }
  function digits(s) { return String(s).replace(/\D/g, ""); }
  function waLink(text) {
    return "https://wa.me/" + digits(C.whatsapp) + (text ? "?text=" + encodeURIComponent(text) : "");
  }
  function tgLink(text) {
    return "https://t.me/" + encodeURIComponent(C.telegram) + (text ? "?text=" + encodeURIComponent(text) : "");
  }
  function chatLink(text) { return C.bookingChannel === "telegram" ? tgLink(text) : waLink(text); }
  function chatName() { return C.bookingChannel === "telegram" ? "Telegram" : "WhatsApp"; }
  function hasEndpoint() { return typeof C.formEndpoint === "string" && C.formEndpoint.trim() !== ""; }
  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function toMinutes(hhmm) { var p = hhmm.split(":"); return +p[0] * 60 + +p[1]; }
  function setText(sel, text) { var el = $(sel); if (el) el.textContent = text; }
  function setHref(sel, href) { var el = $(sel); if (el) el.setAttribute("href", href); }

  /* ---------- Каталог услуг ---------- */
  var catalog = {};      // id услуги -> { item, cat }
  var order = [];        // id в порядке прайса
  D.services.forEach(function (cat) {
    cat.items.forEach(function (item) {
      catalog[item.id] = { item: item, cat: cat };
      order.push(item.id);
    });
  });
  var selected = {};     // id -> true

  function selectedList() {
    return order.filter(function (id) { return selected[id]; }).map(function (id) { return catalog[id].item; });
  }
  function selectedTotal() {
    return selectedList().reduce(function (sum, it) { return sum + it.price; }, 0);
  }
  function minPrice(cat) {
    return Math.min.apply(null, cat.items.map(function (i) { return i.price; }));
  }

  /* ---------- Простые тексты и ссылки ---------- */
  $$("[data-bind]").forEach(function (el) {
    var key = el.getAttribute("data-bind");
    if (D[key] != null) el.textContent = D[key];
  });
  if (D.seoTitle) document.title = D.seoTitle;
  if (D.seoDescription) {
    var md = $('meta[name="description"]');
    if (md) md.setAttribute("content", D.seoDescription);
  }
  setText("#year", new Date().getFullYear());

  if (C.demo) $("#demo-banner").hidden = false;

  var tel = "tel:" + D.phone;
  setHref("#header-phone", tel); setText("#header-phone", D.phoneDisplay);
  setHref("#hero-phone", tel); setText("#hero-phone", D.phoneDisplay);
  setHref("#contact-phone", tel); setText("#contact-phone", D.phoneDisplay);
  setHref("#mb-call", tel);
  setHref("#done-call", tel);
  setHref("#mb-wa", waLink(""));
  setHref("#contact-wa", waLink(""));
  setHref("#contact-ig", C.instagram);
  setHref("#contact-map", C.map2gis);
  setHref("#reviews-link", C.reviewsUrl);

  setText("#hero-address", D.address + ", " + D.district);
  setText("#hero-hours", D.hoursText);
  setText("#contact-address", D.address + ", " + D.district);
  setText("#contact-hours", D.hoursText);
  setText("#entrance-text", D.entranceHint);
  if (!D.entranceHint) $(".entrance").hidden = true;
  setText("#footer-legal", D.legalName + ", БИН " + D.bin + ". " + D.license + ".");
  setText("#footer-disclaimer", D.disclaimer);

  /* ---------- Статус «Открыто сейчас» (время Астаны) ---------- */
  function renderStatus() {
    var box = $("#status");
    var open = false;
    try {
      var parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: C.timezone, weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false,
      }).formatToParts(new Date());
      var m = {};
      parts.forEach(function (p) { m[p.type] = p.value; });
      var dayIdx = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[m.weekday];
      var now = (+m.hour % 24) * 60 + +m.minute;
      open = D.hours.days.indexOf(dayIdx) !== -1 &&
        now >= toMinutes(D.hours.open) && now < toMinutes(D.hours.close);
    } catch (e) { open = false; }
    box.classList.toggle("is-open", open);
    setText("#status-text", open ? "Сейчас открыто, до " + D.hours.close : "Сейчас закрыто");
  }
  renderStatus();

  /* ---------- Что вас беспокоит ---------- */
  $("#concern-grid").innerHTML = D.concerns.map(function (c) {
    return '<button class="concern" type="button" data-book="visit" data-concern="' + esc(c.id) + '">' +
      '<span class="concern-name">' + esc(c.title) + "</span>" +
      '<span class="concern-hint">' + esc(c.hint) + "</span></button>";
  }).join("");

  /* ---------- Доверие ---------- */
  $("#trust-list").innerHTML = D.trust.map(function (t) {
    return "<li><strong>" + esc(t.title) + "</strong><span>" + esc(t.text) + "</span></li>";
  }).join("");

  /* ---------- Услуги ---------- */
  $("#service-grid").innerHTML = D.services.map(function (cat) {
    return '<article class="service-card">' +
      "<h3>" + esc(cat.title) + "</h3>" +
      "<p>" + esc(cat.text) + "</p>" +
      '<p class="service-from">от ' + money(minPrice(cat)) + "</p>" +
      '<div class="service-actions">' +
      '<button class="btn btn-ghost-dark btn-small" type="button" data-goto-price="' + esc(cat.id) + '">Цены</button>' +
      '<button class="btn btn-primary btn-small" type="button" data-book="visit" data-category="' + esc(cat.id) + '">Записаться</button>' +
      "</div></article>";
  }).join("");

  /* ---------- Первый визит ---------- */
  setText("#visit-title", D.visitTitle);
  $("#steps").innerHTML = D.visitSteps.map(function (s) {
    return "<li><h3>" + esc(s.title) + "</h3><p>" + esc(s.text) + "</p></li>";
  }).join("");

  /* ---------- Врачи (скрыты, если данных нет) ---------- */
  if (D.doctors && D.doctors.length) {
    setText("#doctors-title", D.doctorsTitle);
    $("#doctor-grid").innerHTML = D.doctors.map(function (d) {
      var initials = d.name.split(/\s+/).slice(0, 2).map(function (w) { return w.charAt(0); }).join("").toUpperCase();
      var focus = (d.focus || []).map(function (f) { return "<li>" + esc(f) + "</li>"; }).join("");
      return '<article class="doctor"><div class="doctor-avatar" aria-hidden="true">' + esc(initials) + "</div><div>" +
        "<h3>" + esc(d.name) + "</h3>" +
        '<p class="doctor-role">' + esc(d.role) + "</p>" +
        '<p class="doctor-exp">' + esc(d.experience || "") + "</p>" +
        (focus ? '<ul class="doctor-focus">' + focus + "</ul>" : "") +
        "</div></article>";
    }).join("");
  } else {
    $('[data-section="doctors"]').hidden = true;
    $$('[data-needs="doctors"]').forEach(function (a) { a.hidden = true; });
  }

  /* ---------- Безопасность ---------- */
  setText("#safety-title", D.safetyTitle);
  $("#safety-grid").innerHTML = D.safety.map(function (s) {
    return "<div><h3>" + esc(s.title) + "</h3><p>" + esc(s.text) + "</p></div>";
  }).join("");

  /* ---------- Оплата ---------- */
  if ((D.payments && D.payments.length) || D.installment) {
    setText("#pay-title", D.payTitle);
    $("#pay-list").innerHTML = (D.payments || []).map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("");
    setText("#pay-note", D.installment || "");
    if (!D.installment) $("#pay-note").hidden = true;
  } else {
    $("#pay").hidden = true;
  }

  /* ---------- Цены и калькулятор ---------- */
  var activeCat = "all";

  function renderChips() {
    var chips = [{ id: "all", title: "Все" }].concat(D.services.map(function (c) { return { id: c.id, title: c.title }; }));
    $("#price-chips").innerHTML = chips.map(function (c) {
      return '<button type="button" class="chip" data-cat="' + esc(c.id) + '" aria-pressed="' + (c.id === activeCat) + '">' + esc(c.title) + "</button>";
    }).join("");
  }

  function renderPrices() {
    var cats = D.services.filter(function (c) { return activeCat === "all" || c.id === activeCat; });
    $("#price-list").innerHTML = cats.map(function (cat) {
      var rows = cat.items.map(function (it) {
        var on = !!selected[it.id];
        return '<div class="price-row">' +
          '<div class="price-name">' + esc(it.name) + (it.note ? '<span class="price-note">' + esc(it.note) + "</span>" : "") + "</div>" +
          '<div class="price-value">от ' + money(it.price) + "</div>" +
          '<button type="button" class="add-btn" data-add="' + esc(it.id) + '" aria-pressed="' + on + '">' + (on ? "Убрать из расчёта" : "В расчёт") + "</button>" +
          "</div>";
      }).join("");
      return '<section class="price-group"><h3>' + esc(cat.title) + "</h3>" + rows + "</section>";
    }).join("");
  }

  function renderCalc() {
    var list = selectedList();
    var box = $("#calc");
    if (!list.length) {
      box.innerHTML = "<h3>Предварительный расчёт</h3>" +
        '<p class="calc-empty">Нажмите «В расчёт» у нужных услуг, и здесь появится примерная сумма.</p>';
      return;
    }
    box.innerHTML = "<h3>Предварительный расчёт</h3>" +
      '<ul class="calc-items">' + list.map(function (it) {
        return "<li><span>" + esc(it.name) + "</span><span>от " + money(it.price) + "</span></li>";
      }).join("") + "</ul>" +
      '<p class="calc-total"><span>Ориентир</span><strong>от ' + money(selectedTotal()) + "</strong></p>" +
      '<p class="calc-note">Это не смета. Точный план и стоимость врач составит после осмотра и снимка.</p>' +
      '<div class="calc-actions">' +
      '<button class="btn btn-light" type="button" data-book="visit">Записаться с этим планом</button>' +
      '<button class="btn btn-ghost btn-small" type="button" data-clear>Очистить расчёт</button>' +
      "</div>";
  }

  function toggleItem(id, btn) {
    if (!catalog[id]) return;
    if (selected[id]) delete selected[id]; else selected[id] = true;
    if (btn) {
      var on = !!selected[id];
      btn.setAttribute("aria-pressed", String(on));
      btn.textContent = on ? "Убрать из расчёта" : "В расчёт";
    }
    renderCalc();
  }

  renderChips();
  renderPrices();
  renderCalc();

  $("#price-chips").addEventListener("click", function (e) {
    var b = e.target.closest(".chip");
    if (!b) return;
    activeCat = b.getAttribute("data-cat");
    renderChips();
    renderPrices();
  });
  $("#price-list").addEventListener("click", function (e) {
    var b = e.target.closest("[data-add]");
    if (b) toggleItem(b.getAttribute("data-add"), b);
  });
  $("#calc").addEventListener("click", function (e) {
    if (e.target.closest("[data-clear]")) {
      selected = {};
      renderPrices();
      renderCalc();
    }
  });

  /* ---------- Отзывы ---------- */
  var hasReviews = D.reviews && D.reviews.length;
  if (hasReviews || C.reviewsUrl) {
    setText("#reviews-title", D.reviewsTitle);
    setText("#reviews-text", D.reviewsText);
    $("#review-grid").innerHTML = (D.reviews || []).map(function (r) {
      return '<figure class="review" style="margin:0"><p>' + esc(r.text) + "</p><footer>" + esc(r.author || "") + (r.source ? ", " + esc(r.source) : "") + "</footer></figure>";
    }).join("");
    if (!C.reviewsUrl) $("#reviews-link").hidden = true;
  } else {
    $("#reviews").hidden = true;
  }

  /* ---------- Вопросы ---------- */
  setText("#faq-title", D.faqTitle);
  $("#faq-list").innerHTML = D.faq.map(function (f) {
    return "<details><summary>" + esc(f.q) + "</summary><p>" + esc(f.a) + "</p></details>";
  }).join("");

  /* ---------- Скопировать адрес ---------- */
  $("#copy-address").addEventListener("click", function () {
    var note = $("#copy-note");
    var text = D.address + ", " + D.district;
    function done(ok) {
      note.textContent = ok ? "Адрес скопирован" : "Не удалось скопировать, выделите адрес вручную";
      setTimeout(function () { note.textContent = ""; }, 2500);
    }
    try {
      navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
    } catch (e) { done(false); }
  });

  /* ---------- Меню на телефоне ---------- */
  var menuBtn = $(".menu-btn");
  var nav = $("#nav");
  function setMenu(open) {
    nav.classList.toggle("is-open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
  }
  menuBtn.addEventListener("click", function () { setMenu(menuBtn.getAttribute("aria-expanded") !== "true"); });
  nav.addEventListener("click", function (e) { if (e.target.closest("a, button")) setMenu(false); });

  /* ---------- Переход к ценам из карточки услуги ---------- */
  document.addEventListener("click", function (e) {
    var g = e.target.closest("[data-goto-price]");
    if (!g) return;
    activeCat = g.getAttribute("data-goto-price");
    renderChips();
    renderPrices();
    var target = $("#prices");
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  /* ---------- Окно записи ---------- */
  var dialog = $("#booking");
  var form = $("#booking-form");
  var doneBox = $("#booking-done");
  var DEFAULT_CONCERN = "Не знаю, нужен осмотр";

  // варианты «Что вас беспокоит»: жалобы + направления, которых нет в жалобах
  var coveredCats = {};
  D.concerns.forEach(function (c) { coveredCats[c.category] = true; });
  var concernOptions = [DEFAULT_CONCERN]
    .concat(D.concerns.map(function (c) { return c.title; }))
    .concat(D.services.filter(function (s) { return !coveredCats[s.id]; }).map(function (s) { return s.title; }));

  $("#booking-concern").innerHTML = concernOptions.map(function (o) {
    return '<option value="' + esc(o) + '">' + esc(o) + "</option>";
  }).join("");
  $("#booking-doctor").innerHTML = '<option value="Любой врач">Любой врач</option>' + (D.doctors || []).map(function (d) {
    var label = d.name + ", " + d.role;
    return '<option value="' + esc(label) + '">' + esc(label) + "</option>";
  }).join("");
  $("#booking-time").innerHTML = D.timeSlots.map(function (t) { return '<option value="' + esc(t) + '">' + esc(t) + "</option>"; }).join("");
  $("#booking-visit").innerHTML = D.visitTypes.map(function (t) { return '<option value="' + esc(t) + '">' + esc(t) + "</option>"; }).join("");

  function todayISO() {
    var d = new Date();
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }
  function prettyDate(iso) {
    var p = iso.split("-");
    return p.length === 3 ? p[2] + "." + p[1] + "." + p[0] : iso;
  }

  function concernTitleFor(opts) {
    if (opts.concernId) {
      var c = D.concerns.filter(function (x) { return x.id === opts.concernId; })[0];
      if (c) return c.title;
    }
    if (opts.categoryId) {
      var byConcern = D.concerns.filter(function (x) { return x.category === opts.categoryId; })[0];
      if (byConcern) return byConcern.title;
      var cat = D.services.filter(function (s) { return s.id === opts.categoryId; })[0];
      if (cat) return cat.title;
    }
    return DEFAULT_CONCERN;
  }

  function setSubmitLabel(mode) {
    var label;
    if (mode === "callback") label = "Заказать звонок";
    else label = hasEndpoint() ? "Отправить заявку" : "Открыть " + chatName() + " с заявкой";
    setText("#booking-submit", label);
  }

  function renderPlanNote() {
    var box = $("#plan-note");
    var list = selectedList();
    if (!list.length) { box.hidden = true; box.innerHTML = ""; return; }
    box.hidden = false;
    box.innerHTML = "<strong>Услуги из вашего расчёта</strong>" + list.map(function (i) { return esc(i.name); }).join(", ") +
      ". Ориентир: от " + money(selectedTotal()) + ".";
  }

  function clearErrors() {
    $$(".field", form).forEach(function (f) { f.classList.remove("has-error"); });
    $$("[data-error]", form).forEach(function (s) { s.textContent = ""; });
  }
  function showError(name, text) {
    var small = $('[data-error="' + name + '"]', form);
    if (!small) return;
    small.textContent = text;
    var field = small.closest(".field");
    if (field) field.classList.add("has-error");
  }

  function openBooking(mode, opts) {
    opts = opts || {};
    mode = mode === "callback" ? "callback" : "visit";
    dialog.setAttribute("data-mode", mode);
    setText("#booking-title", mode === "callback" ? "Заказать звонок" : "Запись на приём");
    setSubmitLabel(mode);
    clearErrors();
    form.hidden = false;
    doneBox.hidden = true;
    $("#booking-concern").value = concernTitleFor(opts);
    var dateInput = $("#booking-date");
    dateInput.min = todayISO();
    renderPlanNote();
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    var first = $("input[name=name]", form);
    if (first) first.focus();
  }

  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-book]");
    if (t) {
      openBooking(t.getAttribute("data-book"), {
        concernId: t.getAttribute("data-concern"),
        categoryId: t.getAttribute("data-category"),
      });
      return;
    }
    if (e.target.closest("[data-close]")) { dialog.close(); return; }
    if (e.target === dialog) dialog.close();
  });

  function normalizePhone(raw) {
    var d = digits(raw);
    if (d.length === 10) d = "7" + d;
    if (d.length === 11 && d.charAt(0) === "8") d = "7" + d.slice(1);
    return d.length === 11 && d.charAt(0) === "7" ? "+" + d : "";
  }

  function buildText(p) {
    var lines = [p.type === "callback" ? "Здравствуйте! Прошу перезвонить." : "Здравствуйте! Хочу записаться на приём.",
      "Имя: " + p.name, "Телефон: " + p.phone];
    if (p.type === "visit") {
      lines.push("Что беспокоит: " + p.concern);
      lines.push("Врач: " + p.doctor);
      if (p.date) lines.push("День: " + prettyDate(p.date));
      lines.push("Время: " + p.time);
      lines.push("Визит: " + p.visitType);
      if (p.plan.length) {
        lines.push("Услуги из расчёта: " + p.plan.join("; "));
        lines.push("Ориентир: от " + money(p.planTotal));
      }
    }
    return lines.join("\n");
  }

  function showDone(title, text, link) {
    form.hidden = true;
    doneBox.hidden = false;
    setText("#done-title", title);
    setText("#done-text", text);
    var a = $("#done-link");
    if (link) { a.hidden = false; a.setAttribute("href", link); a.textContent = "Открыть " + chatName(); }
    else a.hidden = true;
  }

  function track(goal) {
    try { if (C.metrikaId && window.ym) window.ym(Number(C.metrikaId), "reachGoal", goal); } catch (e) { /* аналитика не должна ломать форму */ }
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    clearErrors();
    var mode = dialog.getAttribute("data-mode");
    var name = form.elements.name.value.trim();
    var phone = normalizePhone(form.elements.phone.value);
    var ok = true;

    if (name.length < 2) { showError("name", "Введите имя."); ok = false; }
    if (!phone) { showError("phone", "Введите номер полностью, например +7 700 123 45 67."); ok = false; }
    if (!form.elements.consent.checked) { showError("consent", "Нужно согласие на обработку персональных данных."); ok = false; }
    if (!ok) {
      var bad = $(".has-error input", form);
      if (bad) bad.focus(); else form.elements.consent.focus();
      return;
    }

    // поле-ловушка для ботов: делаем вид, что всё хорошо, но ничего не отправляем
    if (form.elements.website.value) {
      showDone("Заявка отправлена", "Администратор свяжется с вами.", "");
      return;
    }

    var list = selectedList();
    var payload = {
      type: mode,
      name: name,
      phone: phone,
      concern: form.elements.concern.value,
      doctor: form.elements.doctor.value,
      date: form.elements.date.value,
      time: form.elements.time.value,
      visitType: form.elements.visitType.value,
      plan: list.map(function (i) { return i.name; }),
      planTotal: selectedTotal(),
      consent: true,
      page: location.href,
      createdAt: new Date().toISOString(),
    };
    var text = buildText(payload);
    track("booking_submit");

    if (hasEndpoint()) {
      var ctrl = typeof AbortController === "function" ? new AbortController() : null;
      var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 10000) : null;
      var btn = $("#booking-submit");
      btn.disabled = true;
      fetch(C.formEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: ctrl ? ctrl.signal : undefined,
      }).then(function (res) {
        if (!res.ok) throw new Error("bad status");
        showDone("Заявка отправлена", "Администратор позвонит вам на номер " + phone + " и подтвердит время.", "");
        form.reset();
      }).catch(function () {
        showDone("Не удалось отправить заявку", "Можно отправить её в чате или позвонить в клинику.", chatLink(text));
      }).then(function () {
        if (timer) clearTimeout(timer);
        btn.disabled = false;
      });
      return;
    }

    // без сервера: открываем чат с готовым текстом
    window.open(chatLink(text), "_blank", "noopener");
    showDone("Осталось отправить сообщение",
      "В чате " + chatName() + " нажмите «Отправить», и заявка дойдёт до администратора. Если чат не открылся, нажмите кнопку ниже.",
      chatLink(text));
    form.reset();
  });

  /* ---------- Микроразметка для поисковиков (только не в демо-режиме) ---------- */
  if (!C.demo) {
    var dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    var ld = {
      "@context": "https://schema.org",
      "@type": "Dentist",
      name: D.brandFull,
      url: C.siteUrl,
      telephone: D.phone,
      address: { "@type": "PostalAddress", streetAddress: D.address, addressLocality: "Астана", addressCountry: "KZ" },
      openingHoursSpecification: [{
        "@type": "OpeningHoursSpecification",
        dayOfWeek: D.hours.days.map(function (d) { return dayNames[d]; }),
        opens: D.hours.open,
        closes: D.hours.close,
      }],
    };
    var s = document.createElement("script");
    s.type = "application/ld+json";
    s.textContent = JSON.stringify(ld);
    document.head.appendChild(s);
  }

  /* ---------- Яндекс Метрика (только если указан счётчик) ---------- */
  if (C.metrikaId) {
    (function (m, e, t, r, i, k, a) {
      m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); };
      m[i].l = 1 * new Date();
      for (var j = 0; j < document.scripts.length; j++) { if (document.scripts[j].src === r) { return; } }
      k = e.createElement(t); a = e.getElementsByTagName(t)[0]; k.async = 1; k.src = r; a.parentNode.insertBefore(k, a);
    })(window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
    window.ym(Number(C.metrikaId), "init", { clickmap: true, trackLinks: true, accurateTrackBounce: true });
  }
})();
