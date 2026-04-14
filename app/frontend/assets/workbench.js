const bodyEl = document.body;
const layoutWikiButtonEl = document.querySelector("#layout-mode-wiki");
const layoutChatButtonEl = document.querySelector("#layout-mode-chat");
const hideChatButtonEl = document.querySelector("#hide-chat-panel");
const hideWikiButtonEl = document.querySelector("#hide-wiki-panel");
const hideWikiPanelChatButtonEl = document.querySelector("#hide-wiki-panel-chat");
const showChatButtonEl = document.querySelector("#show-chat-panel");
const showWikiButtonEl = document.querySelector("#show-wiki-panel");
const knowledgeBaseNameEl = document.querySelector("#knowledge-base-name");
const openSettingsButtonEl = document.querySelector("#open-settings-panel");
const closeSettingsButtonEl = document.querySelector("#close-settings-panel");
const settingsOverlayEl = document.querySelector("#settings-overlay");
const knowledgeBasePathInputEl = document.querySelector("#knowledge-base-path-input");
const knowledgeBaseRecentListEl = document.querySelector("#knowledge-base-recent-list");
const knowledgeBaseFeedbackEl = document.querySelector("#knowledge-base-settings-feedback");
const applyKnowledgeBasePathButtonEl = document.querySelector("#apply-knowledge-base-path");

const STORAGE_KEY = "research-kb-workbench-layout";

const workbenchState = {
  layout: "wiki",
  chatVisible: true,
  wikiVisible: true,
};
let appSettings = null;

function saveWorkbenchState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workbenchState));
  } catch (error) {
    // Ignore localStorage failures.
  }
}

function loadWorkbenchState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }
    const parsed = JSON.parse(raw);
    if (parsed.layout === "chat" || parsed.layout === "wiki") {
      workbenchState.layout = parsed.layout;
    }
    if (typeof parsed.chatVisible === "boolean") {
      workbenchState.chatVisible = parsed.chatVisible;
    }
    if (typeof parsed.wikiVisible === "boolean") {
      workbenchState.wikiVisible = parsed.wikiVisible;
    }
  } catch (error) {
    // Ignore malformed local state.
  }
}

function applyWorkbenchState() {
  bodyEl.classList.toggle("layout-wiki", workbenchState.layout === "wiki");
  bodyEl.classList.toggle("layout-chat", workbenchState.layout === "chat");
  bodyEl.classList.toggle("chat-hidden", !workbenchState.chatVisible);
  bodyEl.classList.toggle("wiki-hidden", !workbenchState.wikiVisible);

  layoutWikiButtonEl?.classList.toggle("active", workbenchState.layout === "wiki");
  layoutChatButtonEl?.classList.toggle("active", workbenchState.layout === "chat");
  layoutWikiButtonEl?.setAttribute("aria-pressed", String(workbenchState.layout === "wiki"));
  layoutChatButtonEl?.setAttribute("aria-pressed", String(workbenchState.layout === "chat"));

  showChatButtonEl?.classList.toggle(
    "hidden",
    !(workbenchState.layout === "wiki" && !workbenchState.chatVisible)
  );
  showWikiButtonEl?.classList.toggle(
    "hidden",
    !(workbenchState.layout === "chat" && !workbenchState.wikiVisible)
  );

  hideChatButtonEl?.classList.toggle("hidden", workbenchState.layout !== "wiki");
  hideWikiButtonEl?.classList.toggle("hidden", workbenchState.layout !== "chat");
  hideWikiPanelChatButtonEl?.classList.toggle("hidden", workbenchState.layout !== "chat");
}

function setLayout(layout) {
  workbenchState.layout = layout === "chat" ? "chat" : "wiki";
  if (workbenchState.layout === "wiki") {
    workbenchState.wikiVisible = true;
  } else {
    workbenchState.chatVisible = true;
  }
  applyWorkbenchState();
  saveWorkbenchState();
}

function hideChat() {
  if (workbenchState.layout !== "wiki") {
    return;
  }
  workbenchState.chatVisible = false;
  applyWorkbenchState();
  saveWorkbenchState();
}

function showChat() {
  workbenchState.chatVisible = true;
  applyWorkbenchState();
  saveWorkbenchState();
}

function hideWiki() {
  if (workbenchState.layout !== "chat") {
    return;
  }
  workbenchState.wikiVisible = false;
  applyWorkbenchState();
  saveWorkbenchState();
}

function showWiki() {
  workbenchState.wikiVisible = true;
  applyWorkbenchState();
  saveWorkbenchState();
}

loadWorkbenchState();
applyWorkbenchState();

