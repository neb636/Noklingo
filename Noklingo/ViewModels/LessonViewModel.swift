import Foundation

class LessonViewModel: ObservableObject {
    let lesson: CurriculumLesson

    @Published var currentIndex: Int = 0
    @Published var hearts: Int = 5
    @Published var xpEarned: Int = 0
    @Published var correctCount: Int = 0
    @Published var isComplete: Bool = false
    @Published var lastAnswerCorrect: Bool? = nil
    @Published var showFeedback: Bool = false

    init(lesson: CurriculumLesson) {
        self.lesson = lesson
    }

    var currentExercise: Exercise? {
        guard currentIndex < lesson.exercises.count else { return nil }
        return lesson.exercises[currentIndex]
    }

    var progress: Double {
        guard !lesson.exercises.isEmpty else { return 0 }
        return Double(currentIndex) / Double(lesson.exercises.count)
    }

    var accuracy: Int {
        guard currentIndex > 0 else { return 100 }
        return Int((Double(correctCount) / Double(currentIndex)) * 100)
    }

    func submitAnswer(correct: Bool) {
        lastAnswerCorrect = correct
        showFeedback = true
        if correct {
            correctCount += 1
        } else {
            hearts = max(0, hearts - 1)
        }
    }

    func advance() {
        showFeedback = false
        lastAnswerCorrect = nil
        if currentIndex + 1 >= lesson.exercises.count {
            xpEarned = lesson.xpReward
            isComplete = true
        } else {
            currentIndex += 1
        }
    }
}
