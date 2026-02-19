/**
 * Enterprise PDF Reader Engine
 * v1.0.0
 */

// 1. VARIABLE CONFIGURATION: Change your file location here
const PDF_PATH = 'DA/DA.pdf'; 

let pdfDoc = null,
    pageNum = 1,
    pageIsRendering = false,
    pageNumIsPending = null,
    scale = 1.0,
    canvas = document.querySelector('#pdf-render'),
    ctx = canvas.getContext('2d');

/**
 * Render the requested page
 */
const renderPage = num => {
    pageIsRendering = true;
    document.getElementById('canvas-wrapper').classList.add('rendering');

    // Fetch the page
    pdfDoc.getPage(num).then(page => {
        const viewport = page.getViewport({ scale });
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderCtx = {
            canvasContext: ctx,
            viewport: viewport
        };

        const renderTask = page.render(renderCtx);

        renderTask.promise.then(() => {
            pageIsRendering = false;
            document.getElementById('canvas-wrapper').classList.remove('rendering');

            if (pageNumIsPending !== null) {
                renderPage(pageNumIsPending);
                pageNumIsPending = null;
            }
        });

        // UI Updates
        document.querySelector('#page-num').textContent = num;
        document.querySelector('#zoom-percent').textContent = `${Math.round(scale * 100)}%`;
    });
};

/**
 * Handle state during rendering to prevent race conditions
 */
const queueRenderPage = num => {
    if (pageIsRendering) {
        pageNumIsPending = num;
    } else {
        renderPage(num);
    }
};

// Navigation Functions
const onPrevPage = () => {
    if (pageNum <= 1) return;
    pageNum--;
    queueRenderPage(pageNum);
};

const onNextPage = () => {
    if (pageNum >= pdfDoc.numPages) return;
    pageNum++;
    queueRenderPage(pageNum);
};

// Zoom Functions
const zoomIn = () => {
    scale += 0.25;
    queueRenderPage(pageNum);
};

const zoomOut = () => {
    if (scale <= 0.5) return;
    scale -= 0.25;
    queueRenderPage(pageNum);
};

// Jump to Page Logic
const handleJump = () => {
    const input = document.getElementById('jump-to-page');
    const targetPage = parseInt(input.value);
    if (targetPage > 0 && targetPage <= pdfDoc.numPages) {
        pageNum = targetPage;
        queueRenderPage(pageNum);
        input.value = ''; // clear input
    }
};

// Initialization: Load Document
pdfjsLib.getDocument(PDF_PATH).promise.then(pdfDoc_ => {
    pdfDoc = pdfDoc_;
    document.querySelector('#page-count').textContent = pdfDoc.numPages;
    renderPage(pageNum);
}).catch(err => {
    console.error("PDF Load Error: ", err);
    const main = document.querySelector('main');
    main.innerHTML = `<div class="bg-red-900 border border-red-500 p-4 rounded text-white">
        Error loading PDF (${PDF_PATH}). Please ensure the file exists.
    </div>`;
});

// Event Listeners
document.querySelector('#prev-page').addEventListener('click', onPrevPage);
document.querySelector('#next-page').addEventListener('click', onNextPage);
document.querySelector('#zoom-in').addEventListener('click', zoomIn);
document.querySelector('#zoom-out').addEventListener('click', zoomOut);
document.querySelector('#go-to-page').addEventListener('click', handleJump);

// Perceptual Anchor: Keyboard Support for "Book" feel
window.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') onNextPage();
    if (e.key === 'ArrowLeft') onPrevPage();
});