/* app.js — Updated for Flask Integration */

const $ = (sel) => document.querySelector(sel);

function safeGet(id){ return document.getElementById(id); }

// Sidebar Logic (Unchanged)
function initSidebar(){
  const menuToggle = document.getElementById('menuToggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if(!sidebar || !menuToggle) return;
  
  if(window.innerWidth <= 980) sidebar.classList.add('closed');
  
  menuToggle.addEventListener('click', () => {
    const isClosed = sidebar.classList.toggle('closed');
    if(window.innerWidth <= 980){
      overlay.classList.toggle('active', !isClosed);
    }
  });
  
  if(overlay) overlay.addEventListener('click', () => {
    sidebar.classList.add('closed');
    overlay.classList.remove('active');
  });
}

// =========================
// Fatigue Page Integration (THE FIX)
// =========================
function initFatiguePage(){
  const camBtn = safeGet('camFat');
  const clearBtn = safeGet('clearFat');
  const preview = safeGet('previewFat');    // The default placeholder image
  const container = safeGet('viewerWrapFat'); // The container div
  
  // Check if we are viewing an uploaded video (from the URL query param)
  const urlParams = new URLSearchParams(window.location.search);
  const source = urlParams.get('source');

  // Create or Find the Stream Image Element
  let streamImg = document.getElementById('serverStreamFat');
  if(!streamImg && container){
      streamImg = document.createElement('img');
      streamImg.id = 'serverStreamFat';
      streamImg.style.width = '100%';
      streamImg.style.display = 'none';
      streamImg.style.borderRadius = '8px';
      container.appendChild(streamImg);
  }

  // If a source exists in URL (e.g. after upload), start playing it immediately
  if(source && streamImg) {
      if(preview) preview.style.display = 'none';
      streamImg.src = "/video_feed?source=" + encodeURIComponent(source);
      streamImg.style.display = 'block';
  }

  // "Use Camera" Button Logic
  if(camBtn){
    camBtn.addEventListener('click', () => {
       // 1. Hide the placeholder
       if(preview) preview.style.display = 'none';
       
       // 2. Point the image to the Python webcam feed
       if(streamImg) {
           // Add timestamp to prevent browser caching
           streamImg.src = "/video_feed?source=0&t=" + new Date().getTime();
           streamImg.style.display = 'block';
       }
       
       const logArea = safeGet('logAreaFat');
       if(logArea) logArea.innerHTML = `<div>${new Date().toLocaleTimeString()} - Webcam Started</div>` + logArea.innerHTML;
    });
  }

  // "Stop / Clear" Button Logic
  if(clearBtn){
      clearBtn.addEventListener('click', () => {
          if(streamImg) {
              streamImg.src = ""; // Cut the connection
              streamImg.style.display = 'none';
          }
          if(preview) preview.style.display = 'block'; // Show placeholder
          
          // Clear URL params so refresh doesn't reload the video
          window.history.pushState({}, document.title, window.location.pathname);
      });
  }
}

// Init
function init(){
  try{ initSidebar(); }catch(e){}
  try{ initFatiguePage(); }catch(e){}
}

if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();