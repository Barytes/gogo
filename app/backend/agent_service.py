from __future__ import annotations

import importlib.util
import json
import subprocess
import sys
from typing import Any

from .chat_service import simulate_chat
from .config import (
    get_agent_mode,
    get_my_agent_loop_dir,
    get_my_agent_loop_model,
    get_pi_node_command,
    get_pi_node_command_path,
    get_pi_sdk_bridge_path,
    get_pi_timeout_seconds,
    get_pi_workdir,
)
from .raw_service import search_raw_files
from .wiki_service import search_pages


def get_agent_backend_status() -> dict[str, Any]:
    my_loop_dir = get_my_agent_loop_dir()
    pi_sdk_bridge_path = get_pi_sdk_bridge_path()
    return {
        "mode": get_agent_mode(),
        "pi_node_command": get_pi_node_command(),
        "pi_node_command_path": get_pi_node_command_path(),
        "pi_sdk_bridge_path": str(pi_sdk_bridge_path),
        "pi_workdir": str(get_pi_workdir()),
        "pi_available": bool(get_pi_node_command_path()) and pi_sdk_bridge_path.exists(),
        "my_agent_loop_dir": str(my_loop_dir),
        "my_agent_loop_available": (my_loop_dir / "main.py").exists(),
    }


def _collect_context(message: str) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    wiki_hits = search_pages(message, limit=4)
    raw_hits = search_raw_files(message, limit=4)
    return wiki_hits, raw_hits


def _build_pi_prompt(
    message: str,
    history: list[dict[str, str]],
    wiki_hits: list[dict[str, Any]],
    raw_hits: list[dict[str, Any]],
) -> str:
    prompt_lines = [
        "Current user question:",
        message,
    ]

    if history:
        prompt_lines.extend(["", "Recent chat history:"])
        for turn in history[-6:]:
            role = turn.get("role", "user")
            content = turn.get("content", "")
            prompt_lines.append(f"- {role}: {content}")

    if wiki_hits:
        prompt_lines.extend(["", "Relevant wiki pages already retrieved by the backend:"])
        for page in wiki_hits:
            prompt_lines.append(
                f"- [wiki] {page['path']} | {page['title']} | {page['summary']}"
            )

    if raw_hits:
        prompt_lines.extend(["", "Relevant raw materials already retrieved by the backend:"])
        for item in raw_hits:
            prompt_lines.append(
                f"- [raw] {item['path']} | {item['title']} | {item['summary']}"
            )

    return "\n".join(prompt_lines)


def _build_pi_system_prompt() -> str:
    prompt_lines = [
        "You are answering inside a research knowledge-base workbench.",
        "Use the local repository as the primary source of truth.",
        "Prefer maintained wiki pages first, then raw materials when needed.",
        "Treat this interaction as read-only. Do not edit files, run destructive commands, or write back changes.",
        "If the local knowledge base is insufficient, say what is missing clearly.",
        "Answer in Chinese unless the material clearly requires another language.",
        "Cite the consulted local files you actually rely on.",
    ]
    return "\n".join(prompt_lines)


