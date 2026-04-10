import process from "node:process";

import {
  AuthStorage,
  ModelRegistry,
  SessionManager,
  createAgentSession,
  createReadOnlyTools,
} from "@mariozechner/pi-coding-agent";

function readStdin() {
  return new Promise((resolve, reject) => {
    let raw = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      raw += chunk;
    });
    process.stdin.on("end", () => resolve(raw));
    process.stdin.on("error", reject);
  });
}

function buildPrompt(systemPrompt, prompt) {
  const sections = [];

  if (systemPrompt) {
    sections.push("System instructions:");
    sections.push(systemPrompt.trim());
  }

  sections.push("User request:");
  sections.push((prompt || "").trim());

  return sections.join("\n\n");
}

function stringifyMessageContent(content) {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (!item || typeof item !== "object") {
          return "";
        }
        if (typeof item.text === "string") {
          return item.text;
        }
        if (item.type === "text" && typeof item.content === "string") {
          return item.content;
        }
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }

  return "";
}

function findLatestAssistantText(tree) {
  if (!tree) {
    return "";
  }

  const queue = Array.isArray(tree) ? [...tree] : [tree];
  let latest = "";

  while (queue.length > 0) {
    const node = queue.shift();
    if (!node || typeof node !== "object") {
      continue;
    }

    const role = node.role || node.message?.role || node.entry?.message?.role;
    const content =
      node.content ?? node.message?.content ?? node.entry?.message?.content;

    if (role === "assistant") {
      const text = stringifyMessageContent(content).trim();
      if (text) {
        latest = text;
      }
    }

    const children = node.children || node.entries || node.nodes;
    if (Array.isArray(children)) {
      queue.push(...children);
    }
  }

  return latest;
}

async function main() {
  try {
    const raw = await readStdin();
    const payload = raw.trim() ? JSON.parse(raw) : {};

    const cwd =
      typeof payload.cwd === "string" && payload.cwd.trim()
        ? payload.cwd.trim()
        : process.cwd();
    const prompt = buildPrompt(payload.system_prompt, payload.prompt);

    const authStorage = AuthStorage.create();
    const modelRegistry = new ModelRegistry(authStorage);
    const { session, modelFallbackMessage } = await createAgentSession({
      cwd,
      authStorage,
      modelRegistry,
      sessionManager: SessionManager.inMemory(),
      tools: createReadOnlyTools(cwd),
    });

    let assistantText = "";
    session.subscribe((event) => {
      if (event?.type !== "message_update") {
        return;
      }

      const assistantEvent = event.assistantMessageEvent;
      if (!assistantEvent || typeof assistantEvent !== "object") {
        return;
      }

      if (
        assistantEvent.type === "text_delta" &&
        typeof assistantEvent.delta === "string"
      ) {
        assistantText += assistantEvent.delta;
      }

      if (
        assistantEvent.type === "text_replace" &&
        typeof assistantEvent.text === "string"
      ) {
        assistantText = assistantEvent.text;
      }
    });

    await session.prompt(prompt);

    if (!assistantText.trim() && typeof session.getTree === "function") {
      assistantText = findLatestAssistantText(session.getTree());
    }

    const warnings = [];
    if (modelFallbackMessage) {
      warnings.push(String(modelFallbackMessage));
    }

    process.stdout.write(
      JSON.stringify({
        ok: true,
        message: assistantText.trim(),
        warnings,
      })
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : `Unknown Pi SDK error: ${String(error)}`;
    process.stdout.write(JSON.stringify({ ok: false, error: message }));
    process.exitCode = 1;
  }
}

await main();
