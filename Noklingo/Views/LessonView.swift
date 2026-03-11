import SwiftUI

struct LessonView: View {
    let lesson: CurriculumLesson

    @StateObject private var vm: LessonViewModel
    @EnvironmentObject var progress: UserProgress
    @Environment(\.dismiss) private var dismiss

    init(lesson: CurriculumLesson) {
        self.lesson = lesson
        self._vm = StateObject(wrappedValue: LessonViewModel(lesson: lesson))
    }

    var body: some View {
        ZStack {
            Color.nokBackground.ignoresSafeArea()

            if vm.isComplete {
                ResultsView(
                    xpEarned: vm.xpEarned,
                    accuracy: vm.accuracy,
                    lessonId: lesson.id,
                    onContinue: { dismiss() }
                )
                .environmentObject(progress)
            } else if let exercise = vm.currentExercise {
                VStack(spacing: 0) {
                    topBar
                    exerciseContent(exercise)
                }
                .safeAreaInset(edge: .bottom) {
                    if vm.showFeedback {
                        feedbackFooter
                            .transition(.move(edge: .bottom).combined(with: .opacity))
                    }
                }
            }
        }
        .animation(.easeInOut(duration: 0.2), value: vm.showFeedback)
        .animation(.easeInOut(duration: 0.25), value: vm.currentIndex)
    }

    // MARK: - Top Bar

    private var topBar: some View {
        HStack(spacing: 14) {
            Button(action: { dismiss() }) {
                Image(systemName: "xmark")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(.white.opacity(0.5))
            }

            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(Color.white.opacity(0.12)).frame(height: 8)
                    Capsule()
                        .fill(Color.nokGreen)
                        .frame(width: geo.size.width * vm.progress, height: 8)
                        .animation(.easeInOut(duration: 0.35), value: vm.progress)
                }
            }
            .frame(height: 8)

            HStack(spacing: 3) {
                ForEach(0..<5, id: \.self) { i in
                    Image(systemName: i < vm.hearts ? "heart.fill" : "heart")
                        .font(.system(size: 13))
                        .foregroundColor(i < vm.hearts ? .coral : .white.opacity(0.2))
                }
            }
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 14)
    }

    // MARK: - Exercise Router

    @ViewBuilder
    private func exerciseContent(_ exercise: Exercise) -> some View {
        switch exercise.kind {
        case .multipleChoice:
            MultipleChoiceView(exercise: exercise) { vm.submitAnswer(correct: $0) }
        case .tapToBuild:
            TapToBuildView(exercise: exercise) { vm.submitAnswer(correct: $0) }
        case .matchPairs:
            MatchPairsView(exercise: exercise) { vm.submitAnswer(correct: $0) }
        }
    }

    // MARK: - Feedback Footer

    private var feedbackFooter: some View {
        HStack(spacing: 0) {
            VStack(alignment: .leading, spacing: 4) {
                if vm.lastAnswerCorrect == true {
                    Label("Correct!", systemImage: "checkmark.circle.fill")
                        .font(.system(size: 17, weight: .bold))
                        .foregroundColor(.nokGreen)
                } else {
                    Label("Incorrect", systemImage: "xmark.circle.fill")
                        .font(.system(size: 17, weight: .bold))
                        .foregroundColor(.coral)
                }
            }

            Spacer()

            Button(action: { vm.advance() }) {
                Text("Continue")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(.nokBackground)
                    .padding(.horizontal, 28)
                    .padding(.vertical, 14)
                    .background(vm.lastAnswerCorrect == true ? Color.nokGreen : Color.coral)
                    .clipShape(RoundedRectangle(cornerRadius: Radius.md))
            }
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 16)
        .background(
            (vm.lastAnswerCorrect == true ? Color.nokGreen : Color.coral)
                .opacity(0.12)
                .ignoresSafeArea()
        )
    }
}
