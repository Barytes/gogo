from __future__ import annotations

from typing import Any

from .wiki_service import list_pages, search_pages


EVALUATION_HINTS = (
    "gap",
    "tradeoff",
    "值得",
    "方向",
    "张力",
    "冲突",
    "下一步",
    "实验",
    "判断",
)


def simulate_chat(message: str, history: list[dict[str, str]] | None = None) -> dict[str, Any]:
    history = history or []
    matches = search_pages(message, limit=4)
    consulted = [
        {
            "path": page["path"],
            "title": page["title"],
            "category": page["category"],
            "summary": page["summary"],
        }
        for page in matches
    ]

    is_evaluative = any(token in message.lower() for token in EVALUATION_HINTS)

    if not consulted:
        fallback_category = "insights" if is_evaluative else "knowledge"
        fallback_pages = [
            page for page in list_pages() if page["category"] == fallback_category
        ]
        if not fallback_pages:
            fallback_pages = list_pages()
        consulted = [
            {
                "path": page["path"],
                "title": page["title"],
                "category": page["category"],
                "summary": page["summary"],
            }
            for page in fallback_pages[:3]
        ]

    if consulted:
        answer_lines = [
            "这是一个模拟的 agent 回复，当前还没有接入真实模型。",
            "我先根据本地 wiki 找到了几页最相关的内容，可以把它们当成回答入口。",
        ]

        if is_evaluative:
            answer_lines.append(
                "你的问题更偏研究判断，所以后续接入真 agent 时，应该优先读 `wiki/insights/`，再回看 `wiki/knowledge/`。"
            )
        else:
            answer_lines.append(
                "你的问题更偏知识梳理，所以后续接入真 agent 时，可以优先读 `wiki/knowledge/`。"
            )

        answer_lines.append("本次模拟命中的页面有：")
        for page in consulted:
            answer_lines.append(f"- {page['title']}：{page['summary']}")
        answer_lines.append("如果你愿意，我后面可以把这里的 mock 接成真实 agent runtime。")
    else:
        answer_lines = [
            "这是一个模拟的 agent 回复，当前还没有接入真实模型。",
            "我暂时没有在本地 wiki 中匹配到明显相关的页面。",
            "现在的前端链路已经打通了，后面只要把这个接口替换成真实的 agent 调用即可。",
        ]

    return {
        "mode": "mock",
        "message": "\n".join(answer_lines),
        "consulted_pages": consulted,
        "history_length": len(history) + 1,
        "suggested_prompts": [
            "这个方向有哪些值得持续追的 gap？",
            "knowledge 和 insights 的区别是什么？",
            "帮我快速理解当前 wiki 结构。",
        ],
    }
