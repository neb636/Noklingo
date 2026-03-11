import SwiftUI

struct HomeView: View {
    @EnvironmentObject var progress: UserProgress
    @State private var activeLesson: CurriculumLesson? = nil

    var body: some View {
        ZStack {
            Color.nokBackground.ignoresSafeArea()

            VStack(spacing: 0) {
                headerBar

                ScrollView {
                    LazyVStack(spacing: 16) {
                        ForEach(Array(appCurriculum.units.enumerated()), id: \.element.id) { unitIndex, unit in
                            UnitCard(unit: unit, unitIndex: unitIndex) { lesson in
                                activeLesson = lesson
                            }
                        }
                    }
                    .padding(.vertical, 20)
                }
            }
        }
        .fullScreenCover(item: $activeLesson) { lesson in
            LessonView(lesson: lesson)
                .environmentObject(progress)
        }
    }

    private var headerBar: some View {
        HStack {
            Label("\(progress.streak)", systemImage: "flame.fill")
                .font(.system(size: 16, weight: .bold))
                .foregroundColor(.goldenBeak)

            Spacer()

            Text("🐦 Noklingo")
                .font(.system(size: 20, weight: .black))
                .foregroundColor(.nokGreen)

            Spacer()

            Label("\(progress.xp) XP", systemImage: "star.fill")
                .font(.system(size: 16, weight: .bold))
                .foregroundColor(.nokGreen)
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 14)
        .background(Color.nokSurface)
    }
}

// MARK: - Unit Card

struct UnitCard: View {
    let unit: CurriculumUnit
    let unitIndex: Int
    let onStartLesson: (CurriculumLesson) -> Void

    @EnvironmentObject var progress: UserProgress

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Unit header
            HStack(spacing: 12) {
                Text(unit.emoji)
                    .font(.system(size: 30))

                VStack(alignment: .leading, spacing: 2) {
                    Text("Unit \(unit.id)".uppercased())
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(.nokGreen.opacity(0.7))
                        .tracking(1)
                    Text(unit.title)
                        .font(.system(size: 18, weight: .bold))
                        .foregroundColor(.white)
                    Text(unit.thaiTitle)
                        .font(.system(size: 13))
                        .foregroundColor(.white.opacity(0.4))
                }
                Spacer()
            }
            .padding(.horizontal, 20)
            .padding(.top, 16)
            .padding(.bottom, 12)

            Divider()
                .overlay(Color.white.opacity(0.07))

            // Lessons
            ForEach(Array(unit.lessons.enumerated()), id: \.element.id) { lessonIndex, lesson in
                let unlocked = progress.isLessonUnlocked(at: lessonIndex, in: unit, unitIndex: unitIndex)
                let completed = progress.completedLessons.contains(lesson.id)

                LessonRow(
                    lesson: lesson,
                    unlocked: unlocked,
                    completed: completed
                ) {
                    if unlocked { onStartLesson(lesson) }
                }

                if lessonIndex < unit.lessons.count - 1 {
                    Divider()
                        .overlay(Color.white.opacity(0.05))
                        .padding(.leading, 72)
                }
            }
        }
        .background(Color.nokSurface)
        .clipShape(RoundedRectangle(cornerRadius: Radius.lg))
        .padding(.horizontal, 16)
        .opacity(unitIndex == 0 ? 1 : 0.45)
    }
}

// MARK: - Lesson Row

struct LessonRow: View {
    let lesson: CurriculumLesson
    let unlocked: Bool
    let completed: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 14) {
                ZStack {
                    Circle()
                        .fill(iconBackground)
                        .frame(width: 44, height: 44)
                    Image(systemName: iconName)
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(iconForeground)
                }

                VStack(alignment: .leading, spacing: 3) {
                    Text(lesson.title)
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(unlocked ? .white : .white.opacity(0.3))
                    Text("\(lesson.xpReward) XP")
                        .font(.system(size: 12))
                        .foregroundColor(unlocked ? .nokGreen.opacity(0.7) : .white.opacity(0.2))
                }

                Spacer()

                if unlocked && !completed {
                    Text("Start")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(.nokBackground)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 7)
                        .background(Color.nokGreen)
                        .clipShape(Capsule())
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 12)
        }
        .disabled(!unlocked)
    }

    private var iconBackground: Color {
        if completed { return .nokGreen }
        if unlocked  { return .nokGreen.opacity(0.15) }
        return .white.opacity(0.05)
    }

    private var iconName: String {
        if completed { return "checkmark" }
        if unlocked  { return "play.fill" }
        return "lock.fill"
    }

    private var iconForeground: Color {
        if completed { return .white }
        if unlocked  { return .nokGreen }
        return .white.opacity(0.25)
    }
}
