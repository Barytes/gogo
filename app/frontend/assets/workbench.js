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

const providerProfileListEl = document.querySelector("#provider-profile-list");
const providerProfileEmptyEl = document.querySelector("#provider-profile-empty");
const providerModeApiButtonEl = document.querySelector("#provider-mode-api");
const providerModeOauthButtonEl = document.querySelector("#provider-mode-oauth");
const providerKeyInputEl = document.querySelector("#provider-key-input");
const providerDisplayNameInputEl = document.querySelector("#provider-display-name-input");
const providerOauthPresetShellEl = document.querySelector("#provider-oauth-preset-shell");
const providerOauthPresetSelectEl = document.querySelector("#provider-oauth-preset-select");
const providerAuthModeShellEl = document.querySelector("#provider-auth-mode-shell");
const providerAuthModeSelectEl = document.querySelector("#provider-auth-mode-select");
const providerAuthModeHelpEl = document.querySelector("#provider-auth-mode-help");
const providerBaseUrlInputEl = document.querySelector("#provider-base-url-input");
const providerApiTypeSelectEl = document.querySelector("#provider-api-type-select");
const providerAuthHeaderInputEl = document.querySelector("#provider-auth-header-input");
const providerApiSecretShellEl = document.querySelector("#provider-api-secret-shell");
const providerApiKeyInputEl = document.querySelector("#provider-api-key-input");
const providerOauthTokenShellEl = document.querySelector("#provider-oauth-token-shell");
const providerAccessTokenInputEl = document.querySelector("#provider-access-token-input");
const providerRefreshTokenInputEl = document.querySelector("#provider-refresh-token-input");
const providerOauthExpiresInputEl = document.querySelector("#provider-oauth-expires-input");
const providerOauthAccountInputEl = document.querySelector("#provider-oauth-account-input");
const providerModelsTextEl = document.querySelector("#provider-models-text");
const saveProviderButtonEl = document.querySelector("#save-provider-button");
const providerDesktopLoginButtonEl = document.querySelector("#provider-desktop-login-button");
const resetProviderButtonEl = document.querySelector("#reset-provider-button");
const providerFeedbackEl = document.querySelector("#provider-settings-feedback");

const STORAGE_KEY = "research-kb-workbench-layout";

const workbenchState = {
  layout: "wiki",
  chatVisible: true,
  wikiVisible: true,
};
let appSettings = null;
let providerFormMode = "api";
let editingProviderKey = "";
let providerAuthMode = "desktop-pi-login";