def _build_consulted_pages(
    wiki_hits: list[dict[str, Any]], raw_hits: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    pages = [
        {
            "path": page["path"],
            "title": page["title"],
            "category": page["category"],
            "summary": page["summary"],
            "source": "wiki",
        }
        for page in wiki_hits
    ]
    pages.extend(
        {
            "path": item["path"],
            "title": item["title"],
            "category": item["category"],
            "summary": item["summary"],
            "source": "raw",
        }
        for item in raw_hits
    )
    return pages


_MY_AGENT_LOOP_MODULE: Any | None = None


def _load_my_agent_loop_module() -> Any:
    global _MY_AGENT_LOOP_MODULE

    if _MY_AGENT_LOOP_MODULE is not None:
        return _MY_AGENT_LOOP_MODULE

    loop_dir = get_my_agent_loop_dir()
    main_file = loop_dir / "main.py"
    if not main_file.exists():
        raise FileNotFoundError(f"my-agent-loop entry not found: {main_file}")

    if str(loop_dir) not in sys.path:
        sys.path.insert(0, str(loop_dir))

    spec = importlib.util.spec_from_file_location("embedded_my_agent_loop_main", main_file)
    if spec is None or spec.loader is None:
        raise ImportError("Failed to create import spec for my-agent-loop.")

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    _MY_AGENT_LOOP_MODULE = module
    return module


def _run_my_agent_loop_chat(message: str, history: list[dict[str, str]]) -> dict[str, Any]:
    wiki_hits, raw_hits = _collect_context(message)

    loop_prompt_lines = [
        "请优先依据下面这些本地知识库上下文来回答。",
        "如果本地材料不足，再使用你自己的工具调用能力补充。",
        "回答请使用中文。",
        "",
        "用户问题：",
        message,
    ]

    if history:
        loop_prompt_lines.extend(["", "最近对话："])
        for turn in history[-6:]:
            loop_prompt_lines.append(f"- {turn.get('role', 'user')}: {turn.get('content', '')}")

    if wiki_hits:
        loop_prompt_lines.extend(["", "本地 wiki 检索结果："])
        for page in wiki_hits:
            loop_prompt_lines.append(
                f"- [wiki] {page['path']} | {page['title']} | {page['summary']}"
            )

    if raw_hits:
        loop_prompt_lines.extend(["", "本地 raw 检索结果："])
        for item in raw_hits:
            loop_prompt_lines.append(
                f"- [raw] {item['path']} | {item['title']} | {item['summary']}"
            )

    loop_prompt = "\n".join(loop_prompt_lines)

    try:
        module = _load_my_agent_loop_module()
    except FileNotFoundError:
        fallback = simulate_chat(message=message, history=history)
        fallback["mode"] = "mock-fallback"
        fallback["message"] = (
            "当前 `.env` 已配置为 `AGENT_MODE=my-agent-loop`，但没有找到 `my-agent-loop/main.py`。\n\n"
            f"{fallback['message']}"
        )
        fallback["warnings"] = ["my-agent-loop directory not found."]
        return fallback
    except ModuleNotFoundError as exc:
        fallback = simulate_chat(message=message, history=history)
        fallback["mode"] = "mock-fallback"
        fallback["message"] = (
            "my-agent-loop 代码已找到，但它依赖的 Python 包当前没有安装到 gogo-app 的环境里。\n"
            f"缺失模块：{exc.name}\n\n"
            f"{fallback['message']}"
        )
        fallback["warnings"] = [f"Missing dependency for my-agent-loop: {exc.name}"]
        return fallback
    except Exception as exc:
        fallback = simulate_chat(message=message, history=history)
        fallback["mode"] = "mock-fallback"
        fallback["message"] = (
            "加载 my-agent-loop 时发生异常，当前先回退到 mock。\n"
            f"{exc}\n\n{fallback['message']}"
        )
        fallback["warnings"] = [f"Failed to load my-agent-loop: {exc}"]
        return fallback

    try:
        request_kwargs: dict[str, Any] = {"message": loop_prompt}
        model = get_my_agent_loop_model()
        if model:
            request_kwargs["model"] = model

        loop_request = module.ChatRequest(**request_kwargs)
        loop_response = module.chat(loop_request)
        response_text = getattr(loop_response, "response", None) or str(loop_response)
    except Exception as exc:
        fallback = simulate_chat(message=message, history=history)
        fallback["mode"] = "mock-fallback"
        fallback["message"] = (
            "my-agent-loop 调用失败，当前先回退到 mock。\n"
            f"{exc}\n\n{fallback['message']}"
        )
        fallback["warnings"] = [f"my-agent-loop execution failed: {exc}"]
        return fallback

    return {
        "mode": "my-agent-loop",
        "message": response_text,
        "consulted_pages": _build_consulted_pages(wiki_hits, raw_hits),
        "history_length": len(history) + 1,
        "suggested_prompts": [
            "请结合联网搜索再补充这一点。",
            "如果只保留本地知识库证据，你会怎么回答？",
            "把这个问题拆成 3 个最值得继续查的小问题。",
        ],
        "warnings": [],
    }


def run_agent_chat(message: str, history: list[dict[str, str]] | None = None) -> dict[str, Any]:
    history = history or []
    mode = get_agent_mode()

    if mode == "my-agent-loop":
        return _run_my_agent_loop_chat(message=message, history=history)

    if mode != "pi":
        return simulate_chat(message=message, history=history)

    pi_node_command_path = get_pi_node_command_path()
    if not pi_node_command_path:
        fallback = simulate_chat(message=message, history=history)
        fallback["mode"] = "mock-fallback"
        fallback["message"] = (
            "当前 `.env` 已配置为 `AGENT_MODE=pi`，但运行机器上没有找到可用的 Node.js。\n"
            "请先安装 Node.js，并为 gogo-app 安装 Pi SDK 依赖后再重启服务。\n\n"
            f"{fallback['message']}"
        )
        fallback["warnings"] = [
            "Node.js command not found on PATH.",
            "Install Node.js and the Pi SDK dependency, or switch AGENT_MODE back to mock.",
        ]
        return fallback

    pi_sdk_bridge_path = get_pi_sdk_bridge_path()
    if not pi_sdk_bridge_path.exists():
        fallback = simulate_chat(message=message, history=history)
        fallback["mode"] = "mock-fallback"
        fallback["message"] = (
            "Pi SDK bridge 脚本不存在，当前先回退到 mock 回复。\n\n"
            f"{fallback['message']}"
        )
        fallback["warnings"] = ["Pi SDK bridge script not found."]
        return fallback

    wiki_hits, raw_hits = _collect_context(message)
    prompt = _build_pi_prompt(message, history, wiki_hits, raw_hits)
    system_prompt = _build_pi_system_prompt()

    command = [pi_node_command_path, str(pi_sdk_bridge_path)]
    bridge_payload = {
        "cwd": str(get_pi_workdir()),
        "system_prompt": system_prompt,
        "prompt": prompt,
    }

    try:
        result = subprocess.run(
            command,
            cwd=str(get_pi_workdir()),
            input=json.dumps(bridge_payload),
            capture_output=True,
            text=True,
            timeout=get_pi_timeout_seconds(),
            check=False,
        )
    except subprocess.TimeoutExpired:
        fallback = simulate_chat(message=message, history=history)
        fallback["mode"] = "mock-fallback"
        fallback["message"] = (
            "Pi SDK 调用超时，当前先回退到 mock 回复。\n\n"
            f"{fallback['message']}"
        )
        fallback["warnings"] = ["Pi SDK bridge timed out."]
        return fallback

    if result.returncode != 0:
        fallback = simulate_chat(message=message, history=history)
        stderr = (result.stderr or "").strip()
        fallback["mode"] = "mock-fallback"
        fallback["message"] = (
            "Pi SDK 调用失败，当前先回退到 mock 回复。\n"
            f"Pi stderr: {stderr or 'no stderr output'}\n\n"
            f"{fallback['message']}"
        )
        fallback["warnings"] = [stderr or "Pi SDK bridge exited with a non-zero status."]
        return fallback

    try:
        pi_response = json.loads(result.stdout or "{}")
    except json.JSONDecodeError:
        fallback = simulate_chat(message=message, history=history)
        fallback["mode"] = "mock-fallback"
        fallback["message"] = (
            "Pi SDK 返回了无法解析的响应，当前先回退到 mock 回复。\n\n"
            f"{fallback['message']}"
        )
        fallback["warnings"] = ["Pi SDK bridge returned invalid JSON."]
        return fallback

    if not pi_response.get("ok"):
        fallback = simulate_chat(message=message, history=history)
        bridge_error = str(
            pi_response.get("error") or "Pi SDK bridge reported an unknown error."
        )
        fallback["mode"] = "mock-fallback"
        fallback["message"] = (
            "Pi SDK 未能成功完成请求，当前先回退到 mock 回复。\n"
            f"Pi error: {bridge_error}\n\n"
            f"{fallback['message']}"
        )
        fallback["warnings"] = [bridge_error]
        return fallback

    message_text = (str(pi_response.get("message") or "")).strip() or "Pi SDK 未返回可见文本。"
    warnings = [
        str(item).strip()
        for item in pi_response.get("warnings", [])
        if str(item).strip()
    ]

    return {
        "mode": "pi",
        "message": message_text,
        "consulted_pages": _build_consulted_pages(wiki_hits, raw_hits),
        "history_length": len(history) + 1,
        "suggested_prompts": [
            "请基于本地知识库继续展开这个判断。",
            "这些页面之间的主要张力是什么？",
            "如果只做一个下一步实验，最该做什么？",
        ],
        "warnings": warnings,
    }