layoutWikiButtonEl?.addEventListener("click", () => setLayout("wiki"));
layoutChatButtonEl?.addEventListener("click", () => setLayout("chat"));
hideChatButtonEl?.addEventListener("click", hideChat);
hideWikiButtonEl?.addEventListener("click", hideWiki);
hideWikiPanelChatButtonEl?.addEventListener("click", hideWiki);
showChatButtonEl?.addEventListener("click", showChat);
showWikiButtonEl?.addEventListener("click", showWiki);

function setKnowledgeBaseFeedback(message, isError = false) {
  if (!knowledgeBaseFeedbackEl) {
    return;
  }
  if (!message) {
    knowledgeBaseFeedbackEl.textContent = "";
    knowledgeBaseFeedbackEl.classList.add("hidden");
    knowledgeBaseFeedbackEl.style.color = "";
    return;
  }
  knowledgeBaseFeedbackEl.textContent = message;
  knowledgeBaseFeedbackEl.classList.remove("hidden");
  knowledgeBaseFeedbackEl.style.color = isError ? "#b1532f" : "#185c52";
}

function renderKnowledgeBaseSettings() {
  const knowledgeBase = appSettings?.knowledge_base || null;
  if (knowledgeBaseNameEl) {
    knowledgeBaseNameEl.textContent = knowledgeBase?.name || "Knowledge Base";
    knowledgeBaseNameEl.title = knowledgeBase?.path || knowledgeBase?.name || "Knowledge Base";
  }
  if (knowledgeBasePathInputEl) {
    knowledgeBasePathInputEl.value = knowledgeBase?.path || "";
  }
  if (knowledgeBaseRecentListEl) {
    knowledgeBaseRecentListEl.innerHTML = "";
    const recent = Array.isArray(knowledgeBase?.recent) ? knowledgeBase.recent : [];
    recent.forEach((item) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "settings-chip";
      chip.textContent = item.name || item.path;
      chip.title = item.path || item.name || "";
      chip.addEventListener("click", () => {
        if (knowledgeBasePathInputEl) {
          knowledgeBasePathInputEl.value = item.path || "";
          knowledgeBasePathInputEl.focus();
          knowledgeBasePathInputEl.select();
        }
      });
      knowledgeBaseRecentListEl.appendChild(chip);
    });
  }
}

async function loadAppSettings() {
  const response = await fetch("/api/settings");
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  appSettings = await response.json();
  renderKnowledgeBaseSettings();
}

function openSettingsPanel() {
  settingsOverlayEl?.classList.remove("hidden");
  setKnowledgeBaseFeedback("");
}

function closeSettingsPanel() {
  settingsOverlayEl?.classList.add("hidden");
  setKnowledgeBaseFeedback("");
}

async function applyKnowledgeBasePath() {
  const nextPath = String(knowledgeBasePathInputEl?.value || "").trim();
  if (!nextPath) {
    setKnowledgeBaseFeedback("请输入知识库路径。", true);
    return;
  }
  if (!applyKnowledgeBasePathButtonEl) {
    return;
  }
  applyKnowledgeBasePathButtonEl.disabled = true;
  setKnowledgeBaseFeedback("正在切换知识库...");
  try {
    const response = await fetch("/api/settings/knowledge-base", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ path: nextPath }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.detail || `HTTP ${response.status}`);
    }
    setKnowledgeBaseFeedback("知识库已切换，正在刷新页面...");
    window.setTimeout(() => window.location.reload(), 250);
  } catch (error) {
    setKnowledgeBaseFeedback(`切换失败：${error.message}`, true);
  } finally {
    applyKnowledgeBasePathButtonEl.disabled = false;
  }
}

openSettingsButtonEl?.addEventListener("click", openSettingsPanel);
closeSettingsButtonEl?.addEventListener("click", closeSettingsPanel);
applyKnowledgeBasePathButtonEl?.addEventListener("click", applyKnowledgeBasePath);

knowledgeBasePathInputEl?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    void applyKnowledgeBasePath();
  }
});

settingsOverlayEl?.addEventListener("click", (event) => {
  if (event.target === settingsOverlayEl) {
    closeSettingsPanel();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && settingsOverlayEl && !settingsOverlayEl.classList.contains("hidden")) {
    closeSettingsPanel();
  }
});

void loadAppSettings().catch((error) => {
  console.error("Failed to load app settings:", error);
  if (knowledgeBaseNameEl) {
    knowledgeBaseNameEl.textContent = "Knowledge Base";
  }
});

window.WorkbenchUI = {
  getState: () => ({ ...workbenchState }),
  setLayout,
  showChat,
  hideChat,
  showWiki,
  hideWiki,
  ensureChatVisible: showChat,
  ensureWikiVisible: showWiki,
  getAppSettings: () => appSettings,
};
