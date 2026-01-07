/**
 * Exports an SVG element as a PNG file with 2x resolution for better quality
 * @param {SVGSVGElement} svgElement - The SVG element to export
 * @param {string} filename - The filename for the downloaded PNG (default: 'mermaid_diagram.png')
 */
export function exportPNG(
  svgElement: SVGSVGElement,
  filename: string = "mermaid_diagram.png"
): void {
  if (!svgElement) {
    console.error("No SVG element provided for export");
    return;
  }

  // Scale factor for higher resolution export (2x for better quality without huge file sizes)
  const scale = 2;
  const padding = 5;

  // Get the actual content dimensions
  const bbox = svgElement.getBBox();
  const x = bbox.x - padding;
  const y = bbox.y - padding;
  const width = bbox.width + padding * 2;
  const height = bbox.height + padding * 2;

  // Clone the SVG to avoid modifying the original
  const svgClone = svgElement.cloneNode(true) as SVGSVGElement;
  svgClone.removeAttribute("width");
  svgClone.removeAttribute("height");
  svgClone.setAttribute("viewBox", `${x} ${y} ${width} ${height}`);
  svgClone.setAttribute("width", width.toString());
  svgClone.setAttribute("height", height.toString());

  // Serialize the SVG to a string
  const svgData = new XMLSerializer().serializeToString(svgClone);

  // Create a data URL from the SVG
  const svgUrl = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgData);

  // Create an image element to load the SVG
  const img = new Image();
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    console.error("Failed to get 2d context from canvas");
    return;
  }

  img.onload = () => {
    // Set canvas dimensions with scale factor for higher resolution
    canvas.width = width * scale;
    canvas.height = height * scale;

    // Scale the drawing context
    ctx.scale(scale, scale);

    // Draw the image onto the canvas
    ctx.drawImage(img, 0, 0);

    // Convert canvas to PNG data URL
    const pngUrl = canvas.toDataURL("image/png");

    // Create a temporary anchor element to trigger download
    const a = document.createElement("a");
    a.href = pngUrl;
    a.download = filename;
    a.click();
  };

  // Load the SVG into the image
  img.src = svgUrl;
}
