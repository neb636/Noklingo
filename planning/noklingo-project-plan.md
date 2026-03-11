**🐦 Noklingo**

A Personal Thai Language Learning App

ภาษาไทย • Beginner Track • iPhone

*Project Plan & Feature Roadmap*

**1. Project Overview**

Noklingo is a personal iPhone app for learning Thai as a complete
beginner. It is modelled closely on the Duolingo experience --- daily
lessons, streaks, gamification, push notifications, and home screen
widgets --- but built entirely around a Thai language beginner
curriculum. It is a personal-use project and does not need to support
multiple languages or users.

The core philosophy mirrors Duolingo: short, daily lessons (5--15
minutes) that build vocabulary, reading, listening, and speaking skills
incrementally. Motivation is maintained through streaks, XP, badges, and
a satisfying lesson flow.

**2. Goals & Non-Goals**

**Goals**

-   Build a Duolingo-style app installable on iPhone for personal use

-   Cover a complete Thai beginner curriculum (alphabet through basic
    conversation)

-   Support push notifications for daily lesson reminders and streak
    protection

-   Include a home screen progress widget showing streak and daily goal

-   Gamify progress with XP, streaks, hearts, badges, and a skill tree

-   Support both Thai script and romanised phonetics (transliteration)
    for beginners

-   Include audio pronunciation for all vocabulary and phrases

-   Work fully offline after initial setup

**Non-Goals**

-   Multi-user support or social features

-   Intermediate or advanced Thai content (beginner track only, for now)

-   Android support

-   App Store distribution --- personal sideloading only

-   Monetisation or subscription features

**3. Core Features**

**3.1 Daily Lessons**

Each lesson is a short session of 10--20 exercises covering a single
topic or skill. Lesson types mirror Duolingo\'s exercise formats:

-   Translate a Thai word or phrase into English

-   Translate an English phrase into Thai (tap-to-build or type)

-   Match pairs (Thai word ↔ image or English word)

-   Tap what you hear (listening exercise)

-   Fill in the blank

-   Multiple choice --- select the correct Thai word

-   Arrange scrambled words into the correct order

Lessons end with a results screen showing XP earned, accuracy, and
streak status.

**3.2 Curriculum --- Beginner Track**

The beginner curriculum is broken into units, each containing several
lessons, modelled on how Duolingo structures its early content:

  -------------------------------------------------------------------------
  **Unit**   **Theme**          **Topics Covered**
  ---------- ------------------ -------------------------------------------
  **1**      Thai Alphabet      Consonants, vowels, tones, pronunciation
                                basics

  **2**      Greetings          Hello, goodbye, thank you, polite particles
                                (ครับ/ค่ะ)

  **3**      Numbers & Time     Numbers 1--100, days, months, telling the
                                time

  **4**      People & Family    Pronouns, family members, describing people

  **5**      Food & Drink       Common foods, ordering, likes and dislikes

  **6**      Places & Transport Directions, transport, locations

  **7**      Shopping           Prices, bargaining, quantities

  **8**      Daily Routine      Verbs of action, time expressions, daily
                                activities

  **9**      Basic Conversation Introducing yourself, small talk, yes/no
                                questions

  **10**     Review & Practice  Mixed review across all units
  -------------------------------------------------------------------------

**3.3 Skill Tree & Navigation**

The home screen displays a vertical skill tree of all units and lessons,
similar to Duolingo\'s path. Completed lessons are marked with a
checkmark and coloured in Nok Green. Locked lessons are greyed out until
prerequisites are completed. Each unit has a celebratory checkpoint at
the end.

**3.4 Gamification**

-   XP (Experience Points) --- earned for completing lessons and daily
    goals

-   Streaks --- daily streak counter with fire icon; missed day resets
    to zero

-   Hearts / Lives --- 5 hearts per session; wrong answers cost a heart;
    refill over time

-   Leagues --- weekly XP leaderboard (solo, self-competing, e.g. beat
    your own best)

-   Badges & Achievements --- milestones like first lesson, 7-day
    streak, unit completion

-   Daily Goal --- configurable XP target (Casual / Regular / Serious /
    Intense)

**3.5 Push Notifications**

Noklingo will send push notifications to keep daily practice consistent:

-   Daily reminder --- configurable time, e.g. \"Time for your Thai
    lesson! 🐦\"

-   Streak at risk --- evening reminder if the daily goal hasn\'t been
    met

-   Streak milestone --- celebrate 7, 30, 100 day streaks

-   New unit unlocked --- notify when a new unit becomes available

Notifications are fully configurable in app settings and respect iOS Do
Not Disturb.

**3.6 Home Screen Widget**

A native iOS widget installable on the iPhone home or lock screen,
available in small and medium sizes:

-   Small widget --- streak count, daily goal ring, Nok bird icon

