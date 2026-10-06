// Builds navratri-dandiya-alpha.mp4: each frame of the dandiya video on the top half,
// and its subject mask (Apple Vision "subject lifting") as a grey matte on the bottom half.
// navratri.js joins the two halves with WebGL so only the dancers show on the page.
// Needs macOS 14+.  Build and run:
//   swiftc -O alpha.swift -o alpha && ./alpha video.mp4 navratri-dandiya-alpha.mp4 1500000
import AVFoundation
import Vision
import CoreImage
let args = CommandLine.arguments
guard args.count >= 3 else { print("usage: alpha <input.mp4> <output.mp4> [bitrate]"); exit(1) }
let W = 640, H = 360, BR = args.count > 3 ? Int(args[3])! : 1_500_000
let src = AVURLAsset(url: URL(fileURLWithPath: args[1]))
let track = src.tracks(withMediaType: .video)[0]
print("fps", track.nominalFrameRate, "size", track.naturalSize)
let reader = try! AVAssetReader(asset: src)
let rOut = AVAssetReaderTrackOutput(track: track, outputSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA])
reader.add(rOut)
let outURL = URL(fileURLWithPath: args[2])
try? FileManager.default.removeItem(at: outURL)
let writer = try! AVAssetWriter(outputURL: outURL, fileType: .mp4)
writer.shouldOptimizeForNetworkUse = true
let wIn = AVAssetWriterInput(mediaType: .video, outputSettings: [
    AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: W, AVVideoHeightKey: H * 2,
    AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: BR, AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel, AVVideoMaxKeyFrameIntervalKey: 48]
])
wIn.expectsMediaDataInRealTime = false
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: wIn, sourcePixelBufferAttributes: [
    kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA, kCVPixelBufferWidthKey as String: W, kCVPixelBufferHeightKey as String: H * 2])
writer.add(wIn)
reader.startReading(); writer.startWriting(); writer.startSession(atSourceTime: .zero)
let ctx = CIContext(options: [.workingColorSpace: NSNull()])
var n = 0, empty = 0
while let sb = rOut.copyNextSampleBuffer() {
    guard let pb = CMSampleBufferGetImageBuffer(sb) else { continue }
    let t = CMSampleBufferGetPresentationTimeStamp(sb)
    let color = CIImage(cvPixelBuffer: pb)
    let sx = CGFloat(W) / color.extent.width, sy = CGFloat(H) / color.extent.height
    var maskCI = CIImage(color: .black).cropped(to: color.extent)
    let req = VNGenerateForegroundInstanceMaskRequest()
    let handler = VNImageRequestHandler(cvPixelBuffer: pb)
    if (try? handler.perform([req])) != nil, let r = req.results?.first, !r.allInstances.isEmpty,
       let m = try? r.generateScaledMaskForImage(forInstances: r.allInstances, from: handler) {
        maskCI = CIImage(cvPixelBuffer: m)
    } else { empty += 1 }
    // soften the matte edge a touch, then make it a grey image
    let soft = maskCI.clampedToExtent().applyingGaussianBlur(sigma: 0.8).cropped(to: maskCI.extent)
    let grey = soft.applyingFilter("CIColorMatrix", parameters: [
        "inputRVector": CIVector(x: 1, y: 0, z: 0, w: 0), "inputGVector": CIVector(x: 1, y: 0, z: 0, w: 0),
        "inputBVector": CIVector(x: 1, y: 0, z: 0, w: 0), "inputAVector": CIVector(x: 0, y: 0, z: 0, w: 0),
        "inputBiasVector": CIVector(x: 0, y: 0, z: 0, w: 1)]).cropped(to: maskCI.extent)
    let top = color.transformed(by: CGAffineTransform(scaleX: sx, y: sy)).transformed(by: CGAffineTransform(translationX: 0, y: CGFloat(H)))
    let bottom = grey.transformed(by: CGAffineTransform(scaleX: CGFloat(W) / grey.extent.width, y: CGFloat(H) / grey.extent.height))
    let frame = top.composited(over: bottom).cropped(to: CGRect(x: 0, y: 0, width: W, height: H * 2))
    var outPB: CVPixelBuffer?
    CVPixelBufferPoolCreatePixelBuffer(nil, adaptor.pixelBufferPool!, &outPB)
    ctx.render(frame, to: outPB!)
    while !wIn.isReadyForMoreMediaData { usleep(2000) }
    adaptor.append(outPB!, withPresentationTime: t)
    n += 1
}
wIn.markAsFinished()
let sem = DispatchSemaphore(value: 0)
writer.finishWriting { sem.signal() }
sem.wait()
print("frames", n, "no-mask", empty, "status", writer.status.rawValue, writer.error?.localizedDescription ?? "")
