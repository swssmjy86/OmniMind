import Foundation
import CoreGraphics
import ImageIO
import CoreText
import UniformTypeIdentifiers

// Usage: swift brand.swift profile <out.png>   |   swift brand.swift wordmark <out.png>
let mode = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "profile"
let outPath = CommandLine.arguments.count > 2 ? CommandLine.arguments[2] : "out.png"

let cs = CGColorSpace(name: CGColorSpace.sRGB)!
func c(_ r: Double, _ g: Double, _ b: Double, _ a: Double = 1) -> CGColor {
    CGColor(colorSpace: cs, components: [CGFloat(r), CGFloat(g), CGFloat(b), CGFloat(a)])!
}
let greenLight = c(0.16, 0.36, 0.30)
let greenDark  = c(0.07, 0.18, 0.15)
let cream      = c(0.976, 0.945, 0.882)
let creamDim   = c(0.949, 0.886, 0.804)
let coral      = c(0.910, 0.573, 0.490)

// Draw the crescent + constellation mark into ctx, centered at (cx,cy), scaled by `s` (1.0 = 1024 canvas).
func drawMark(_ ctx: CGContext, cx: CGFloat, cy: CGFloat, s: CGFloat, onDark: Bool, punch: (CGRect) -> Void) {
    let moonR = 300 * s, cutR = 292 * s
    let moonC = CGPoint(x: cx - 18*s, y: cy)
    let cutC  = CGPoint(x: moonC.x + 128*s, y: cy)   // horizontal offset → symmetric upright crescent
    // moon disc
    ctx.saveGState()
    ctx.addEllipse(in: CGRect(x: moonC.x - moonR, y: moonC.y - moonR, width: moonR*2, height: moonR*2))
    ctx.clip()
    let mg = CGGradient(colorsSpace: cs, colors: [cream, creamDim] as CFArray, locations: [0,1])!
    ctx.drawLinearGradient(mg, start: CGPoint(x: cx, y: cy + moonR), end: CGPoint(x: cx, y: cy - moonR), options: [])
    ctx.restoreGState()
    // punch cutout (caller redraws background there)
    ctx.saveGState()
    let cutRect = CGRect(x: cutC.x - cutR, y: cutC.y - cutR, width: cutR*2, height: cutR*2)
    ctx.addEllipse(in: cutRect); ctx.clip()
    punch(cutRect)
    ctx.restoreGState()
    // constellation nestled in the opening (right of moon)
    let nodes: [(CGFloat, CGFloat, CGFloat, CGColor)] = [
        (cx + 118*s, cy - 96*s, 15*s, cream),
        (cx + 190*s, cy + 4*s,  27*s, coral),
        (cx + 250*s, cy - 84*s, 13*s, coral),
        (cx + 150*s, cy + 118*s, 17*s, cream),
    ]
    ctx.setStrokeColor(c(0.976,0.945,0.882, 0.5)); ctx.setLineWidth(6*s)
    ctx.setLineCap(.round); ctx.setLineJoin(.round)
    let line = CGMutablePath()
    line.move(to: CGPoint(x: nodes[0].0, y: nodes[0].1))
    line.addLine(to: CGPoint(x: nodes[1].0, y: nodes[1].1))
    line.addLine(to: CGPoint(x: nodes[2].0, y: nodes[2].1))
    line.move(to: CGPoint(x: nodes[1].0, y: nodes[1].1))
    line.addLine(to: CGPoint(x: nodes[3].0, y: nodes[3].1))
    ctx.addPath(line); ctx.strokePath()
    for n in nodes { ctx.setFillColor(n.3); ctx.fillEllipse(in: CGRect(x: n.0-n.2, y: n.1-n.2, width: n.2*2, height: n.2*2)) }
    // sparkle on the moon body
    func sparkle(_ x: CGFloat, _ y: CGFloat, _ r: CGFloat, _ col: CGColor) {
        let p = CGMutablePath(); let k = r*0.28
        p.move(to: CGPoint(x: x, y: y+r))
        p.addQuadCurve(to: CGPoint(x: x+r, y: y), control: CGPoint(x: x+k, y: y+k))
        p.addQuadCurve(to: CGPoint(x: x, y: y-r), control: CGPoint(x: x+k, y: y-k))
        p.addQuadCurve(to: CGPoint(x: x-r, y: y), control: CGPoint(x: x-k, y: y-k))
        p.addQuadCurve(to: CGPoint(x: x, y: y+r), control: CGPoint(x: x-k, y: y+k))
        ctx.addPath(p); ctx.setFillColor(col); ctx.fillPath()
    }
    sparkle(cx - 150*s, cy - 150*s, 22*s, coral)
}

