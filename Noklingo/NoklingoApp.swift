import SwiftUI

@main
struct NoklingoApp: App {
    @StateObject private var progress = UserProgress()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(progress)
                .preferredColorScheme(.dark)
        }
    }
}
