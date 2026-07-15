---
name: omni-branch
description: OmniMind에서 새 기능·수정 작업을 시작할 때 main에서 작업 브랜치를 따는 스킬. 사용자가 "브랜치 따줘", "새 기능 시작", "이 기능 개발하자", "branch 만들어" 라고 하거나, 새로운 기능/버그수정/리팩토링 작업에 착수하는 시점이라면 — 브랜치를 명시적으로 요구하지 않았더라도 — 이 스킬을 사용해 main이 아닌 작업 브랜치 위에서 개발을 시작한다.
---

# OmniMind 기능 브랜치 생성

새 작업을 main 위에서 바로 시작하면 미완성 코드가 배포 라인(main → Vercel)에 섞인다.
그래서 작업 단위마다 브랜치를 따고, 완료 시 `omni-merge` 스킬로 리뷰 후 main에 합친다.

## 절차

1. **현재 상태 확인** — `git status`로 미커밋 변경이 있는지 본다.
   - 미커밋 변경이 **이전 작업의 잔여물**이면: 사용자에게 알리고 처리 방법(커밋/스태시)을 정한 뒤 진행한다. 남의 변경을 새 브랜치로 끌고 가면 나중에 머지 diff가 오염된다.
   - 미커밋 변경이 **지금 시작하려는 작업과 같은 것**이면: 그대로 두고 브랜치만 갈아타면 된다 (`git switch -c`는 워킹트리를 보존한다).
2. **main 최신화** — 브랜치의 기준점이 오래되면 머지 때 충돌만 늘어난다.
   ```
   git fetch origin
   git switch main
   git pull --ff-only origin main
   ```
   `--ff-only`가 실패하면 로컬 main이 origin과 갈라진 것이므로 멈추고 사용자에게 보고한다.
3. **브랜치 생성** — `git switch -c <브랜치명>`
   - 같은 이름의 브랜치가 이미 있으면 임의로 덮지 말고 확인한다: **같은 작업의 재개**면 `git switch <브랜치명>`으로 갈아타고 main 변경분이 쌓였으면 따라잡는다(`git merge main`). **별개 작업**이면 슬러그를 바꿔 새 브랜치를 만든다.

## 브랜치 이름 규칙

커밋 컨벤션과 같은 타입 접두사 + 영문 kebab-case 슬러그. 한글은 브랜치명에 쓰지 않는다(도구 호환성).

| 작업 성격 | 접두사 | 예시 |
|---|---|---|
| 새 기능 | `feat/` | `feat/payment-checkout` |
| 버그 수정 | `fix/` | `fix/auth-callback-error` |
| 리팩토링 | `refactor/` | `refactor/engine-module-split` |
| 테스트 보강 | `test/` | `test/pillars-boundary-cases` |
| 잡무/설정 | `chore/` | `chore/ci-cache-tuning` |
| 문서 | `docs/` | `docs/roadmap-q3` |

슬러그는 기능의 핵심을 2~4단어로. 사용자가 한국어로 기능을 설명하면 의미를 영어로 옮겨 짓는다.
(예: "결제 기능" → `feat/payment`, "데일리 문구 다듬기" → `feat/daily-copy-polish`)

## 완료 보고

브랜치를 만들고 나면 사용자에게 알린다: 어떤 브랜치를 어느 커밋(main HEAD) 위에 만들었는지,
그리고 작업이 끝나면 `omni-merge`로 리뷰·머지하면 된다는 것.