func drawDeepGreenBG(_ ctx: CGContext, _ rect: CGRect) {
    let grad = CGGradient(colorsSpace: cs, colors: [greenLight, greenDark] as CFArray, locations: [0,1])!
    ctx.saveGState(); ctx.addRect(rect); ctx.clip()
    ctx.drawLinearGradient(grad, start: CGPoint(x: rect.minX, y: rect.maxY), end: CGPoint(x: rect.maxX, y: rect.minY), options: [])
    let glow = CGGradient(colorsSpace: cs, colors: [c(0.24,0.47,0.40,1), c(0.13,0.30,0.25,0)] as CFArray, locations: [0,1])!
    ctx.drawRadialGradient(glow, startCenter: CGPoint(x: rect.midX, y: rect.midY), startRadius: 0,
                           endCenter: CGPoint(x: rect.midX, y: rect.midY), endRadius: rect.width*0.52, options: [])
    ctx.restoreGState()
}

func writePNG(_ img: CGImage, _ path: String) {
    let url = URL(fileURLWithPath: path)
    let dest = CGImageDestinationCreateWithURL(url as CFURL, UTType.png.identifier as CFString, 1, nil)!
    CGImageDestinationAddImage(dest, img, nil)
    CGImageDestinationFinalize(dest)
    print("wrote \(path)")
}

if mode == "profile" {
    let S = 1024
    // RGBA (premultiplied) — fully opaque background, but keeps an alpha channel so the
    // resulting PNG works with strict decoders (e.g. Next.js .ico requires RGBA).
    let ctx = CGContext(data: nil, width: S, height: S, bitsPerComponent: 8, bytesPerRow: 0,
                        space: cs, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
    let rect = CGRect(x: 0, y: 0, width: S, height: S)
    drawDeepGreenBG(ctx, rect)
    drawMark(ctx, cx: 512, cy: 512, s: 1.0, onDark: true) { _ in drawDeepGreenBG(ctx, rect) }
    writePNG(ctx.makeImage()!, outPath)
} else if mode == "wordmark" {
    // Transparent horizontal lockup: circular mark chip + "옴니마인드" in deep green.
    let W = 1600, H = 460
    let ctx = CGContext(data: nil, width: W, height: H, bitsPerComponent: 8, bytesPerRow: 0,
                        space: cs, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
    ctx.clear(CGRect(x: 0, y: 0, width: W, height: H))
    // circular deep-green chip with the mark, left
    let markSize: CGFloat = 380
    let markCx: CGFloat = 40 + markSize/2, markCy: CGFloat = CGFloat(H)/2
    ctx.saveGState()
    ctx.addEllipse(in: CGRect(x: markCx-markSize/2, y: markCy-markSize/2, width: markSize, height: markSize))
    ctx.clip()
    let chipRect = CGRect(x: markCx-markSize/2, y: markCy-markSize/2, width: markSize, height: markSize)
    drawDeepGreenBG(ctx, chipRect)
    let s = markSize/1024.0
    drawMark(ctx, cx: markCx, cy: markCy, s: s, onDark: true) { _ in drawDeepGreenBG(ctx, chipRect) }
    ctx.restoreGState()
    // wordmark text "옴니마인드" — CoreText attribute keys (no AppKit needed)
    let text = "옴니마인드"
    let font = CTFontCreateWithName("AppleSDGothicNeo-Bold" as CFString, 190, nil)
    let variant = CommandLine.arguments.count > 3 ? CommandLine.arguments[3] : "dark"  // dark=green text
    let textColor = variant == "light" ? cream : c(0.16, 0.35, 0.29)
    let attrs: [CFString: Any] = [
        kCTFontAttributeName: font,
        kCTForegroundColorAttributeName: textColor
    ]
    let attr = CFAttributedStringCreate(kCFAllocatorDefault, text as CFString, attrs as CFDictionary)!
    let ctLine = CTLineCreateWithAttributedString(attr)
    var ascent: CGFloat = 0, descent: CGFloat = 0, leading: CGFloat = 0
    let tw = CTLineGetTypographicBounds(ctLine, &ascent, &descent, &leading)
    let tx = markCx + markSize/2 + 56
    let ty = markCy - (ascent - descent)/2
    ctx.textPosition = CGPoint(x: tx, y: ty)
    CTLineDraw(ctLine, ctx)
    _ = tw
    writePNG(ctx.makeImage()!, outPath)
}
