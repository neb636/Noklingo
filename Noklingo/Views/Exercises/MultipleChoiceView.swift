import SwiftUI

struct MultipleChoiceView: View {
    let exercise: Exercise
    let onAnswer: (Bool) -> Void

    @State private var selected: String? = nil
    @State private var submitted = false

    var body: some View {
        VStack(spacing: 0) {
            Spacer()

            instruction

            Spacer().frame(height: Spacing.lg)

            // Thai prompt
            VStack(spacing: 6) {
                Text(exercise.prompt ?? "")
                    .font(.system(size: 52, weight: .bold))
                    .foregroundColor(.white)
                    .multilineTextAlignment(.center)

                if let romanized = exercise.promptRomanized {
                    Text(romanized)
                        .font(.system(size: 16))
                        .foregroundColor(.white.opacity(0.4))
                }
            }
            .padding(.horizontal, 20)

            Spacer()

            // Choice grid
            LazyVGrid(
                columns: [GridItem(.flexible()), GridItem(.flexible())],
                spacing: 10
            ) {
                ForEach(exercise.choices ?? [], id: \.self) { choice in
                    ChoiceButton(
                        text: choice,
                        state: buttonState(for: choice)
                    ) {
                        guard !submitted else { return }
                        selected = choice
                        submitted = true
                        onAnswer(choice == exercise.correctChoice)
                    }
                }
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 24)
        }
    }

    private var instruction: some View {
        Text(exercise.instruction)
            .font(.system(size: 13, weight: .semibold))
            .foregroundColor(.white.opacity(0.45))
            .tracking(1)
            .textCase(.uppercase)
    }

    private func buttonState(for choice: String) -> ChoiceButtonState {
        guard submitted else { return .idle }
        if choice == exercise.correctChoice { return .correct }
        if choice == selected { return .wrong }
        return .idle
    }
}

// MARK: - Choice Button

enum ChoiceButtonState { case idle, correct, wrong }

struct ChoiceButton: View {
    let text: String
    let state: ChoiceButtonState
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(text)
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(foreground)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 18)
                .background(background)
                .clipShape(RoundedRectangle(cornerRadius: Radius.md))
                .overlay(
                    RoundedRectangle(cornerRadius: Radius.md)
                        .stroke(border, lineWidth: 2)
                )
        }
        .animation(.easeInOut(duration: 0.15), value: state)
    }

    private var background: Color {
        switch state {
        case .idle:    return .nokSurfaceElevated
        case .correct: return .nokGreen.opacity(0.18)
        case .wrong:   return .coral.opacity(0.18)
        }
    }

    private var border: Color {
        switch state {
        case .idle:    return .white.opacity(0.1)
        case .correct: return .nokGreen
        case .wrong:   return .coral
        }
    }

    private var foreground: Color {
        switch state {
        case .idle:    return .white
        case .correct: return .nokGreen
        case .wrong:   return .coral
        }
    }
}
