import CoreImage
let img = CIImage(contentsOf: URL(fileURLWithPath: CommandLine.arguments[1]))!
let det = CIDetector(ofType: CIDetectorTypeQRCode, context: nil, options: [CIDetectorAccuracy: CIDetectorAccuracyHigh])!
for f in det.features(in: img) { if let q = f as? CIQRCodeFeature { print("decoded:", q.messageString ?? "nil") } }
