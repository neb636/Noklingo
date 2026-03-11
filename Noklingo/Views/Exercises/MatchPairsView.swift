import SwiftUI

struct MatchPairsView: View {
    let exercise: Exercise
    let onAnswer: (Bool) -> Void

    @State private var thaiColumn: [String] = []
    @State private var englishColumn: [String] = []
    @State private var selectedThai: String? = nil
    @State private var selectedEnglish: String? = nil
    @State private var matched: Set<String> = []      // stores thai keys of matched pairs
    @State private var wrongThai: String? = nil
    @State private var wrongEnglish: String? = nil

    private var pairs: [WordPair] { exercise.pairs ?? [] }
    private var allMatched: Bool { matched.count == pairs.count }

    var body: some View {
        VStack(spacing: 0) {
            Spacer()

            Text(exercise.instruction)
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(.white.opacity(0.45))
                .tracking(1)
                .textCase(.uppercase)

            Spacer()

            HStack(alignment: .top, spacing: 12) {
                // Thai column
                VStack(spacing: 10) {
                    ForEach(thaiColumn, id: \.self) { thai in
                        MatchCard(
                            text: thai,
                            isSelected: selectedThai == thai,
                            isMatched: matched.contains(thai),
                            isWrong: wrongThai == thai
                        ) { selectThai(thai) }
                    }
                }

                // English column
                VStack(spacing: 10) {
                    ForEach(englishColumn, id: \.self) { english in
                        MatchCard(
                            text: english,
                            isSelected: selectedEnglish == english,
                            isMatched: matched.contains(thaiFor(english) ?? ""),
                            isWrong: wrongEnglish == english
                        ) { selectEnglish(english) }
                    }
                }
            }
            .padding(.horizontal, 20)

            Spacer()
        }
        .onAppear {
            thaiColumn = pairs.map(\.thai).shuffled()
            englishColumn = pairs.map(\.english).shuffled()
        }
        .onChange(of: allMatched) { _, isNowComplete in
            if isNowComplete {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) {
                    onAnswer(true)
                }
            }
        }
    }

    // MARK: - Selection Logic

    private func selectThai(_ thai: String) {
        guard !matched.contains(thai) else { return }
        selectedThai = thai
        tryMatch()
    }

    private func selectEnglish(_ english: String) {
        guard let thai = thaiFor(english), !matched.contains(thai) else { return }
        selectedEnglish = english
        tryMatch()
    }

    private func tryMatch() {
        guard let thai = selectedThai, let english = selectedEnglish else { return }
        let isCorrect = pairs.contains { $0.thai == thai && $0.english == english }

        if isCorrect {
            withAnimation(.easeOut(duration: 0.2)) { matched.insert(thai) }
            selectedThai = nil
            selectedEnglish = nil
        } else {
            wrongThai = thai
            wrongEnglish = english
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.55) {
                wrongThai = nil
                wrongEnglish = nil
                selectedThai = nil
                selectedEnglish = nil
            }
        }
    }

    private func thaiFor(_ english: String) -> String? {
        pairs.first { $0.english == english }?.thai
    }
}

// MARK: - Match Card

struct MatchCard: View {
    let text: String
    let isSelected: Bool
    let isMatched: Bool
    let isWrong: Bool
    let action: () -> Void

    var body: some View {
        Button(action: { if !isMatched { action() } }) {
            Text(text)
                .font(.system(size: 15, weight: .medium))
                .foregroundColor(foreground)
                .multilineTextAlignment(.center)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .padding(.horizontal, 8)
                .background(background)
                .clipShape(RoundedRectangle(cornerRadius: Radius.md))
                .overlay(
                    RoundedRectangle(cornerRadius: Radius.md)
                        .stroke(border, lineWidth: 2)
                )
        }
        .animation(.easeInOut(duration: 0.15), value: isSelected)
        .animation(.easeInOut(duration: 0.15), value: isMatched)
        .animation(.easeInOut(duration: 0.15), value: isWrong)
    }

    private var background: Color {
        if isMatched  { return .nokGreen.opacity(0.15) }
        if isWrong    { return .coral.opacity(0.15) }
        if isSelected { return .skyBlue.opacity(0.15) }
        return .nokSurfaceElevated
    }

    private var border: Color {
        if isMatched  { return .nokGreen }
        if isWrong    { return .coral }
        if isSelected { return .skyBlue }
        return .white.opacity(0.12)
    }

    private var foreground: Color {
        if isMatched  { return .nokGreen }
        if isWrong    { return .coral }
        if isSelected { return .skyBlue }
        return .white
    }
}
