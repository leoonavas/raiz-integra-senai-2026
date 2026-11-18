import PDFKit
import AppKit
let a = CommandLine.arguments
let d = PDFDocument(url: URL(fileURLWithPath: a[1]))!
let pages = a.count > 3 ? a[3].split(separator: ",").map { Int($0)! } : Array(1...d.pageCount)
for n in pages {
  guard let p = d.page(at: n-1) else { continue }
  let r = p.bounds(for: .mediaBox); let s: CGFloat = 1.3
  let img = NSImage(size: NSSize(width: r.width*s, height: r.height*s))
  img.lockFocus(); NSColor.white.set(); NSRect(origin: .zero, size: img.size).fill()
  let ctx = NSGraphicsContext.current!.cgContext; ctx.scaleBy(x: s, y: s); p.draw(with: .mediaBox, to: ctx); img.unlockFocus()
  let rep = NSBitmapImageRep(data: img.tiffRepresentation!)!
  try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: "\(a[2])_\(n).png"))
}
print(d.pageCount)
