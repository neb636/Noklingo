import Foundation

// MARK: - Top-level container
struct Curriculum: Codable {
    let units: [CurriculumUnit]
}

// MARK: - Unit
struct CurriculumUnit: Codable, Identifiable {
    let id: Int
    let title: String
    let thaiTitle: String
    let emoji: String
    let lessons: [CurriculumLesson]
}

// MARK: - Lesson
struct CurriculumLesson: Codable, Identifiable {
    let id: String
    let title: String
    let xpReward: Int
    let exercises: [Exercise]
}

// MARK: - Exercise
struct Exercise: Codable, Identifiable {
    let id: String
    let kind: ExerciseKind
    let instruction: String

    // Multiple choice
    let prompt: String?
    let promptRomanized: String?
    let choices: [String]?
    let correctChoice: String?

    // Tap to build
    let englishPrompt: String?
    let correctWords: [String]?
    let wordBank: [String]?

    // Match pairs
    let pairs: [WordPair]?

    enum ExerciseKind: String, Codable {
        case multipleChoice
        case tapToBuild
        case matchPairs
    }
}

// MARK: - Word Pair (used in matchPairs exercises)
struct WordPair: Codable {
    let thai: String
    let english: String
    let romanized: String?
}

// MARK: - Loader
enum CurriculumLoader {
    static func load() -> Curriculum {
        guard
            let url = Bundle.main.url(forResource: "curriculum", withExtension: "json"),
            let data = try? Data(contentsOf: url),
            let curriculum = try? JSONDecoder().decode(Curriculum.self, from: data)
        else {
            fatalError("Failed to load curriculum.json from bundle")
        }
        return curriculum
    }
}

// Loaded once at app start, accessed globally
let appCurriculum: Curriculum = CurriculumLoader.load()
