import SwiftUI

struct ResultsView: View {
    let xpEarned: Int
    let accuracy: Int
    let lessonId: String
    let onContinue: () -> Void

    @EnvironmentObject var progress: UserProgress
    @State private var animateStars = false
    @State private var displayXP = 0

    private var stars: Int {
        if accuracy >= 90 { return 3 }
        if accuracy >= 60 { return 2 }
        return 1
    }

    var body: some View {
        VStack(spacing: 0) {
            Spacer()

            // Stars
            HStack(spacing: 10) {
                ForEach(0..<3, id: \.self) { i in
                    Image(systemName: i < stars ? "star.fill" : "star")
                        .font(.system(size: 40))
                        .foregroundColor(i < stars ? .goldenBeak : .white.opacity(0.15))
                        .scaleEffect(animateStars && i < stars ? 1.15 : 1.0)
                        .animation(
                            .spring(response: 0.4, dampingFraction: 0.5)
                                .delay(Double(i) * 0.12),
                            value: animateStars
                        )
                }
            }

            Spacer().frame(height: Spacing.lg)

            Text("Lesson Complete!")
                .font(.system(size: 28, weight: .black))
                .foregroundColor(.white)

            Text("\(accuracy)% accuracy")
                .font(.system(size: 15))
                .foregroundColor(.white.opacity(0.5))
                .padding(.top, 4)

            Spacer().frame(height: Spacing.xl)

            // XP counter
            VStack(spacing: 4) {
                Text("\(displayXP)")
                    .font(.system(size: 60, weight: .black, design: .rounded))
                    .foregroundColor(.nokGreen)
                    .contentTransition(.numericText())
                Text("XP earned")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.nokGreen.opacity(0.65))
            }
            .padding(Spacing.xl)
            .background(Color.nokGreen.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: Radius.xl))

            Spacer()

            Button(action: {
                progress.completeLesson(id: lessonId, xpEarned: xpEarned)
                onContinue()
            }) {
                Text("Continue")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(.nokBackground)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 18)
                    .background(Color.nokGreen)
                    .clipShape(RoundedRectangle(cornerRadius: Radius.lg))
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 32)
        }
        .onAppear {
            animateStars = true
            countUpXP()
        }
    }

    private func countUpXP() {
        let total = xpEarned
        guard total > 0 else { return }
        let steps = 20
        let interval = 0.9 / Double(steps)
        for i in 1...steps {
            DispatchQueue.main.asyncAfter(deadline: .now() + interval * Double(i)) {
                displayXP = Int((Double(i) / Double(steps)) * Double(total))
                if i == steps { displayXP = total }
            }
        }
    }
}
