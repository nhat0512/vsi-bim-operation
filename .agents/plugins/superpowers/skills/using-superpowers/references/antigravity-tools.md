# Antigravity CLI (`agy`) Tool Mapping

Skills speak in actions ("dispatch a subagent", "create a todo", "read a file"). On Antigravity these resolve to the tools below.

| Action skills request | Antigravity equivalent |
|----------------------|----------------------|
| Dispatch a subagent (`Subagent (general-purpose):` template) | `invoke_subagent` or `browser_subagent` |
| Task tracking ("create a todo", "mark complete") | Task tracking via markdown checklist or artifact |
| Run shell commands | `run_command` |
| View / edit files | `view_file`, `replace_file_content`, `write_to_file` |
| Search code | `grep_search`, `list_dir` |

## Task tracking

Antigravity uses artifacts and interactive markdown checklists to track tasks. When skills say "create a todo" or "mark complete", maintain a clear task checklist in the session context or artifacts.
