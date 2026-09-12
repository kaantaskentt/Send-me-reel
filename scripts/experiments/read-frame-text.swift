// Offline candidate-frame OCR experiment. Uses only Apple Vision on the Mac.
import Foundation
import Vision
import ImageIO

struct FrameText: Codable {
    let file: String
    let text: [String]
}

var results: [FrameText] = []
for file in CommandLine.arguments.dropFirst() {
    let url = URL(fileURLWithPath: file)
    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    request.usesLanguageCorrection = false
    request.recognitionLanguages = ["en-US"]
    try VNImageRequestHandler(url: url).perform([request])
    results.append(FrameText(file: url.lastPathComponent, text: (request.results ?? []).compactMap { $0.topCandidates(1).first?.string }))
}
let encoder = JSONEncoder()
encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
print(String(data: try encoder.encode(results), encoding: .utf8)!)
