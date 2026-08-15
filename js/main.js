/* ztow Blog — main scripts */
(function () {
  "use strict";

  var root = document.documentElement;

  /* ---------- Theme toggle ---------- */
  var themeToggle = document.getElementById("themeToggle");
  var themeColorMeta = document.querySelector('meta[name="theme-color"]');

  function applyTheme(theme, persist) {
    root.setAttribute("data-theme", theme);
    if (persist !== false) {
      try { localStorage.setItem("theme", theme); } catch (e) {}
      try {
        document.cookie = "ztow_theme=" + theme + "; path=/; max-age=31536000; SameSite=Lax";
      } catch (e) {}
    }
    if (themeColorMeta) {
      themeColorMeta.setAttribute("content", theme === "dark" ? "#0f0e13" : "#faf8f5");
    }
  }

  // Keep the browser UI color in sync with the current theme on load
  if (themeColorMeta && root.getAttribute("data-theme")) {
    themeColorMeta.setAttribute("content", root.getAttribute("data-theme") === "dark" ? "#0f0e13" : "#faf8f5");
  }

  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      applyTheme(next, true);
    });
  }

  /* ---------- Header shadow on scroll ---------- */
  var header = document.getElementById("siteHeader");
  function onScrollHeader() {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 8);
  }
  window.addEventListener("scroll", onScrollHeader, { passive: true });
  onScrollHeader();

  /* ---------- Reading progress bar ---------- */
  var progressBar = document.getElementById("progressBar");
  function updateProgress() {
    if (!progressBar) return;
    var doc = document.documentElement;
    var total = doc.scrollHeight - window.innerHeight;
    var ratio = total > 0 ? window.scrollY / total : 0;
    progressBar.style.width = (ratio * 100).toFixed(2) + "%";
  }
  window.addEventListener("scroll", updateProgress, { passive: true });
  window.addEventListener("resize", updateProgress, { passive: true });
  updateProgress();

  /* ---------- Active nav link ---------- */
  var path = window.location.pathname.replace(/\/+$/, "") || "/";
  var navKey = null;
  if (path === "/") navKey = "home";
  else if (path.indexOf("/archive") === 0) navKey = "archive";
  else if (path.indexOf("/about") === 0) navKey = "about";
  if (navKey) {
    var activeNav = document.querySelector('[data-nav="' + navKey + '"]');
    if (activeNav) activeNav.classList.add("is-active");
  }

  /* ---------- Reading time ---------- */
  var readingTime = document.getElementById("readingTime");
  var postContent = document.getElementById("postContent");
  if (readingTime && postContent) {
    var text = postContent.textContent || "";
    var cjkCount = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    var otherCount = (text.match(/[A-Za-z0-9]+/g) || []).length;
    var minutes = Math.max(1, Math.round(cjkCount / 400 + otherCount / 200));
    readingTime.textContent = "阅读约 " + minutes + " 分钟";
  }

  /* ---------- Post catalog (TOC) ---------- */
  var catalogList = document.getElementById("catalogList");
  if (catalogList && postContent) {
    var headings = postContent.querySelectorAll("h2, h3");
    if (headings.length > 0) {
      headings.forEach(function (heading, index) {
        if (!heading.id) {
          heading.id = "section-" + index;
        }
        var level = heading.tagName.toLowerCase();
        var link = document.createElement("a");
        link.href = "#" + heading.id;
        link.className = "lvl-" + (level === "h3" ? 3 : 2);
        link.textContent = heading.textContent;
        link.addEventListener("click", function () {
          heading.scrollIntoView({ behavior: "smooth", block: "start" });
          history.replaceState(null, "", "#" + heading.id);
        });
        catalogList.appendChild(link);
      });

      var catalogLinks = Array.prototype.slice.call(catalogList.querySelectorAll("a"));
      function onCatalogScroll() {
        var currentId = "";
        headings.forEach(function (heading) {
          if (heading.getBoundingClientRect().top <= 90) {
            currentId = heading.id;
          }
        });
        catalogLinks.forEach(function (link) {
          link.classList.toggle("is-active", link.getAttribute("href") === "#" + currentId);
        });
      }
      window.addEventListener("scroll", onCatalogScroll, { passive: true });
      onCatalogScroll();
    } else {
      var catalog = catalogList.closest(".catalog");
      if (catalog) catalog.style.display = "none";
    }
  }

  /* ---------- Archive filter (category + tag) ---------- */
  var catCloud = document.getElementById("catCloud");
  var tagCloud = document.getElementById("tagCloud");
  var archiveList = document.getElementById("archiveList");
  if (archiveList && (catCloud || tagCloud)) {
    var catButtons = catCloud ? Array.prototype.slice.call(catCloud.querySelectorAll(".tag-btn")) : [];
    var tagButtons = tagCloud ? Array.prototype.slice.call(tagCloud.querySelectorAll(".tag-btn")) : [];
    var archiveItems = Array.prototype.slice.call(archiveList.querySelectorAll(".archive-item"));
    var archiveYears = Array.prototype.slice.call(archiveList.querySelectorAll(".archive-year"));
    var activeCat = "";
    var activeTag = "";

    function applyFilter() {
      catButtons.forEach(function (btn) {
        btn.classList.toggle("is-active", (btn.getAttribute("data-cat") || "") === activeCat);
      });
      tagButtons.forEach(function (btn) {
        btn.classList.toggle("is-active", (btn.getAttribute("data-tag") || "") === activeTag);
      });

      archiveItems.forEach(function (item) {
        var tags = (item.getAttribute("data-tags") || "").split(",");
        var cat = item.getAttribute("data-category") || "";
        var matchCat = !activeCat || cat === activeCat;
        var matchTag = !activeTag || tags.indexOf(activeTag) !== -1;
        item.classList.toggle("is-hidden", !(matchCat && matchTag));
      });

      archiveYears.forEach(function (year) {
        var hasVisible = year.querySelectorAll(".archive-item:not(.is-hidden)").length > 0;
        year.classList.toggle("is-hidden", !hasVisible);
      });

      var url = new URL(window.location.href);
      function setParam(name, value) {
        if (value) {
          var decoded;
          try { decoded = decodeURIComponent(value); } catch (e) { decoded = value; }
          url.searchParams.set(name, decoded);
        } else {
          url.searchParams.delete(name);
        }
      }
      setParam("cat", activeCat);
      setParam("tag", activeTag);
      history.replaceState(null, "", url.toString());
    }

    function onCloudClick(cloud, paramName, setter) {
      cloud.addEventListener("click", function (event) {
        var btn = event.target.closest(".tag-btn");
        if (!btn) return;
        setter(btn.getAttribute(paramName) || "");
        applyFilter();
      });
    }
    if (catCloud) onCloudClick(catCloud, "data-cat", function (v) { activeCat = v; });
    if (tagCloud) onCloudClick(tagCloud, "data-tag", function (v) { activeTag = v; });

    var urlParams = new URL(window.location.href).searchParams;
    if (urlParams.get("cat")) activeCat = encodeURIComponent(urlParams.get("cat"));
    if (urlParams.get("tag")) activeTag = encodeURIComponent(urlParams.get("tag"));
    if (activeCat || activeTag) applyFilter();
  }

  /* ---------- Back to top ---------- */
  var backTop = document.getElementById("backTop");
  if (backTop) {
    backTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* ---------- Content niceties ---------- */
  if (postContent) {
    // Lazy-load below-the-fold images
    var images = postContent.querySelectorAll("img");
    images.forEach(function (img, index) {
      if (index >= 1) {
        img.loading = "lazy";
      }
    });
  }
})();
