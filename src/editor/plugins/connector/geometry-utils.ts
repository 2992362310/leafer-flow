// Geometry Utilities for Connector Plugin (Phase3+)
// 仅包含矩形/多边形通用点线段运算；未来可拆分。

export interface Point { x: number; y: number }
export interface Segment { a: Point; b: Point }

export const EPS = 1e-6

export function distance2(a: Point, b: Point): number {
    const dx = a.x - b.x; const dy = a.y - b.y; return dx * dx + dy * dy
}

export function projectPointToSegment(p: Point, seg: Segment): { point: Point; t: number; dist2: number } {
    const ax = seg.a.x, ay = seg.a.y, bx = seg.b.x, by = seg.b.y
    const abx = bx - ax, aby = by - ay
    const abLen2 = abx * abx + aby * aby
    if (abLen2 < EPS) return { point: { ...seg.a }, t: 0, dist2: distance2(p, seg.a) }
    const apx = p.x - ax, apy = p.y - ay
    let t = (apx * abx + apy * aby) / abLen2
    if (t < 0) t = 0; else if (t > 1) t = 1
    const proj = { x: ax + abx * t, y: ay + aby * t }
    return { point: proj, t, dist2: distance2(p, proj) }
}

// 线段与无界射线( p1->p2 )的交点（若在线段上返回点，否则 null）
export function lineIntersection(p1: Point, p2: Point, p3: Point, p4: Point): Point | null {
    const x1 = p1.x, y1 = p1.y, x2 = p2.x, y2 = p2.y
    const x3 = p3.x, y3 = p3.y, x4 = p4.x, y4 = p4.y
    const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
    if (Math.abs(den) < EPS) return null
    const px = ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / den
    const py = ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / den
    // 射线参数 tRay >=0, 线段参数 u in [0,1]
    const tRayNum = (px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)
    const rayDirLen2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1)
    if (rayDirLen2 < EPS) return null
    const tRay = tRayNum / rayDirLen2
    if (tRay < 0) return null
    // 检查是否在线段内
    const segLen2 = (x4 - x3) * (x4 - x3) + (y4 - y3) * (y4 - y3)
    const tSegNum = (px - x3) * (x4 - x3) + (py - y3) * (y4 - y3)
    const tSeg = segLen2 < EPS ? 0 : tSegNum / segLen2
    if (tSeg < -EPS || tSeg > 1 + EPS) return null
    return { x: px, y: py }
}

export function polygonEdges(points: Point[]): Segment[] {
    const segs: Segment[] = []
    for (let i = 0; i < points.length; i++) {
        const a = points[i]; const b = points[(i + 1) % points.length]
        segs.push({ a, b })
    }
    return segs
}

export function aabbOfPoints(points: Point[]): { minX: number; maxX: number; minY: number; maxY: number } {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const p of points) {
        if (p.x < minX) minX = p.x
        if (p.x > maxX) maxX = p.x
        if (p.y < minY) minY = p.y
        if (p.y > maxY) maxY = p.y
    }
    return { minX, maxX, minY, maxY }
}

// 矩形中心射线锚点（未旋转特殊情况下 corners 为 axis-aligned 顺时针）
export function centerRayAnchor(corners: Point[], center: Point, ref: Point): Point {
    let vx = ref.x - center.x, vy = ref.y - center.y
    if (Math.abs(vx) + Math.abs(vy) < EPS) { vx = 1; vy = 0 }
    const rayEnd = { x: center.x + vx, y: center.y + vy }
    const edges = polygonEdges(corners)
    let best: { pt: Point; d2: number } | null = null
    for (const e of edges) {
        const pt = lineIntersection(center, rayEnd, e.a, e.b)
        if (!pt) continue
        const d2 = distance2(center, pt)
        if (!best || d2 < best.d2) best = { pt, d2 }
    }
    return best ? best.pt : ref
}

export function projectToClosestEdge(p: Point, corners: Point[]): Point {
    const edges = polygonEdges(corners)
    let best: { point: Point; dist2: number } | null = null
    for (const e of edges) {
        const proj = projectPointToSegment(p, e)
        if (!best || proj.dist2 < best.dist2) best = { point: proj.point, dist2: proj.dist2 }
    }
    return best!.point
}
