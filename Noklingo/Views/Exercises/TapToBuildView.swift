import SwiftUI

struct TapToBuildView: View {
    let exercise: Exercise
    let onAnswer: (Bool) -> Void

    @State private var selected: [String] = []
    @State private var bank: [String] = []
    @State private var submitted = false

    // Words still available in the bank (excluding ones already selected)
    private var remaining: [String] {
        var pool = bank
        for word in selected {
            if let i = pool.firstIndex(of: word) { pool.remove(at: i) }
        }
        return pool
    }

    var body: some View {
        VStack(spacing: 0) {
            Spacer()

            // Instruction + English prompt
            VStack(spacing: 12) {
                Text(exercise.instruction)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.white.opacity(0.45))
                    .tracking(1)
                    .textCase(.uppercase)

                Text(exercise.englishPrompt ?? "")
                    .font(.system(size: 24, weight: .bold))
                    .foregroundColor(.white)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 20)
            }

            Spacer()

            // Answer tray
            answerTray
                .padding(.horizontal, 20)

            Spacer().frame(height: Spacing.lg)

            // Word bank
            FlowLayout(spacing: Spacing.sm) {
                ForEach(remaining, id: \.self) { word in
                    WordTile(word: word, inAnswer: false) {
                        guard !submitted else { return }
                        selected.append(word)
                    }
                }
            }
            .padding(.horizontal, 20)

            Spacer().frame(height: Spacing.lg)

            // Check button
            if !submitted {
                Button(action: submit) {
                    Text("Check")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(.nokBackground)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(selected.isEmpty ? Color.white.opacity(0.15) : Color.nokGreen)
                        .clipShape(RoundedRectangle(cornerRadius: Radius.md))
                }
                .disabled(selected.isEmpty)
                .padding(.horizontal, 20)
                .padding(.bottom, 24)
            } else {
                Spacer().frame(height: 24 + 52) // reserve same height so layout doesn't jump
            }
        }
        .onAppear {
            bank = (exercise.wordBank ?? []).shuffled()
        }
    }

    private var answerTray: some View {
        ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: Radius.md)
                .stroke(Color.white.opacity(0.2), lineWidth: 1.5)
                .frame(minHeight: 70)

            if selected.isEmpty {
                Text("Tap words to build your answer")
                    .font(.system(size: 14))
                    .foregroundColor(.white.opacity(0.22))
                    .padding(14)
            } else {
                FlowLayout(spacing: Spacing.sm) {
                    ForEach(Array(selected.enumerated()), id: \.offset) { index, word in
                        WordTile(word: word, inAnswer: true) {
                            guard !submitted else { return }
                            selected.remove(at: index)
                        }
                    }
                }
                .padding(12)
            }
        }
        .frame(minHeight: 70)
    }

    private func submit() {
        guard !submitted, !selected.isEmpty else { return }
        submitted = true
        onAnswer(selected == (exercise.correctWords ?? []))
    }
}

// MARK: - Word Tile

struct WordTile: View {
    let word: String
    let inAnswer: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(word)
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(.white)
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(inAnswer ? Color.nokSurfaceElevated : Color.nokSurface)
                .clipShape(RoundedRectangle(cornerRadius: Radius.sm))
                .overlay(
                    RoundedRectangle(cornerRadius: Radius.sm)
                        .stroke(Color.white.opacity(inAnswer ? 0.25 : 0.12), lineWidth: 1.5)
                )
        }
    }
}

// MARK: - Flow Layout (wraps children like CSS flex-wrap)

struct FlowLayout: Layout {
    let spacing: CGFloat

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let width = proposal.width ?? 0
        var y: CGFloat = 0
        var x: CGFloat = 0
        var lineH: CGFloat = 0

        for sub in subviews {
            let size = sub.sizeThatFits(.unspecified)
            if x + size.width > width, x > 0 {
                y += lineH + spacing
                x = 0; lineH = 0
            }
            x += size.width + spacing
            lineH = max(lineH, size.height)
        }
        return CGSize(width: width, height: y + lineH)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = bounds.minX
        var y = bounds.minY
        var lineH: CGFloat = 0

        for sub in subviews {
            let size = sub.sizeThatFits(.unspecified)
            if x + size.width > bounds.maxX, x > bounds.minX {
                y += lineH + spacing
                x = bounds.minX; lineH = 0
            }
            sub.place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(size))
            x += size.width + spacing
            lineH = max(lineH, size.height)
        }
    }
}
