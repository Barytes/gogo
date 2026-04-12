const listEl = document.querySelector("#wiki-list");
const searchEl = document.querySelector("#wiki-search");
const titleEl = document.querySelector("#wiki-title");
const categoryEl = document.querySelector("#wiki-category");
const contentEl = document.querySelector("#wiki-content");
const quoteIntoChatEl = document.querySelector("#quote-into-chat");
const openSourceFileEl = document.querySelector("#open-source-file");
const modeWikiEl = document.querySelector("#mode-wiki");
const modeRawEl = document.querySelector("#mode-raw");

let allPages = [];
let activePath = "";
let activePage = null;
let activeMode = "wiki";

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function renderInline(text) {
  let rendered = escapeHtml(text);
  rendered = rendered.replace(/`([^`]+)`/g, "<code>$1</code>");
  rendered = rendered.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return rendered;
}

function markdownToHtml(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let inList = false;
  let inOrderedList = false;
  let inCodeBlock = false;
  let codeBuffer = [];

  const closeLists = () => {
    if (inList) {
      html.push("</ul>");
      inList = false;
    }
    if (inOrderedList) {
      html.push("</ol>");
      inOrderedList = false;
    }
  };

  const closeCode = () => {
    if (!inCodeBlock) {
      return;
    }
    html.push(`<pre><code>${escapeHtml(codeBuffer.join("\n"))}</code></pre>`);
    inCodeBlock = false;
    codeBuffer = [];
  };

  lines.forEach((line) => {
    if (line.trim().startsWith("```")) {
      closeLists();
      if (inCodeBlock) {
        closeCode();
      } else {
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      return;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      closeLists();
      html.push("");
      return;
    }

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      closeLists();
      const level = headingMatch[1].length;
      html.push(`<h${level}>${renderInline(headingMatch[2])}</h${level}>`);
      return;
    }

    if (trimmed.startsWith("> ")) {
      closeLists();
      html.push(`<blockquote>${renderInline(trimmed.slice(2))}</blockquote>`);
      return;
    }

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      if (inOrderedList) {
        html.push("</ol>");
        inOrderedList = false;
      }
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li>${renderInline(trimmed.slice(2))}</li>`);
      return;
    }

    const orderedMatch = trimmed.match(/^\d+\.\s+(.*)$/);
    if (orderedMatch) {
      if (inList) {
        html.push("</ul>");
        inList = false;
      }
      if (!inOrderedList) {
        html.push("<ol>");
        inOrderedList = true;
      }
      html.push(`<li>${renderInline(orderedMatch[1])}</li>`);
      return;
    }

    closeLists();
    html.push(`<p>${renderInline(trimmed)}</p>`);
  });

  closeLists();
  closeCode();
  return html.join("\n");
}

function groupPages(pages) {
  const groups = {};
  pages.forEach((page) => {
    const key = page.section || "root";
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(page);
  });
  return groups;
}

function renderList(pages) {
  listEl.innerHTML = "";

  if (!pages.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "没有匹配到页面。";
    listEl.appendChild(empty);
    return;
  }

  const groups = groupPages(pages);
  Object.keys(groups)
    .sort()
    .forEach((groupName) => {
      const section = document.createElement("section");
      section.className = "wiki-list-section";

      const heading = document.createElement("h3");
      heading.textContent = groupName;
      section.appendChild(heading);

      const ul = document.createElement("ul");
      groups[groupName].forEach((page) => {
        const li = document.createElement("li");
        const button = document.createElement("button");
        button.type = "button";
        button.className = "wiki-list-item";
        if (page.path === activePath) {
          button.classList.add("active");
        }
        button.innerHTML = `<strong>${page.title}</strong><small>${page.summary}</small>`;
        button.addEventListener("click", () => {
          loadPage(page.path);
        });
        li.appendChild(button);
        ul.appendChild(li);
      });
      section.appendChild(ul);
      listEl.appendChild(section);
    });
}

function setMode(mode) {
  activeMode = mode;
  modeWikiEl?.classList.toggle("active", mode === "wiki");
  modeRawEl?.classList.toggle("active", mode === "raw");
}

function currentListEndpoint(query = "") {
  if (activeMode === "raw") {
    return query
      ? `/api/raw/search?q=${encodeURIComponent(query)}`
      : "/api/raw/files";
  }

  return query
    ? `/api/wiki/search?q=${encodeURIComponent(query)}`
    : "/api/wiki/pages";
}

function currentDetailEndpoint(path) {
  return activeMode === "raw"
    ? `/api/raw/file?path=${encodeURIComponent(path)}`
    : `/api/wiki/page?path=${encodeURIComponent(path)}`;
}

async function fetchPages(query = "") {
  const url = currentListEndpoint(query);
  const response = await fetch(url);
  const data = await response.json();
  return data.items || [];
}

async function loadPage(path) {
  activePath = path;
  const response = await fetch(currentDetailEndpoint(path));
  const data = await response.json();
  activePage = data;
  const renderMode = data.render_mode || (activeMode === "wiki" ? "markdown" : "binary");

  categoryEl.textContent = `${activeMode} / ${data.category} / ${data.path}`;
  titleEl.textContent = data.title;
  if (renderMode === "markdown") {
    contentEl.innerHTML = markdownToHtml(data.content || "");
    // 处理内部链接点击
    contentEl.querySelectorAll("a").forEach((a) => {
      const href = a.getAttribute("href") || "";
      if (href.startsWith("/") || href.startsWith("./") || href.startsWith("../") || !href.includes(":")) {
        // 内部链接：拦截点击，使用 WikiWorkbench 导航
        a.addEventListener("click", (e) => {
          e.preventDefault();
          let targetPath = href;
          if (href.startsWith("./")) {
            targetPath = activePath.split("/").slice(0, -1).join("/") + "/" + href.slice(2);
          } else if (href.startsWith("../")) {
            const parts = activePath.split("/");
            const upCount = href.match(/\.\.\//g)?.length || 0;
            targetPath = parts.slice(0, parts.length - upCount).join("/") + "/" + href.replace(/\.\.\//g, "");
          }
          // 规范化路径
          targetPath = targetPath.replace(/\/+/g, "/").replace(/^\//, "");
          // 判断是 wiki 还是 raw
          if (targetPath.endsWith(".md") || targetPath.startsWith("knowledge/")) {
            window.WikiWorkbench?.openPage?.(targetPath, "wiki");
          } else if (targetPath.startsWith("raw/")) {
            window.WikiWorkbench?.openPage?.(targetPath.slice(4), "raw");
          } else {
            window.WikiWorkbench?.openPage?.(targetPath, activeMode);
          }
        });
      }
    });
  } else if (renderMode === "text") {
    contentEl.innerHTML = `<pre><code>${escapeHtml(data.content || "")}</code></pre>`;
  } else if (renderMode === "pdf") {
    contentEl.innerHTML = `
      <div class="pdf-preview-shell">
        <iframe
          class="pdf-preview-frame"
          src="${escapeHtml(data.preview_url || data.download_url || "#")}"
          title="${escapeHtml(data.title || "PDF Preview")}"
        ></iframe>
      </div>
    `;
  } else {
    contentEl.innerHTML = `
      <div class="summary-box">
        <p>这个 raw 材料不是文本内容，当前页面不直接内嵌全文展示。</p>
        <p>文件类型：${escapeHtml(data.content_type || "unknown")}</p>
        <p>文件大小：${data.size} bytes</p>
      </div>
    `;
  }

  if (activeMode === "raw" && data.download_url) {
    openSourceFileEl?.classList.remove("hidden");
    openSourceFileEl.href = data.download_url;
  } else {
    openSourceFileEl?.classList.add("hidden");
    openSourceFileEl.href = "#";
  }

  renderList(allPages);

  const params = new URLSearchParams(window.location.search);
  params.set(activeMode === "raw" ? "raw" : "page", path);
  if (activeMode === "raw") {
    params.delete("page");
  } else {
    params.delete("raw");
  }
  window.history.replaceState({}, "", `/${params.toString() ? `?${params.toString()}` : ""}`);
}

async function bootstrap() {
  try {
    const params = new URLSearchParams(window.location.search);
    const initialRaw = params.get("raw");
    const initialPage = params.get("page");
    setMode(initialRaw ? "raw" : "wiki");

    allPages = await fetchPages();
    renderList(allPages);

    const initialPath = initialRaw || initialPage || (activeMode === "raw" ? allPages[0]?.path : "index.md");
    await loadPage(initialPath);
  } catch (error) {
    categoryEl.textContent = "unavailable";
    titleEl.textContent = "暂时无法读取内容";
    contentEl.innerHTML = '<p class="empty-state">当前页面已经接好数据结构，但接口还没有返回内容。</p>';
  }
}

searchEl.addEventListener("input", async (event) => {
  const query = event.target.value.trim();
  allPages = await fetchPages(query);
  renderList(allPages);
});

modeWikiEl?.addEventListener("click", async () => {
  if (activeMode === "wiki") {
    return;
  }
  setMode("wiki");
  searchEl.value = "";
  allPages = await fetchPages();
  renderList(allPages);
  await loadPage("index.md");
});

modeRawEl?.addEventListener("click", async () => {
  if (activeMode === "raw") {
    return;
  }
  setMode("raw");
  searchEl.value = "";
  allPages = await fetchPages();
  renderList(allPages);
  if (allPages.length) {
    await loadPage(allPages[0].path);
  }
});

if (quoteIntoChatEl) {
  quoteIntoChatEl.addEventListener("click", () => {
    if (!activePage) {
      return;
    }

    window.dispatchEvent(
      new CustomEvent("wiki:quote", {
        detail: {
          path: activePage.path,
          title: activePage.title,
          source: activeMode,
        },
      })
    );

    if (window.ChatWorkbench?.focusInput) {
      window.WorkbenchUI?.ensureChatVisible?.();
      window.ChatWorkbench.focusInput();
    }
  });
}

window.WikiWorkbench = {
  openPage: async (path, source = "wiki") => {
    window.WorkbenchUI?.ensureWikiVisible?.();
    if (source !== activeMode) {
      setMode(source);
      searchEl.value = "";
      allPages = await fetchPages();
    }
    renderList(allPages);
    await loadPage(path);
  },
  showSidebar: () => {
    const sidebarEl = document.querySelector(".wiki-sidebar");
    const openBtn = document.querySelector("#toggle-wiki-sidebar-open");
    const closeBtn = document.querySelector("#toggle-wiki-sidebar-close");
    if (!sidebarEl) return;

    sidebarEl.classList.add("wiki-sidebar-visible");
    if (openBtn) openBtn.classList.add("hidden");
    if (closeBtn) closeBtn.classList.remove("hidden");
  },
  hideSidebar: () => {
    const sidebarEl = document.querySelector(".wiki-sidebar");
    const openBtn = document.querySelector("#toggle-wiki-sidebar-open");
    const closeBtn = document.querySelector("#toggle-wiki-sidebar-close");
    if (!sidebarEl) return;

    sidebarEl.classList.remove("wiki-sidebar-visible");
    if (openBtn) openBtn.classList.remove("hidden");
    if (closeBtn) closeBtn.classList.add("hidden");
  },
};

// Toggle sidebar buttons
const toggleSidebarOpenBtn = document.querySelector("#toggle-wiki-sidebar-open");
toggleSidebarOpenBtn?.addEventListener("click", () => {
  console.log("[wiki] toggle-wiki-sidebar-open clicked");
  const sidebarEl = document.querySelector(".wiki-sidebar");
  if (sidebarEl) {
    sidebarEl.classList.add("wiki-sidebar-visible");
    console.log("[wiki] wiki-sidebar-visible added", sidebarEl.className);
  }
  if (toggleSidebarOpenBtn) toggleSidebarOpenBtn.classList.add("hidden");
  const closeBtn = document.querySelector("#toggle-wiki-sidebar-close");
  if (closeBtn) closeBtn.classList.remove("hidden");
});

const toggleSidebarCloseBtn = document.querySelector("#toggle-wiki-sidebar-close");
toggleSidebarCloseBtn?.addEventListener("click", () => {
  console.log("[wiki] toggle-wiki-sidebar-close clicked");
  const sidebarEl = document.querySelector(".wiki-sidebar");
  if (sidebarEl) {
    sidebarEl.classList.remove("wiki-sidebar-visible");
    console.log("[wiki] wiki-sidebar-visible removed", sidebarEl.className);
  }
  if (toggleSidebarCloseBtn) toggleSidebarCloseBtn.classList.add("hidden");
  const openBtn = document.querySelector("#toggle-wiki-sidebar-open");
  if (openBtn) openBtn.classList.remove("hidden");
});

// Hide wiki panel button (Chat mode)
const hideWikiPanelChatBtn = document.querySelector("#hide-wiki-panel-chat");
hideWikiPanelChatBtn?.addEventListener("click", () => {
  console.log("[wiki] hide-wiki-panel-chat clicked");
  window.WorkbenchUI?.hideWiki?.();
});

bootstrap();
