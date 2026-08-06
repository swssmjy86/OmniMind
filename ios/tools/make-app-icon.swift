import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

let S = 1024
let cs = CGColorSpace(name: CGColorSpace.sRGB)!
let ctx = CGContext(data: nil, width: S, height: S, bitsPerComponent: 8, bytesPerRow: 0,
                    space: cs, bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!

func c(_ r: Double, _ g: Double, _ b: Double, _ a: Double = 1) -> CGColor {
    CGColor(colorSpace: cs, components: [CGFloat(r), CGFloat(g), CGFloat(b), CGFloat(a)])!
}

let greenLight = c(0.16, 0.36, 0.30)
let greenDark  = c(0.07, 0.18, 0.15)
let cream      = c(0.976, 0.945, 0.882)
let creamDim   = c(0.949, 0.886, 0.804)
let coral      = c(0.910, 0.573, 0.490)

let rect = CGRect(x: 0, y: 0, width: S, height: S)

// Reusable background (deep-green gradient + soft glow) so we can "punch" the moon cutout with it.
func drawBackground() {
    let grad = CGGradient(colorsSpace: cs, colors: [greenLight, greenDark] as CFArray, locations: [0, 1])!
    ctx.saveGState()
    ctx.addRect(rect); ctx.clip()
    ctx.drawLinearGradient(grad, start: CGPoint(x: 0, y: S), end: CGPoint(x: S, y: 0), options: [])
    let glow = CGGradient(colorsSpace: cs,
        colors: [c(0.24, 0.47, 0.40, 1), c(0.13, 0.30, 0.25, 0)] as CFArray, locations: [0, 1])!
    ctx.drawRadialGradient(glow, startCenter: CGPoint(x: 470, y: 540), startRadius: 0,
                           endCenter: CGPoint(x: 470, y: 540), endRadius: 520, options: [])
    ctx.restoreGState()
}

drawBackground()

// Crescent moon = outer circle MINUS cutout circle.
let moonC = CGPoint(x: 470, y: 512), moonR: CGFloat = 322
let cutC  = CGPoint(x: 628, y: 556), cutR: CGFloat = 300
// 1) fill the full moon disc with a warm cream sheen
ctx.saveGState()
ctx.addEllipse(in: CGRect(x: moonC.x - moonR, y: moonC.y - moonR, width: moonR*2, height: moonR*2))
ctx.clip()
let moonGrad = CGGradient(colorsSpace: cs, colors: [cream, creamDim] as CFArray, locations: [0, 1])!
ctx.drawLinearGradient(moonGrad, start: CGPoint(x: 300, y: 800), end: CGPoint(x: 560, y: 240), options: [])
ctx.restoreGState()
// 2) punch the cutout by redrawing the background clipped to the cut circle → true crescent
ctx.saveGState()
ctx.addEllipse(in: CGRect(x: cutC.x - cutR, y: cutC.y - cutR, width: cutR*2, height: cutR*2))
ctx.clip()
drawBackground()
ctx.restoreGState()

// Constellation of "selves" cradled in the moon's opening, joined by thin lines ("잇다")
let nodes: [(Double, Double, Double, CGColor)] = [
    (628, 452, 16, cream),
    (712, 540, 30, coral),
    (786, 452, 14, coral),
    (702, 668, 18, cream),
]
ctx.setStrokeColor(c(0.976, 0.945, 0.882, 0.5))
ctx.setLineWidth(7); ctx.setLineCap(.round); ctx.setLineJoin(.round)
let line = CGMutablePath()
line.move(to: CGPoint(x: nodes[0].0, y: nodes[0].1))
line.addLine(to: CGPoint(x: nodes[1].0, y: nodes[1].1))
line.addLine(to: CGPoint(x: nodes[2].0, y: nodes[2].1))
line.move(to: CGPoint(x: nodes[1].0, y: nodes[1].1))
line.addLine(to: CGPoint(x: nodes[3].0, y: nodes[3].1))
ctx.addPath(line); ctx.strokePath()
for n in nodes {
    ctx.setFillColor(n.3)
    ctx.fillEllipse(in: CGRect(x: n.0 - n.2, y: n.1 - n.2, width: n.2*2, height: n.2*2))
}

// A small 4-point sparkle, coral accent, near the upper horn
func sparkle(_ cx: Double, _ cy: Double, _ r: Double, _ color: CGColor) {
    let p = CGMutablePath(); let k = r * 0.28
    p.move(to: CGPoint(x: cx, y: cy + r))
    p.addQuadCurve(to: CGPoint(x: cx + r, y: cy), control: CGPoint(x: cx + k, y: cy + k))
    p.addQuadCurve(to: CGPoint(x: cx, y: cy - r), control: CGPoint(x: cx + k, y: cy - k))
    p.addQuadCurve(to: CGPoint(x: cx - r, y: cy), control: CGPoint(x: cx - k, y: cy - k))
    p.addQuadCurve(to: CGPoint(x: cx, y: cy + r), control: CGPoint(x: cx - k, y: cy + k))
    ctx.addPath(p); ctx.setFillColor(color); ctx.fillPath()
}
sparkle(360, 300, 26, coral)

let img = ctx.makeImage()!
let out = URL(fileURLWithPath: CommandLine.arguments[1])
let dest = CGImageDestinationCreateWithURL(out as CFURL, UTType.png.identifier as CFString, 1, nil)!
CGImageDestinationAddImage(dest, img, nil)
CGImageDestinationFinalize(dest)
print("wrote \(out.path)")
