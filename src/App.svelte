<script lang="ts">
  import mermaid from 'mermaid';
  import { onMount } from 'svelte';

  // State
  let code = $state(`graph TD;
    A-->B;
    B-->C;
    C-->A;`);
  let errorMessage = $state('');
  let scale = $state(1);
  let panX = $state(0);
  let panY = $state(0);
  let isDragging = $state(false);
  let dragStart = $state({ x: 0, y: 0 });
  let zoomRatioText = $state('Zoom: 100%');

  // Element references
  let editorTextarea: HTMLTextAreaElement;
  let lineNumbersDiv: HTMLDivElement;
  let previewDiv: HTMLDivElement;

  // Computed line numbers
  let lineNumbers = $derived(() => {
    const lines = code.replace(/\r/g, '').split('\n');
    const count = Math.max(lines.length, 1);
    return Array.from({ length: count }, (_, i) => i + 1);
  });

  // Update zoom ratio display
  function updateZoomRatio() {
    const svgEl = previewDiv?.querySelector('svg');
    let percent = 100;
    if (svgEl && svgEl.viewBox?.baseVal?.width) {
      const renderedWidth = svgEl.getBoundingClientRect().width;
      const intrinsicWidth = svgEl.viewBox.baseVal.width;
      percent = Math.round((renderedWidth / intrinsicWidth) * 100);
    }
    zoomRatioText = `Zoom: ${percent}%`;
  }

  // Apply transform to preview
  function applyTransform() {
    const svgWrap = previewDiv?.querySelector('.svg-wrap') as HTMLElement;
    if (svgWrap) {
      svgWrap.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
      svgWrap.style.transformOrigin = 'center center';
      updateZoomRatio();
    }
  }

  // Render Mermaid diagram
  async function renderMermaid(diagramCode: string) {
    // Don't render if preview div isn't ready
    if (!previewDiv) {
      console.log('Preview div not ready');
      return;
    }

    let errorMsg = '';

    try {
      // Use mermaid.render() to get the SVG
      const { svg } = await mermaid.render('mermaid-diagram', diagramCode);

      console.log('Mermaid rendered successfully');

      // Insert the SVG into the preview
      previewDiv.innerHTML = `<div class="svg-wrap">${svg}</div>`;
      previewDiv.style.overflow = 'hidden';
      previewDiv.style.display = 'flex';
      previewDiv.style.alignItems = 'center';
      previewDiv.style.justifyContent = 'center';

      // Reset zoom and pan
      scale = 1;
      panX = 0;
      panY = 0;

      // Fix SVG sizing
      requestAnimationFrame(() => {
        const svgWrap = previewDiv?.querySelector('.svg-wrap') as HTMLElement;
        const svgEl = previewDiv?.querySelector('svg') as SVGElement;

        if (svgEl) {
          svgEl.removeAttribute('width');
          svgEl.removeAttribute('height');
          svgEl.removeAttribute('style');
        }

        if (svgWrap) {
          svgWrap.style.width = '100%';
          svgWrap.style.height = '100%';
          svgWrap.style.maxWidth = '100%';
          svgWrap.style.maxHeight = '100%';
          svgWrap.style.overflow = 'visible';
          svgWrap.style.display = 'flex';
          svgWrap.style.alignItems = 'center';
          svgWrap.style.justifyContent = 'center';

          if (svgEl) {
            svgEl.removeAttribute('width');
            svgEl.removeAttribute('height');
            svgEl.style.width = 'auto';
            svgEl.style.height = 'auto';
            svgEl.style.maxWidth = '100%';
            svgEl.style.maxHeight = '100%';
          }
        }

        applyTransform();
        updateZoomRatio();
      });

      errorMessage = '';
    } catch (err: any) {
      errorMsg = err?.str || err?.message || (typeof err === 'string' ? err : JSON.stringify(err));
      errorMessage = errorMsg;
      previewDiv.innerHTML = '';
      console.error('Mermaid render error:', err);
    }
  }

  // Handle Tab key in editor
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = editorTextarea.selectionStart;
      const end = editorTextarea.selectionEnd;
      code = code.substring(0, start) + '\t' + code.substring(end);
      // Restore cursor position
      requestAnimationFrame(() => {
        editorTextarea.selectionStart = editorTextarea.selectionEnd = start + 1;
      });
    }
  }

  // Handle wheel zoom (centered, not following cursor)
  function handleWheel(e: WheelEvent) {
    e.preventDefault();
    const delta = Math.sign(e.deltaY);
    scale *= delta > 0 ? 0.9 : 1.1;
    scale = Math.max(0.2, Math.min(scale, 5));
    applyTransform();
  }

  // Handle mouse drag start
  function handleMouseDown(e: MouseEvent) {
    if (e.button !== 0) return;
    isDragging = true;
    dragStart = { x: e.clientX - panX, y: e.clientY - panY };
  }

  // Handle mouse move (global)
  function handleMouseMove(e: MouseEvent) {
    if (!isDragging) return;
    panX = e.clientX - dragStart.x;
    panY = e.clientY - dragStart.y;
    applyTransform();
  }

  // Handle mouse up (global)
  function handleMouseUp() {
    isDragging = false;
  }

  // Reset zoom and pan
  function resetZoom() {
    scale = 1;
    panX = 0;
    panY = 0;
    applyTransform();
  }

  // Watch code changes (only after mount)
  let mounted = $state(false);
  $effect(() => {
    if (mounted && previewDiv) {
      renderMermaid(code);
    }
  });

  // Setup global mouse listeners
  onMount(() => {
    // Initialize Mermaid
    mermaid.initialize({ startOnLoad: false });

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    // Mark as mounted (this will trigger $effect to render)
    mounted = true;

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  });
</script>

