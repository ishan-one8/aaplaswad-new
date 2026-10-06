// Builds navratri-mala-left.png and navratri-mala-right.png: the marigold strings from one
// frame of the dandiya video, keyed off the dark purple wall by colour, with the dancers
// removed using Apple Vision masks.  Needs macOS 14+.  Build and run:
//   swiftc -O key.swift -o key && ./key frame.jpg 410
// then resize each output to 260 px tall (for example: sips -Z 260 mala-left.png).
import AppKit
import CoreGraphics
import Vision
import CoreImage
// Pull the marigold strings off the dark purple wall by colour, then save left and right clusters.
guard CommandLine.arguments.count >= 3 else { print("usage: key <frame.jpg> <rows-to-keep>"); exit(1) }
let src = NSImage(contentsOfFile: CommandLine.arguments[1])!
var r0 = CGRect(origin: .zero, size: src.size)
let cg = src.cgImage(forProposedRect: &r0, context: nil, hints: nil)!
let W = cg.width, H = cg.height
var px = [UInt8](repeating: 0, count: W * H * 4)
let cs = CGColorSpaceCreateDeviceRGB()
let ctx = CGContext(data: &px, width: W, height: H, bitsPerComponent: 8, bytesPerRow: W * 4, space: cs, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
ctx.draw(cg, in: CGRect(x: 0, y: 0, width: W, height: H))
let maxY = Int(CommandLine.arguments[2])!
// where the dancers are, so they never end up in the garland cut-outs
let req = VNGenerateForegroundInstanceMaskRequest()
let vh = VNImageRequestHandler(cgImage: cg)
try! vh.perform([req])
var dancer = [Float](repeating: 0, count: W * H)
if let res = req.results?.first, let m = try? res.generateScaledMaskForImage(forInstances: res.allInstances, from: vh) {
    // grow the matte a little so edges are covered
    let ci = CIImage(cvPixelBuffer: m).clampedToExtent().applyingFilter("CIMorphologyMaximum", parameters: ["inputRadius": 8]).cropped(to: CGRect(x: 0, y: 0, width: W, height: H))
    CIContext(options: [.workingColorSpace: NSNull()]).render(ci, toBitmap: &dancer, rowBytes: W * 16 / 4, bounds: CGRect(x: 0, y: 0, width: W, height: H), format: .Rf, colorSpace: nil)
}   // rows below this (from the top) are dropped
for y in 0..<H {
    for x in 0..<W {
        let i = (y * W + x) * 4
        let r = Double(px[i]), g = Double(px[i+1]), b = Double(px[i+2])
        let mx = max(r, g, b), mn = min(r, g, b)
        let sat = mx > 0 ? (mx - mn) / mx : 0
        // wall is dark and bluish-purple: keep warm (r>b) saturated or bright things
        let warm = (r - b) / 255.0
        let green = (g - b) / 255.0
        var a = max(warm * 2.2, green * 2.6, (mx / 255.0 - 0.72) * 4) * min(1, sat * 1.6 + (mx > 215 ? 1 : 0))
        a = max(0, min(1, (a - 0.18) / 0.32))
        if y > maxY { a = 0 }
        if dancer[y * W + x] > 0.05 { a = 0 }
        if x > 330 && x < W - 330 { a = 0 }   // dancers' column
        let A = UInt8(a * 255)
        px[i] = UInt8(r * a); px[i+1] = UInt8(g * a); px[i+2] = UInt8(b * a); px[i+3] = A
    }
}
let out = ctx.makeImage()!
func save(_ img: CGImage, _ name: String) {
    let rep = NSBitmapImageRep(cgImage: img)
    try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: name))
}
save(out.cropping(to: CGRect(x: 0, y: 0, width: 300, height: maxY))!, "mala-left.png")
save(out.cropping(to: CGRect(x: W - 300, y: 0, width: 300, height: maxY))!, "mala-right.png")
print("ok")