function saveWorkbenchState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workbenchState));
  } catch (_error) {
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
  } catch (_error) {
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

function setFeedback(element, message, isError = false) {
  if (!element) {
    return;
  }
  if (!message) {
    element.textContent = "";
    element.classList.add("hidden");
    element.style.color = "";
    return;
  }
  element.textContent = message;
  element.classList.remove("hidden");
  element.style.color = isError ? "#b1532f" : "#185c52";
}

function setKnowledgeBaseFeedback(message, isError = false) {
  setFeedback(knowledgeBaseFeedbackEl, message, isError);
}

function setProviderFeedback(message, isError = false) {
  setFeedback(providerFeedbackEl, message, isError);
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
  if (!knowledgeBaseRecentListEl) {
    return;
  }
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

function providerProfiles() {
  return Array.isArray(appSettings?.model_providers?.profiles) ? appSettings.model_providers.profiles : [];
}

function providerApiTypes() {
  return Array.isArray(appSettings?.model_providers?.api_types) ? appSettings.model_providers.api_types : [];
}

function providerOauthPresets() {
  return Array.isArray(appSettings?.model_providers?.oauth_presets)
    ? appSettings.model_providers.oauth_presets
    : [];
}

function providerOauthAuthModes() {
  return Array.isArray(appSettings?.model_providers?.oauth_auth_modes)
    ? appSettings.model_providers.oauth_auth_modes
    : [];
}

function providerCapabilities() {
  return appSettings?.model_providers?.capabilities || {};
}

function formatMsToLocalInput(rawValue) {
  const value = Number(rawValue || 0);
  if (!Number.isFinite(value) || value <= 0) {
    return "";
  }
  const date = new Date(value);
  const pad = (num) => String(num).padStart(2, "0");
  return [
    date.getFullYear(),
    "-",
    pad(date.getMonth() + 1),
    "-",
    pad(date.getDate()),
    "T",
    pad(date.getHours()),
    ":",
    pad(date.getMinutes()),
  ].join("");
}

function parseLocalInputToMs(rawValue) {
  const text = String(rawValue || "").trim();
  if (!text) {
    return null;
  }
  const parsed = new Date(text);
  const time = parsed.getTime();
  return Number.isFinite(time) ? time : null;
}

function renderApiTypeOptions() {
  if (!providerApiTypeSelectEl) {
    return;
  }
  const current = providerApiTypeSelectEl.value;
  providerApiTypeSelectEl.innerHTML = "";
  providerApiTypes().forEach((apiType) => {
    const option = document.createElement("option");
    option.value = apiType;
    option.textContent = apiType;
    providerApiTypeSelectEl.appendChild(option);
  });
  if (current && providerApiTypes().includes(current)) {
    providerApiTypeSelectEl.value = current;
  } else if (!providerApiTypeSelectEl.value && providerApiTypes()[0]) {
    providerApiTypeSelectEl.value = providerApiTypes()[0];
  }
}

function renderOauthPresetOptions() {
  if (!providerOauthPresetSelectEl) {
    return;
  }
  const current = providerOauthPresetSelectEl.value;
  providerOauthPresetSelectEl.innerHTML = "";

  const blank = document.createElement("option");
  blank.value = "";
  blank.textContent = "自定义 / 已存在的 Provider Key";
  providerOauthPresetSelectEl.appendChild(blank);

  providerOauthPresets().forEach((preset) => {
    const option = document.createElement("option");
    option.value = preset.id;
    option.textContent = preset.label || preset.id;
    providerOauthPresetSelectEl.appendChild(option);
  });
  providerOauthPresetSelectEl.value = current || "";
}

function renderOauthAuthModeOptions() {
  if (!providerAuthModeSelectEl) {
    return;
  }
  const current = providerAuthModeSelectEl.value || providerAuthMode;
  providerAuthModeSelectEl.innerHTML = "";
  providerOauthAuthModes().forEach((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.label || item.id;
    providerAuthModeSelectEl.appendChild(option);
  });
  const available = providerOauthAuthModes().map((item) => item.id);
  providerAuthMode = available.includes(current) ? current : available[0] || "desktop-pi-login";
  providerAuthModeSelectEl.value = providerAuthMode;
}

function updateProviderAuthModeHelp() {
  if (!providerAuthModeHelpEl) {
    return;
  }
  const desktopReady = Boolean(providerCapabilities().desktop_cli_login);
  if (providerAuthMode === "manual-tokens") {
    providerAuthModeHelpEl.textContent =
      "当前会把 access / refresh token 直接写入 Pi 的 auth.json，适合作为 Web 版兼容方案，或给自定义 OAuth Provider 临时接入。";
    return;
  }
  providerAuthModeHelpEl.textContent = desktopReady
    ? "桌面版会通过 Pi CLI 的 `/login` 流程完成登录与刷新；gogo-app 只负责展示状态和触发登录。"
    : "当前还是 Web 版，这里先保存“未来由 Pi CLI 登录”的 provider 定义；真正的 `/login` 触发会在桌面版接上。";
}

function applyProviderAuthMode(mode) {
  providerAuthMode = mode === "manual-tokens" ? "manual-tokens" : "desktop-pi-login";
  if (providerAuthModeSelectEl) {
    providerAuthModeSelectEl.value = providerAuthMode;
  }
  const showManualTokens = providerFormMode === "oauth" && providerAuthMode === "manual-tokens";
  providerOauthTokenShellEl?.classList.toggle("hidden", !showManualTokens);
  providerDesktopLoginButtonEl?.classList.toggle(
    "hidden",
    !(providerFormMode === "oauth" && providerAuthMode === "desktop-pi-login")
  );
  updateProviderAuthModeHelp();
}

function applyProviderMode(mode) {
  providerFormMode = mode === "oauth" ? "oauth" : "api";
  providerModeApiButtonEl?.classList.toggle("active", providerFormMode === "api");
  providerModeOauthButtonEl?.classList.toggle("active", providerFormMode === "oauth");
  providerModeApiButtonEl?.setAttribute("aria-pressed", String(providerFormMode === "api"));
  providerModeOauthButtonEl?.setAttribute("aria-pressed", String(providerFormMode === "oauth"));
  providerOauthPresetShellEl?.classList.toggle("hidden", providerFormMode !== "oauth");
  providerAuthModeShellEl?.classList.toggle("hidden", providerFormMode !== "oauth");
  providerApiSecretShellEl?.classList.toggle("hidden", providerFormMode !== "api");
  if (providerAuthHeaderInputEl) {
    providerAuthHeaderInputEl.disabled = providerFormMode !== "api";
  }
  if (saveProviderButtonEl) {
    saveProviderButtonEl.textContent = editingProviderKey ? "更新 Provider" : "保存 Provider";
  }
  applyProviderAuthMode(providerAuthMode);
}

function resetProviderForm(mode = providerFormMode) {
  editingProviderKey = "";
  providerAuthMode = "desktop-pi-login";
  providerKeyInputEl && (providerKeyInputEl.value = "");
  providerDisplayNameInputEl && (providerDisplayNameInputEl.value = "");
  providerOauthPresetSelectEl && (providerOauthPresetSelectEl.value = "");
  providerAuthModeSelectEl && (providerAuthModeSelectEl.value = providerAuthMode);
  providerBaseUrlInputEl && (providerBaseUrlInputEl.value = "");
  providerAuthHeaderInputEl && (providerAuthHeaderInputEl.checked = false);
  providerApiKeyInputEl && (providerApiKeyInputEl.value = "");
  providerAccessTokenInputEl && (providerAccessTokenInputEl.value = "");
  providerRefreshTokenInputEl && (providerRefreshTokenInputEl.value = "");
  providerOauthExpiresInputEl && (providerOauthExpiresInputEl.value = "");
  providerOauthAccountInputEl && (providerOauthAccountInputEl.value = "");
  providerModelsTextEl && (providerModelsTextEl.value = "");
  renderApiTypeOptions();
  renderOauthAuthModeOptions();
  applyProviderMode(mode);
}

function providerSummary(profile) {
  if (profile.config_kind === "oauth") {
    if (profile.auth_mode === "desktop-pi-login") {
      return "这个 OAuth Provider 按桌面版架构配置：Provider 定义由 gogo-app 托管，登录与自动刷新预留给后续桌面版通过 Pi CLI `/login` 处理。";
    }
    if (profile.uses_extension) {
      return "这个 OAuth Provider 目前走“手动导入 token”兼容路径：gogo-app 会生成 extension 注册 provider，token 仍写入 Pi 的 auth.json。";
    }
    return "这个 OAuth Provider 当前使用手动 token 导入，适用于 Pi 已内置或已存在的 provider。";
  }
  return "这个 API Provider 会通过 gogo-app 生成的 extension 注册到 Pi RPC，并使用 Pi 的 auth.json 保存 API key。";
}

function canTriggerDesktopPiLogin(profile) {
  return profile?.config_kind === "oauth" && profile?.auth_mode === "desktop-pi-login";
}

function populateProviderForm(profile) {
  if (!profile) {
    resetProviderForm(providerFormMode);
    return;
  }
  editingProviderKey = String(profile.provider_key || "");
  applyProviderMode(profile.config_kind === "oauth" ? "oauth" : "api");
  if (providerKeyInputEl) {
    providerKeyInputEl.value = profile.provider_key || "";
  }
  if (providerDisplayNameInputEl) {
    providerDisplayNameInputEl.value = profile.display_name || "";
  }
  if (providerOauthPresetSelectEl) {
    const matchedPreset = providerOauthPresets().find((item) => item.id === profile.provider_key);
    providerOauthPresetSelectEl.value = matchedPreset ? matchedPreset.id : "";
  }
  providerAuthMode = profile.auth_mode === "manual-tokens" ? "manual-tokens" : "desktop-pi-login";
  renderOauthAuthModeOptions();
  if (providerBaseUrlInputEl) {
    providerBaseUrlInputEl.value = profile.base_url || "";
  }
  renderApiTypeOptions();
  if (providerApiTypeSelectEl && profile.api_type) {
    providerApiTypeSelectEl.value = profile.api_type;
  }
  if (providerAuthHeaderInputEl) {
    providerAuthHeaderInputEl.checked = Boolean(profile.auth_header);
  }
  if (providerApiKeyInputEl) {
    providerApiKeyInputEl.value = "";
  }
  if (providerAccessTokenInputEl) {
    providerAccessTokenInputEl.value = "";
  }
  if (providerRefreshTokenInputEl) {
    providerRefreshTokenInputEl.value = "";
  }
  if (providerOauthExpiresInputEl) {
    providerOauthExpiresInputEl.value = formatMsToLocalInput(profile.oauth_expires_at);
  }
  if (providerOauthAccountInputEl) {
    providerOauthAccountInputEl.value =
      profile.oauth_email || profile.oauth_account_id || profile.oauth_project_id || "";
  }
  if (providerModelsTextEl) {
    providerModelsTextEl.value = profile.models_text || "";
  }
  applyProviderAuthMode(providerAuthMode);
  setProviderFeedback(`正在编辑 ${profile.display_name || profile.provider_key}`);
}

function renderProviderProfiles() {
  if (!providerProfileListEl || !providerProfileEmptyEl) {
    return;
  }
  const profiles = providerProfiles();
  providerProfileListEl.innerHTML = "";
  providerProfileEmptyEl.classList.toggle("hidden", profiles.length > 0);

  profiles.forEach((profile) => {
    const card = document.createElement("article");
    card.className = "settings-provider-card";

    const top = document.createElement("div");
    top.className = "settings-provider-top";

    const identity = document.createElement("div");
    const title = document.createElement("p");
    title.className = "settings-provider-title";
    title.textContent = profile.display_name || profile.provider_key || "未命名 Provider";
    const key = document.createElement("p");
    key.className = "settings-provider-key";
    key.textContent = profile.provider_key || "";
    identity.appendChild(title);
    identity.appendChild(key);

    const actions = document.createElement("div");
    actions.className = "settings-provider-actions";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "button button-secondary";
    editButton.textContent = "编辑";
    editButton.addEventListener("click", () => populateProviderForm(profile));

    if (canTriggerDesktopPiLogin(profile)) {
      const loginButton = document.createElement("button");
      loginButton.type = "button";
      loginButton.className = "button button-secondary";
      loginButton.textContent = "Pi 登录";
      loginButton.addEventListener("click", async () => {
        await triggerDesktopPiLogin(profile.provider_key);
      });
      actions.appendChild(loginButton);
    }

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "button button-danger-subtle";
    deleteButton.textContent = "删除";
    deleteButton.addEventListener("click", async () => {
      if (!window.confirm(`确认删除 ${profile.provider_key} 吗？`)) {
        return;
      }
      await deleteProviderProfile(profile.provider_key);
    });

    actions.appendChild(editButton);
    actions.appendChild(deleteButton);
    top.appendChild(identity);
    top.appendChild(actions);
    card.appendChild(top);

    const meta = document.createElement("div");
    meta.className = "settings-provider-meta";
    const chips = [
      profile.config_kind === "oauth" ? "OAuth" : "API",
      profile.managed ? "gogo-app 管理" : "外部已存在",
      profile.uses_extension ? "RPC 会自动加载 extension" : "不需要 extension",
    ];
    if (profile.model_count) {
      chips.push(`${profile.model_count} 个模型`);
    }
    if (profile.config_kind === "api") {
      chips.push(profile.credentials_configured ? "已保存 API key" : "未保存 API key");
    } else {
      chips.push(profile.auth_mode_label || (profile.auth_mode === "manual-tokens" ? "手动导入 token" : "桌面版 Pi 登录"));
      if (profile.auth_mode === "manual-tokens") {
        chips.push(profile.oauth_connected ? "已保存 token" : "未保存 token");
      } else {
        chips.push(profile.oauth_connected ? "Pi 已登录" : "待通过 Pi 登录");
      }
    }
    chips.filter(Boolean).forEach((label) => {
      const chip = document.createElement("span");
      chip.className = "settings-provider-chip";
      chip.textContent = label;
      meta.appendChild(chip);
    });
    card.appendChild(meta);

    const summary = document.createElement("p");
    summary.className = "settings-provider-summary";
    summary.textContent = providerSummary(profile);
    card.appendChild(summary);
    providerProfileListEl.appendChild(card);
  });
}

function renderModelProviderSettings() {
  renderApiTypeOptions();
  renderOauthPresetOptions();
  renderOauthAuthModeOptions();
  renderProviderProfiles();
  applyProviderMode(providerFormMode);
}

function renderSettings() {
  renderKnowledgeBaseSettings();
  renderModelProviderSettings();
}

async function loadAppSettings() {
  const response = await fetch("/api/settings");
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  appSettings = await response.json();
  renderSettings();
}

function openSettingsPanel() {
  settingsOverlayEl?.classList.remove("hidden");
  setKnowledgeBaseFeedback("");
  setProviderFeedback("");
}

function closeSettingsPanel() {
  settingsOverlayEl?.classList.add("hidden");
  setKnowledgeBaseFeedback("");
  setProviderFeedback("");
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

function providerSavePayload() {
  const configKind = providerFormMode;
  const providerKey = String(providerKeyInputEl?.value || "").trim();
  const accountHint = String(providerOauthAccountInputEl?.value || "").trim();
  return {
    config_kind: configKind,
    auth_mode: configKind === "oauth" ? providerAuthMode : "",
    provider_key: providerKey,
    display_name: String(providerDisplayNameInputEl?.value || "").trim(),
    base_url: String(providerBaseUrlInputEl?.value || "").trim(),
    api_type: String(providerApiTypeSelectEl?.value || "").trim(),
    models_text: String(providerModelsTextEl?.value || "").trim(),
    auth_header: Boolean(providerAuthHeaderInputEl?.checked),
    api_key: String(providerApiKeyInputEl?.value || "").trim(),
    clear_secret: false,
    access_token: String(providerAccessTokenInputEl?.value || "").trim(),
    refresh_token: String(providerRefreshTokenInputEl?.value || "").trim(),
    expires_at: parseLocalInputToMs(providerOauthExpiresInputEl?.value),
    account_id: configKind === "oauth" ? accountHint : "",
    email: configKind === "oauth" && accountHint.includes("@") ? accountHint : "",
    project_id: "",
  };
}

async function refreshPiOptionsAfterProviderChange() {
  try {
    await window.ChatWorkbench?.reloadPiOptions?.();
  } catch (error) {
    console.error("Failed to refresh Pi options after provider change:", error);
  }
}

async function triggerDesktopPiLogin(providerKey) {
  if (!providerKey) {
    setProviderFeedback("请先选择一个 Provider。", true);
    return;
  }
  setProviderFeedback(`正在尝试为 ${providerKey} 触发 Pi 登录...`);
  try {
    const safeKey = encodeURIComponent(providerKey);
    const response = await fetch(`/api/settings/model-providers/${safeKey}/desktop-login`, {
      method: "POST",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.detail || `HTTP ${response.status}`);
    }
    setProviderFeedback(data.detail || "Pi 登录流程已触发。");
  } catch (error) {
    setProviderFeedback(String(error.message || error), true);
  }
}

async function saveProviderProfile() {
  const payload = providerSavePayload();
  if (!payload.provider_key) {
    setProviderFeedback("请先填写 Provider Key。", true);
    return;
  }
  if (!saveProviderButtonEl) {
    return;
  }
  saveProviderButtonEl.disabled = true;
  setProviderFeedback("正在保存 Provider...");
  try {
    const response = await fetch("/api/settings/model-providers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.detail || `HTTP ${response.status}`);
    }
    appSettings = {
      ...(appSettings || {}),
      model_providers: data.model_providers || {},
    };
    renderModelProviderSettings();
    await refreshPiOptionsAfterProviderChange();
    resetProviderForm(providerFormMode);
    setProviderFeedback(data.detail || "Provider 已保存。");
  } catch (error) {
    setProviderFeedback(`保存失败：${error.message}`, true);
  } finally {
    saveProviderButtonEl.disabled = false;
  }
}

async function deleteProviderProfile(providerKey) {
  setProviderFeedback(`正在删除 ${providerKey}...`);
  try {
    const safeKey = encodeURIComponent(providerKey);
    const response = await fetch(`/api/settings/model-providers/${safeKey}`, {
      method: "DELETE",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.detail || `HTTP ${response.status}`);
    }
    appSettings = {
      ...(appSettings || {}),
      model_providers: data.model_providers || {},
    };
    if (editingProviderKey === providerKey) {
      resetProviderForm(providerFormMode);
    }
    renderModelProviderSettings();
    await refreshPiOptionsAfterProviderChange();
    setProviderFeedback(data.detail || "Provider 已删除。");
  } catch (error) {
    setProviderFeedback(`删除失败：${error.message}`, true);
  }
}

openSettingsButtonEl?.addEventListener("click", openSettingsPanel);
closeSettingsButtonEl?.addEventListener("click", closeSettingsPanel);
applyKnowledgeBasePathButtonEl?.addEventListener("click", applyKnowledgeBasePath);
providerModeApiButtonEl?.addEventListener("click", () => applyProviderMode("api"));
providerModeOauthButtonEl?.addEventListener("click", () => applyProviderMode("oauth"));
providerAuthModeSelectEl?.addEventListener("change", () => {
  applyProviderAuthMode(String(providerAuthModeSelectEl.value || "desktop-pi-login"));
});
saveProviderButtonEl?.addEventListener("click", saveProviderProfile);
providerDesktopLoginButtonEl?.addEventListener("click", async () => {
  await triggerDesktopPiLogin(String(providerKeyInputEl?.value || "").trim());
});
resetProviderButtonEl?.addEventListener("click", () => resetProviderForm(providerFormMode));

knowledgeBasePathInputEl?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    void applyKnowledgeBasePath();
  }
});

providerOauthPresetSelectEl?.addEventListener("change", () => {
  const presetId = String(providerOauthPresetSelectEl.value || "").trim();
  if (!presetId) {
    return;
  }
  const preset = providerOauthPresets().find((item) => item.id === presetId);
  if (!preset) {
    return;
  }
  if (providerKeyInputEl) {
    providerKeyInputEl.value = preset.id;
  }
  if (providerDisplayNameInputEl && !providerDisplayNameInputEl.value.trim()) {
    providerDisplayNameInputEl.value = preset.label || preset.id;
  }
  applyProviderAuthMode("desktop-pi-login");
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

resetProviderForm("api");

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
