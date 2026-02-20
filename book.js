/**
 * book.js - Enterprise PDF Flip-Book Engine
 * Version: 3.1.0 (Content-Sync Fix)
 */

// --- 1. CONFIGURATION & DYNAMIC PATHS ---
const getBookID = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('book') || 'DA'; 
};

const BOOK_ID = getBookID();
const RESOURCE_PATH = `Resources/${BOOK_ID}`;
let PDF_URL = ''; 
let pdfDoc = null;
let pageFlip = null;
let currentScale = 1.5;

// --- 2. RESOURCE INITIALIZATION ---

window.addEventListener('load', async () => {
    console.log(`%c Initializing Book: ${BOOK_ID} `, "background: #222; color: #bada55");

    try {
        const cacheBuster = `?t=${new Date().getTime()}`;
        const configPath = `${RESOURCE_PATH}/chapters.json${cacheBuster}`;

        const response = await fetch(configPath);
        if (!response.ok) throw new Error(`HTTP ${response.status}: chapters.json not found at ${configPath}`);
        
        const config = await response.json();
        PDF_URL = config.pdfUrl;
        console.log("PDF Source Target:", PDF_URL);

        const select = document.getElementById('chapter-select');
        if (config.chapters) {
            config.chapters.forEach(ch => {
                let opt = new Option(ch.title, ch.page);
                select.add(opt);
            });
        }

        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
        
        const loadingTask = pdfjsLib.getDocument({
            url: PDF_URL,
            cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/cmaps/',
            cMapPacked: true,
        });

        pdfDoc = await loadingTask.promise;
        document.getElementById('page-total').textContent = pdfDoc.numPages;
        console.log("%c PDF Render Engine Ready ", "color: green; font-weight: bold;");

    } catch (err) {
        console.error("Enterprise Loader Error:", err);
        const landing = document.getElementById('landing-page');
        const errDiv = document.createElement('div');
        errDiv.className = "mt-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg font-mono text-sm max-w-xl";
        errDiv.innerHTML = `<strong>Error</strong>: ${err.message}`;
        landing.appendChild(errDiv);
    }
});

// --- 3. 3D BOOK RENDERING LOGIC ---

async function render3DBook() {
    const container = document.getElementById('book-container');
    container.innerHTML = '<div class="p-10 text-stone-500 italic">Generating 3D Pages...</div>';

    const fragment = document.createDocumentFragment();
    const pagesList = [];

    // Create and Render all pages
    for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: currentScale });
        
        const canvas = document.createElement('canvas');
        canvas.className = 'page-canvas';
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const pageDiv = document.createElement('div');
        pageDiv.className = 'page';
        pageDiv.appendChild(canvas);
        fragment.appendChild(pageDiv);
        
        // Push the render promise
        pagesList.push({
            renderPromise: page.render({ canvasContext: context, viewport }).promise,
            element: pageDiv
        });
    }

    // Wait for all canvases to be "painted"
    await Promise.all(pagesList.map(p => p.renderPromise));
    console.log("All pages rendered to memory.");

    container.innerHTML = ''; 
    container.appendChild(fragment);

    // Short timeout to ensure DOM layout is calculated
    setTimeout(() => {
        try {
            pageFlip = new St.PageFlip(container, {
                width: 450, 
                height: 600,
                size: "stretch",
                showCover: true,
                maxShadowOpacity: 0.5,
                usePortrait: false, 
                startPage: 0
            });

            const htmlPages = document.querySelectorAll('.page');
            pageFlip.loadFromHTML(htmlPages);
            
            // Critical fix for white pages: update library state
            pageFlip.updateFromHtml(htmlPages);

            console.log("3D Engine Initialized and Content Visible.");
            document.getElementById('page-num').textContent = pageFlip.getCurrentPageIndex() + 1;
            
        } catch (flipError) {
            console.error("Flip Library Error:", flipError);
            container.innerHTML = `<div class="p-10 text-red-500">Failed to start 3D Engine.</div>`;
        }
    }, 250); 
}

// --- 4. UI INTERACTION ---

document.getElementById('btn-read').addEventListener('click', () => {
    if (!pdfDoc) return;
    document.getElementById('landing-page').classList.add('hidden');
    document.getElementById('reader-page').classList.remove('hidden');
    render3DBook();
});

document.getElementById('btn-back').addEventListener('click', () => {
    window.location.reload();
});

document.getElementById('theme-toggle').addEventListener('click', () => {
    document.body.classList.toggle('theme-dark');
});

document.getElementById('chapter-select').addEventListener('change', (e) => {
    if (pageFlip) pageFlip.flip(parseInt(e.target.value));
});

document.getElementById('z-in').addEventListener('click', () => {
    const book = document.getElementById('book-container');
    const scale = (parseFloat(book.style.transform.replace('scale(', '')) || 1) + 0.1;
    book.style.transform = `scale(${scale})`;
});

document.getElementById('z-out').addEventListener('click', () => {
    const book = document.getElementById('book-container');
    const scale = (parseFloat(book.style.transform.replace('scale(', '')) || 1) - 0.1;
    if (scale >= 0.5) book.style.transform = `scale(${scale})`;
});

window.addEventListener('keydown', (e) => {
    if (!pageFlip) return;
    if (e.key === 'ArrowRight') pageFlip.flipNext();
    if (e.key === 'ArrowLeft') pageFlip.flipPrev();
});