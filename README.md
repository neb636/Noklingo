# 🐦 Noklingo

A personal Thai language learning app for iPhone, built with SwiftUI.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Language | Swift 5.9 |
| UI Framework | SwiftUI (declarative, code-only — no drag-and-drop) |
| Persistence | UserDefaults (Phase 1), SwiftData (planned) |
| Project generation | XcodeGen |
| Platform | iOS 17+, iPhone only |

---

## First-Time Setup

### 1. Install Homebrew (if you don't have it)
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 2. Install XcodeGen
XcodeGen reads `project.yml` and generates the Xcode project file. You only need to run this once, or whenever the project structure changes (new files, new targets).

```bash
brew install xcodegen
```

### 3. Generate the Xcode project
Run this from the repo root:
```bash
xcodegen generate
```
This creates `Noklingo.xcodeproj`. **Never edit this file by hand** — always edit `project.yml` and re-run `xcodegen generate`.

### 4. Open in Xcode
```bash
open Noklingo.xcodeproj
```

### 5. Set your signing team
- In Xcode, click the **Noklingo** project in the left sidebar
- Select the **Noklingo** target
- Go to the **Signing & Capabilities** tab
- Set **Team** to your Apple ID (free account works for the simulator and basic device installs)

---

## Day-to-Day Workflow

```
Claude Code writes/edits .swift files  →  You hit Cmd+R in Xcode  →  App runs
```

You never need to use Xcode's UI editor (Interface Builder). All UI is written as Swift code.

### Running on Simulator
- Hit **Cmd+R** in Xcode, or press the ▶ play button
- The iOS Simulator launches automatically

### Running on your iPhone
1. Plug in your iPhone via USB
2. In Xcode, select your iPhone from the device dropdown (top-left, next to the play button)
3. Hit **Cmd+R**
4. First time: you'll need to trust the developer certificate on your phone
   → iPhone: **Settings → General → VPN & Device Management → [your Apple ID] → Trust**

### Re-signing (free Apple ID)
Apps signed with a free Apple ID expire every **7 days**. Just hit Cmd+R again to re-install.
A paid Apple Developer account ($99/year) extends this to 12 months and is required for push notifications and home screen widgets (Phase 4).

---

## Project Structure

```
Noklingo/
├── project.yml                        ← XcodeGen spec (edit this, not .xcodeproj)
├── Noklingo/
│   ├── NoklingoApp.swift              ← App entry point (@main)
│   ├── ContentView.swift              ← Root view
│   ├── DesignSystem.swift             ← Brand colours, spacing, radius constants
│   ├── Info.plist                     ← App metadata (bundle ID, version, etc.)
│   ├── Assets.xcassets/               ← App icon and image assets
│   ├── Models/
│   │   ├── CurriculumModels.swift     ← Lesson/Exercise data structures + JSON loader
│   │   └── UserProgress.swift         ← Streak, XP, completed lessons (UserDefaults)
│   ├── ViewModels/
│   │   └── LessonViewModel.swift      ← Lesson session state (hearts, progress, XP)
│   ├── Views/
│   │   ├── HomeView.swift             ← Skill tree home screen
│   │   ├── LessonView.swift           ← Lesson container + feedback footer
│   │   ├── ResultsView.swift          ← Post-lesson XP + stars screen
│   │   └── Exercises/
│   │       ├── MultipleChoiceView.swift
│   │       ├── TapToBuildView.swift
│   │       └── MatchPairsView.swift
│   └── Resources/
│       └── curriculum.json            ← All lesson content (edit to add exercises)
└── planning/
    └── noklingo-project-plan.md
```

---

## Adding Lesson Content

All lesson content lives in `Noklingo/Resources/curriculum.json`. No Swift changes needed to add exercises.

### Exercise types

#### `multipleChoice` — tap the correct English meaning
```json
{
  "id": "unique-id",
  "kind": "multipleChoice",
  "instruction": "What does this mean?",
  "prompt": "สวัสดี",
  "promptRomanized": "sa-wat-dee",
  "choices": ["Hello", "Goodbye", "Thank you", "Sorry"],
  "correctChoice": "Hello"
}
```

#### `tapToBuild` — tap Thai word tiles to translate an English phrase
```json
{
  "id": "unique-id",
  "kind": "tapToBuild",
  "instruction": "Translate this sentence",
  "englishPrompt": "Hello, thank you",
  "correctWords": ["สวัสดี", "ขอบคุณ"],
  "wordBank": ["สวัสดี", "ขอบคุณ", "ลาก่อน", "ใช่"]
}
```
> `correctWords` is the expected order. `wordBank` should include the correct words plus distractors.

#### `matchPairs` — tap matching Thai and English cards
```json
{
  "id": "unique-id",
  "kind": "matchPairs",
  "instruction": "Match the pairs",
  "pairs": [
    { "thai": "สวัสดี", "english": "Hello",     "romanized": "sa-wat-dee" },
    { "thai": "ขอบคุณ", "english": "Thank you", "romanized": "khob khun" }
  ]
}
```
> Keep pairs between 3–5 for best UX.

---

## Design System

Colours are defined in `DesignSystem.swift` and used as `Color.nokGreen`, `Color.coral`, etc.

| Name | Hex | Usage |
|---|---|---|
| `nokGreen` | `#34d399` | Primary brand, correct answers, XP |
| `goldenBeak` | `#f59e0b` | Streaks, stars |
| `coral` | `#f87171` | Wrong answers, hearts |
| `skyBlue` | `#38bdf8` | Selection highlights, hints |
| `nokBackground` | `#0f1923` | Main background |
| `nokSurface` | `#1a2634` | Cards, panels |
| `nokSurfaceElevated` | `#243444` | Buttons, tiles |

---

## Phased Roadmap

| Phase | Status | Goal |
|---|---|---|
| **Phase 1 — Foundation** | ✅ In progress | Installable app with 1 working lesson |
| **Phase 2 — Core Loop** | Planned | Full lesson engine, XP, streaks, hearts |
| **Phase 3 — Curriculum** | Planned | All 10 units, audio, skill tree |
| **Phase 4 — Native Features** | Planned | Push notifications, home screen widget |
| **Phase 5 — Polish** | Planned | Animations, sounds, achievements, QA |

---

## Troubleshooting

**"No such module" or build errors after adding files**
Re-run `xcodegen generate` and reopen the project.

**App crashes on launch with "Failed to load curriculum.json"**
Make sure `curriculum.json` is listed under *Build Phases → Copy Bundle Resources* in Xcode. If it's missing, re-run `xcodegen generate`.

**Simulator looks wrong / not dark mode**
The app forces dark mode. If the simulator is in light mode, it will still render dark.

**Can't run on device: "Untrusted Developer"**
Go to iPhone → Settings → General → VPN & Device Management → tap your Apple ID → Trust.

---

*🐦 Fly through Thai, one lesson at a time.*
