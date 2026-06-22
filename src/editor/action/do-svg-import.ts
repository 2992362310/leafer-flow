import { Path, Group, Text, type IUI } from "leafer";
import type Editor from "../editor";

export function doImportSVG(editor: Editor): Promise<{ success: boolean; message: string }> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".svg,image/svg+xml";
    input.style.display = "none";
    document.body.appendChild(input);

    input.onchange = async () => {
      const file = input.files?.[0];
      document.body.removeChild(input);

      if (!file) {
        resolve({ success: false, message: "未选择文件" });
        return;
      }

      try {
        const svgText = await file.text();
        const element = parseSVGToElement(svgText, file.name);

        if (!element) {
          resolve({ success: false, message: "无法解析 SVG 文件" });
          return;
        }

        editor.app.tree.add(element);
        editor.app.editor.select(element);
        editor.commitMutation();

        resolve({ success: true, message: `已导入 SVG: ${file.name}` });
      } catch (error) {
        console.error("导入 SVG 失败", error);
        resolve({
          success: false,
          message: "导入失败: " + (error instanceof Error ? error.message : "未知错误"),
        });
      }
    };

    input.oncancel = () => {
      document.body.removeChild(input);
      resolve({ success: false, message: "已取消" });
    };

    input.click();
  });
}

function parseSVGToElement(svgText: string, fileName: string): IUI | null {
  // 解析 SVG 获取尺寸和路径
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, "image/svg+xml");
  const svg = doc.querySelector("svg");
  if (!svg) return null;

  // 获取 SVG 尺寸
  const viewBox = svg.getAttribute("viewBox");
  let svgWidth = 200;
  let svgHeight = 200;

  if (viewBox) {
    const parts = viewBox.split(/[\s,]+/).map(Number);
    if (parts.length === 4) {
      svgWidth = parts[2];
      svgHeight = parts[3];
    }
  } else {
    const w = svg.getAttribute("width");
    const h = svg.getAttribute("height");
    if (w) svgWidth = parseFloat(w);
    if (h) svgHeight = parseFloat(h);
  }

  // 收集所有路径
  const paths: string[] = [];

  // 处理 <path> 元素
  svg.querySelectorAll("path").forEach((pathEl) => {
    const d = pathEl.getAttribute("d");
    if (d) paths.push(d);
  });

  // 处理基本形状并转换为路径
  svg.querySelectorAll("rect").forEach((rect) => {
    const x = parseFloat(rect.getAttribute("x") || "0");
    const y = parseFloat(rect.getAttribute("y") || "0");
    const w = parseFloat(rect.getAttribute("width") || "0");
    const h = parseFloat(rect.getAttribute("height") || "0");
    const rx = parseFloat(rect.getAttribute("rx") || "0");
    const ry = parseFloat(rect.getAttribute("ry") || String(rx));

    if (w > 0 && h > 0) {
      if (rx > 0 || ry > 0) {
        const r = Math.min(rx || ry, w / 2, h / 2);
        paths.push(
          `M${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} L${x + r},${y + h} Q${x},${y + h} ${x},${y + h - r} L${x},${y + r} Q${x},${y} ${x + r},${y} Z`
        );
      } else {
        paths.push(`M${x},${y} L${x + w},${y} L${x + w},${y + h} L${x},${y + h} Z`);
      }
    }
  });

  svg.querySelectorAll("circle").forEach((circle) => {
    const cx = parseFloat(circle.getAttribute("cx") || "0");
    const cy = parseFloat(circle.getAttribute("cy") || "0");
    const r = parseFloat(circle.getAttribute("r") || "0");
    if (r > 0) {
      paths.push(`M${cx - r},${cy} A${r},${r} 0 1,0 ${cx + r},${cy} A${r},${r} 0 1,0 ${cx - r},${cy} Z`);
    }
  });

  svg.querySelectorAll("ellipse").forEach((ellipse) => {
    const cx = parseFloat(ellipse.getAttribute("cx") || "0");
    const cy = parseFloat(ellipse.getAttribute("cy") || "0");
    const rx = parseFloat(ellipse.getAttribute("rx") || "0");
    const ry = parseFloat(ellipse.getAttribute("ry") || "0");
    if (rx > 0 && ry > 0) {
      paths.push(`M${cx - rx},${cy} A${rx},${ry} 0 1,0 ${cx + rx},${cy} A${rx},${ry} 0 1,0 ${cx - rx},${cy} Z`);
    }
  });

  svg.querySelectorAll("polygon").forEach((polygon) => {
    const points = polygon.getAttribute("points");
    if (points) {
      const coords = points.trim().split(/[\s,]+/).map(Number);
      if (coords.length >= 4) {
        let d = `M${coords[0]},${coords[1]}`;
        for (let i = 2; i < coords.length; i += 2) {
          d += ` L${coords[i]},${coords[i + 1]}`;
        }
        d += " Z";
        paths.push(d);
      }
    }
  });

  svg.querySelectorAll("polyline").forEach((polyline) => {
    const points = polyline.getAttribute("points");
    if (points) {
      const coords = points.trim().split(/[\s,]+/).map(Number);
      if (coords.length >= 4) {
        let d = `M${coords[0]},${coords[1]}`;
        for (let i = 2; i < coords.length; i += 2) {
          d += ` L${coords[i]},${coords[i + 1]}`;
        }
        paths.push(d);
      }
    }
  });

  svg.querySelectorAll("line").forEach((line) => {
    const x1 = parseFloat(line.getAttribute("x1") || "0");
    const y1 = parseFloat(line.getAttribute("y1") || "0");
    const x2 = parseFloat(line.getAttribute("x2") || "0");
    const y2 = parseFloat(line.getAttribute("y2") || "0");
    paths.push(`M${x1},${y1} L${x2},${y2}`);
  });

  if (paths.length === 0) return null;

  // 创建 Leafer Path 元素
  const combinedPath = paths.join(" ");

  // 获取 SVG 的 stroke 和 fill
  const svgFill = svg.getAttribute("fill") || "none";
  const svgStroke = svg.getAttribute("stroke") || "#333";
  const svgStrokeWidth = parseFloat(svg.getAttribute("stroke-width") || "1");

  const pathElement = new Path({
    path: combinedPath,
    fill: svgFill === "none" ? "transparent" : svgFill,
    stroke: svgStroke === "none" ? "#333" : svgStroke,
    strokeWidth: svgStrokeWidth || 1,
  });

  // 缩放到合适大小（最大 300px）
  const maxSize = 300;
  let scale = 1;
  if (svgWidth > maxSize || svgHeight > maxSize) {
    scale = Math.min(maxSize / svgWidth, maxSize / svgHeight);
  }

  const finalWidth = Math.round(svgWidth * scale);
  const finalHeight = Math.round(svgHeight * scale);

  // 创建 Group 包裹路径和名称文本
  const name = fileName.replace(/\.svg$/i, "");
  const group = new Group({
    x: 200,
    y: 200,
    width: finalWidth,
    height: finalHeight,
    editable: true,
    name: name || "SVG 图形",
    children: [
      pathElement,
      new Text({
        x: 4,
        y: 4,
        width: Math.max(finalWidth - 8, 0),
        height: Math.max(finalHeight - 8, 0),
        text: name || "SVG",
        fill: "#666",
        fontSize: 12,
        textAlign: "center",
        verticalAlign: "middle",
        visible: finalWidth > 60 && finalHeight > 40,
      }),
    ],
  });

  return group;
}
