import Foundation

class UserProgress: ObservableObject {
    @Published var xp: Int
    @Published var streak: Int
    @Published var completedLessons: Set<String>
    @Published var lastPracticeDate: Date?

    private let defaults = UserDefaults.standard

    init() {
        self.xp = defaults.integer(forKey: "xp")
        self.streak = defaults.integer(forKey: "streak")
        let saved = defaults.stringArray(forKey: "completedLessons") ?? []
        self.completedLessons = Set(saved)
        self.lastPracticeDate = defaults.object(forKey: "lastPracticeDate") as? Date
    }

    func completeLesson(id: String, xpEarned: Int) {
        completedLessons.insert(id)
        xp += xpEarned
        updateStreak()
        save()
    }

    /// A lesson is unlocked when it is the very first lesson, or when the
    /// immediately preceding lesson in the same unit has been completed.
    func isLessonUnlocked(at lessonIndex: Int, in unit: CurriculumUnit, unitIndex: Int) -> Bool {
        if unitIndex == 0 && lessonIndex == 0 { return true }
        if lessonIndex > 0 {
            let prevId = unit.lessons[lessonIndex - 1].id
            return completedLessons.contains(prevId)
        }
        // First lesson of a later unit: require previous unit fully complete
        return false  // expanded in Phase 2
    }

    // MARK: - Private

    private func updateStreak() {
        let today = Calendar.current.startOfDay(for: Date())
        if let last = lastPracticeDate {
            let lastDay = Calendar.current.startOfDay(for: last)
            let diff = Calendar.current.dateComponents([.day], from: lastDay, to: today).day ?? 0
            switch diff {
            case 0: break          // same day, no change
            case 1: streak += 1   // consecutive day
            default: streak = 1   // gap — reset
            }
        } else {
            streak = 1
        }
        lastPracticeDate = Date()
    }

    private func save() {
        defaults.set(xp, forKey: "xp")
        defaults.set(streak, forKey: "streak")
        defaults.set(Array(completedLessons), forKey: "completedLessons")
        defaults.set(lastPracticeDate, forKey: "lastPracticeDate")
    }
}