-   Medium widget --- streak, daily goal progress bar, current unit
    name, XP today

Tapping the widget opens directly into the daily lesson.

**3.7 Audio & Pronunciation**

-   Every vocabulary word and phrase has a native Thai audio recording
    or TTS audio

-   Tap any word to hear pronunciation at any time

-   Listening exercises play audio and ask the user to select the
    matching word

-   Slow audio option for difficult tones or long phrases

**3.8 Progress & Statistics**

A dedicated progress screen shows:

-   Total XP, current streak, longest streak

-   Lessons completed and accuracy rate

-   Words learned counter

-   Weekly XP bar chart

-   Unit completion map

**3.9 Settings**

-   Daily goal (Casual 5 XP / Regular 10 XP / Serious 20 XP / Intense 30
    XP)

-   Notification time and toggle

-   Show/hide romanised phonetics (transliteration) below Thai script

-   Sound and haptic feedback toggles

-   Reset progress option

**4. Phased Roadmap**

  ------------------------------------------------------------------------
  **Phase**     **Name**           **Goal**             **Duration**
  ------------- ------------------ -------------------- ------------------
  **Phase 1**   Foundation         Installable app with 2--3 weeks
                                   1 working lesson     

  **Phase 2**   Core Loop          Full lesson engine,  3--4 weeks
                                   XP, streaks, hearts  

  **Phase 3**   Curriculum         All 10 units, audio, 4--6 weeks
                                   skill tree           

  **Phase 4**   Native Features    Push notifications,  2--3 weeks
                                   home screen widget   

  **Phase 5**   Polish             Animations, sounds,  2--3 weeks
                                   achievements, final  
                                   QA                   
  ------------------------------------------------------------------------

**Phase 1 --- Foundation**

-   Set up project and get it installable on iPhone via sideloading

-   Build basic navigation: home screen, lesson screen, results screen

-   Create the first lesson with at least 3 exercise types

-   Establish the Noklingo visual design system (colours, fonts,
    components)

**Phase 2 --- Core Loop**

-   Complete lesson engine with all 7 exercise types

-   XP system with daily goal tracking

-   Streak counter with persistence across app restarts

-   Hearts / lives system during lessons

-   Lesson results screen with XP animation

-   Skill tree home screen with locked/unlocked states

**Phase 3 --- Curriculum**

-   Author content for all 10 beginner units (vocabulary, phrases,
    exercises)

-   Integrate audio for all words and phrases

-   Romanised transliteration toggle

-   Unit checkpoint / celebration screens

-   Progress and statistics screen

**Phase 4 --- Native iPhone Features**

-   Push notifications --- daily reminders, streak alerts, milestones

-   Home screen widget (small and medium sizes)

-   Lock screen widget

-   Background app refresh for streak checking

**Phase 5 --- Polish**

-   Animations for correct/incorrect answers, XP gain, streak fire

-   Sound effects and haptic feedback

-   Badges and achievements system

-   Onboarding flow for first-time launch

-   Final QA across all units and exercise types

**5. iPhone Installation**

Since Noklingo is a personal-use app and will not be distributed through
the App Store, it will be installed on iPhone via sideloading. This
means signing the app with a personal Apple developer certificate and
installing it directly onto the device over USB or Wi-Fi.

A free Apple ID can be used for sideloading, though apps signed this way
must be re-installed every 7 days. A paid Apple Developer account
(\$99/year) extends this to 12 months and also enables:

-   Push notification entitlements (required for lesson reminders)

-   Widget extensions (required for home screen widget)

-   Background refresh (required for streak checks)

A paid developer account is therefore recommended to unlock the full
Noklingo feature set including notifications and the widget. No App
Store submission is required.

**6. Design & Branding**

-   App name: Noklingo (Nok = นก, Thai for \"bird\")

-   Mascot: Nok --- a friendly green Thai bird (inspired by Duolingo\'s
    Duo the owl)

-   Primary colour: Nok Green (#34d399) with deep forest dark mode
    backgrounds

-   Accent colours: Golden Beak for streaks/XP, Coral for wrong answers,
    Sky Blue for hints

-   Typography: clean, readable sans-serif with Thai script support
    throughout

-   Tone: encouraging, playful, and celebratory --- every small win is
    acknowledged

**7. Success Criteria**

This is a personal project, so success is measured by usefulness and
consistency rather than user metrics. The project will be considered
complete when:

-   The app is installed and running natively on iPhone

-   All 10 beginner units are fully playable with audio

-   Daily notifications arrive reliably at the chosen time

-   The home screen widget updates correctly with streak and XP data

-   A 30-day streak is achievable without technical issues

-   Thai alphabet, numbers, greetings, and basic phrases can be recalled
    without the app

🐦 *Fly through Thai, one lesson at a time.*