<div class="font-sans h-screen overflow-hidden flex flex-col p-6">
  <h1 class="text-xl font-bold mb-4 text-center shrink-0">Mermaid Editor</h1>

  <div class="flex flex-col md:flex-row w-full max-w-6xl mx-auto gap-4 flex-1 min-h-0">
    <div class="flex flex-row gap-4 w-full h-full min-h-0">
      <!-- Editor Section -->
      <div class="flex flex-col flex-1 h-full min-h-0">
        <div class="flex flex-row items-center mb-2 shrink-0" style="height:48px;">
          <label for="editor" class="font-semibold">Code Editor</label>
        </div>

        <div class="flex flex-row w-full flex-1 min-h-0">
          <div
            bind:this={lineNumbersDiv}
            class="text-right pr-2 pt-4 select-none text-gray-400 bg-gray-50 border-l border-t border-b rounded-l-lg shrink-0"
            style="min-width:2.5em;"
          >
            {#each lineNumbers() as lineNum}
              <div>{lineNum}</div>
            {/each}
          </div>

          <textarea
            id="editor"
            bind:this={editorTextarea}
            bind:value={code}
            onkeydown={handleKeyDown}
            class="flex-1 h-full font-mono border rounded-r-lg p-4 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-0"
          ></textarea>
        </div>

        <div
          class="mt-2 min-h-16 max-h-40 overflow-auto wrap-break-word text-red-500 text-sm shrink-0"
        >
          {errorMessage}
        </div>
      </div>

      <!-- Preview Section -->
      <div class="flex flex-col flex-1 h-full min-h-0">
        <div class="flex flex-row items-center mb-2 justify-between shrink-0" style="height:48px;">
          <span class="font-semibold">Diagram Preview</span>
          <button
            type="button"
            class="text-xs text-gray-500 ml-2 cursor-pointer hover:text-gray-700 bg-transparent border-0 p-0"
            onclick={resetZoom}
          >
            {zoomRatioText}
          </button>
          <div class="flex gap-2">
            <button class="bg-blue-500 text-white px-4 py-2 rounded">
              Export SVG
            </button>
            <button class="bg-green-500 text-white px-4 py-2 rounded">
              Export PNG
            </button>
          </div>
        </div>

        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <div
          bind:this={previewDiv}
          onwheel={handleWheel}
          onmousedown={handleMouseDown}
          role="application"
          aria-label="Mermaid diagram preview with zoom and pan"
          class="border rounded-lg bg-white dark:bg-gray-900 flex-1 w-full overflow-hidden flex items-center justify-center min-h-0 cursor-grab"
          class:cursor-grabbing={isDragging}
        ></div>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <footer class="mt-4 pt-4 border-t text-center text-gray-600 text-sm shrink-0">
    <div class="flex items-center justify-center gap-4 flex-wrap">
      <a
        href="https://github.com/gkoos/mermaid-editor"
        target="_blank"
        rel="noopener noreferrer"
        class="text-blue-600 hover:text-blue-800 underline"
      >
        View on GitHub
      </a>
      <span class="text-gray-400">•</span>
      <a
        href="https://www.buymeacoffee.com/gkoos"
        target="_blank"
        rel="noopener noreferrer"
        class="text-yellow-600 hover:text-yellow-700 underline flex items-center gap-1"
      >
        <span>☕</span>
        <span>Buy me a coffee</span>
      </a>
    </div>
  </footer>
</div>

<!-- TODO: Export SVG functionality -->
<!-- TODO: Export PNG functionality -->
<!-- TODO: Touch support for mobile -->
