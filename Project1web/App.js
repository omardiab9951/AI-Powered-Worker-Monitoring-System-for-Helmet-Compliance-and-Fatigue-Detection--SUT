/* app.js — Main interaction script for SUT AI Helmet & Fatigue Detection demo
   Features implemented:
   - Sidebar mobile toggle
   - Navigation helpers (links are plain pages)
   - Demo request form with localStorage (first/last/email/phone)
   - FAQ: click question to reveal answer panel
   - Helmet & Fatigue demo pages: upload, camera, run simulated detection, draw boxes on overlay, logs
   - Camera management (start/stop), file preview handling

   NOTE: The project included sample screenshot assets at the following local paths (already used in HTML):
     /mnt/data/Screenshot 2025-11-26 002524.png (SUT logo)
     /mnt/data/Screenshot 2025-11-26 002551.png (preview)
     /mnt/data/Screenshot 2025-11-26 002541.png (helmet)
     /mnt/data/Screenshot 2025-11-26 002533.png (fatigue)
   Keep these files in place or update the HTML image src accordingly.
*/

// Short selectors
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

let cameraStream = null;

function safeGet(id){ return document.getElementById(id); }

// =========================
// Sidebar / mobile menu
// =========================
function initSidebar(){
  const menuToggle = document.getElementById('menuToggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');

  if(!sidebar || !menuToggle) return;

  // Ensure closed state is consistent on load for small screens
  if(window.innerWidth <= 980) sidebar.classList.add('closed');

  menuToggle.addEventListener('click', () => {
    const isClosed = sidebar.classList.toggle('closed');

    // overlay only for mobile/tablet
    if(window.innerWidth <= 980){
      if(isClosed){
        overlay.classList.remove('active');
      } else {
        overlay.classList.add('active');
      }
    } else {
      // On desktop ensure overlay is hidden
      overlay.classList.remove('active');
    }
  });

  // clicking overlay should close sidebar
  if(overlay){
    overlay.addEventListener('click', () => {
      sidebar.classList.add('closed');
      overlay.classList.remove('active');
    });
  }

  // When resizing, make sure sidebar behaves correctly
  window.addEventListener('resize', () => {
    if(window.innerWidth > 980){
      // ensure sidebar visible on large screens
      sidebar.classList.remove('closed');
      overlay.classList.remove('active');
      sidebar.style.display = ''; // restore if we changed it
    } else {
      // keep it closed by default on small screens
      sidebar.classList.add('closed');
      overlay.classList.remove('active');
    }
  });

  // Optional: after close transition, make sure no accidental whitespace remains
  sidebar.addEventListener('transitionend', (ev) => {
    // if it's closed and the transition was on flex-basis/width, keep pointer-events none
    if(sidebar.classList.contains('closed')){
      sidebar.style.pointerEvents = 'none';
    } else {
      sidebar.style.pointerEvents = '';
    }
  });
}

// =========================
// Demo request form (localStorage)
// =========================
function initDemoForm(){
  const form = safeGet('requestDemoForm');
  if(!form) return;
  const fields = ['firstName','lastName','email','phone'];
  fields.forEach(k=>{
    const el = safeGet(k);
    if(!el) return;
    const saved = localStorage.getItem('demo_' + k);
    if(saved) el.value = saved;
    el.addEventListener('input', (e)=> localStorage.setItem('demo_' + k, e.target.value));
  });

  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const notify = safeGet('demoNotify');
    const first = safeGet('firstName').value.trim();
    const last = safeGet('lastName').value.trim();
    const email = safeGet('email').value.trim();
    const phone = safeGet('phone').value.trim();
    if(!first || !last || !email || !phone){
      if(notify){ notify.className = 'message'; notify.textContent = 'Please fill all fields.'; notify.style.background = '#fff3cd'; }
      return;
    }
    if(notify){ notify.className = 'message'; notify.textContent = 'Sending demo request...'; notify.style.background = '#eef2ff'; }
    setTimeout(()=>{
      if(notify){ notify.textContent = `Thanks ${first}! We'll contact you at ${email}.`; notify.style.background = '#ecfdf5'; }
    },850);
  });

  const clearBtn = safeGet('clearDemo');
  if(clearBtn) clearBtn.addEventListener('click', ()=>{
    fields.forEach(k=>{ localStorage.removeItem('demo_' + k); const el = safeGet(k); if(el) el.value = ''; });
    const notify = safeGet('demoNotify'); if(notify){ notify.className='hidden'; notify.textContent=''; }
  });
}

// =========================
// FAQ interaction
// =========================
function initFAQ(){
  const questions = $$('.question');
  if(!questions.length) return;
  questions.forEach(q => {
    q.addEventListener('click', ()=>{
      const ansId = q.dataset.answer;
      if(!ansId) return;
      // hide all
      const panels = qsa = $$('.faq-answer > div');
      panels.forEach(p => p.classList.add('hidden'));
      const target = document.getElementById(ansId);
      if(target){ target.classList.remove('hidden'); target.scrollIntoView({behavior:'smooth', block:'start'}); target.animate([{opacity:0, transform:'translateY(8px)'},{opacity:1, transform:'translateY(0)'}], {duration:420, easing:'ease-out'}); }
    });
  });
}

// =========================
// Utilities for detection UI
// =========================
function resizeCanvasToElement(canvas, el){
  const rect = el.getBoundingClientRect();
  canvas.width = Math.max(1, Math.floor(rect.width));
  canvas.height = Math.max(1, Math.floor(rect.height));
}

function clearCanvas(canvas){
  const ctx = canvas.getContext('2d'); ctx.clearRect(0,0,canvas.width,canvas.height);
}

// simulated detector: draws a few boxes with labels
function simulateDetectionsOnCanvas(canvas, labels){
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const count = Math.random() > 0.4 ? Math.floor(Math.random()*3)+1 : 0;
  for(let i=0;i<count;i++){
    const rw = 0.12*canvas.width + Math.random()*0.28*canvas.width;
    const rh = rw*0.6;
    const x = Math.random()*(canvas.width - rw);
    const y = Math.random()*(canvas.height - rh);
    ctx.lineWidth = Math.max(2, Math.round(canvas.width/200));
    ctx.strokeStyle = 'rgba(15,162,177,0.95)';
    ctx.fillStyle = 'rgba(12,49,78,0.85)';
    ctx.strokeRect(x,y,rw,rh);
    ctx.fillRect(x, y-26, Math.min(160, rw), 26);
    ctx.fillStyle = '#fff';
    ctx.font = '14px Inter, Arial';
    const label = labels && labels.length ? labels[Math.floor(Math.random()*labels.length)] : (Math.random()>0.4?'Helmet':'No Helmet');
    const score = Math.floor((0.6 + Math.random()*0.4)*100);
    ctx.fillText(`${label} (${score}%)`, x+8, y-8);
  }
  return count;
}

// draw boxes for a provided detection list (normalized coords) - useful if you integrate real model
function drawDetections(canvas, detections){
  const ctx = canvas.getContext('2d'); ctx.clearRect(0,0,canvas.width,canvas.height);
  detections.forEach(det=>{
    const rx = det.x * canvas.width; const ry = det.y * canvas.height;
    const rw = det.w * canvas.width; const rh = det.h * canvas.height;
    ctx.lineWidth = Math.max(2, Math.round(canvas.width/200));
    ctx.strokeStyle = 'rgba(15,162,177,0.95)';
    ctx.fillStyle = 'rgba(12,49,78,0.85)';
    ctx.strokeRect(rx,ry,rw,rh);
    ctx.fillRect(rx, ry-26, Math.min(160, rw), 26);
    ctx.fillStyle = '#fff'; ctx.font = '14px Inter, Arial';
    ctx.fillText(`${det.label} (${Math.round(det.score*100)}%)`, rx+8, ry-8);
  });
}

// =========================
// Camera helpers
// =========================
async function startCamera(videoEl, facingMode='environment'){
  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('Camera not supported');
  cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode } });
  videoEl.srcObject = cameraStream;
  await videoEl.play();
}
function stopCamera(videoEl){
  if(cameraStream){ cameraStream.getTracks().forEach(t=>t.stop()); cameraStream = null; }
  if(videoEl){ videoEl.pause(); videoEl.srcObject = null; }
}

// capture current frame from video into an offscreen canvas and return ImageData or Canvas
function captureFrame(videoEl){
  const c = document.createElement('canvas');
  c.width = videoEl.videoWidth || videoEl.clientWidth;
  c.height = videoEl.videoHeight || videoEl.clientHeight;
  const ctx = c.getContext('2d');
  ctx.drawImage(videoEl, 0, 0, c.width, c.height);
  return c;
}

// =========================
// Page-specific wiring
// =========================
function initHelmetPage(){
  const fileInput = safeGet('fileInput');
  const camBtn = safeGet('camBtn');
  const runBtn = safeGet('runBtn');
  const clearBtn = safeGet('clearBtn');
  const preview = safeGet('preview');
  const video = safeGet('video');
  const overlay = safeGet('overlay');
  const logArea = safeGet('logArea');
  const latest = safeGet('latest');
  const countEl = safeGet('count');

  if(!overlay) return;

  // ensure overlay matches preview size
  function fit(){
    const target = (video && video.style.display !== 'none') ? video : preview;
    if(!target) return;
    resizeCanvasToElement(overlay, target);
  }
  window.addEventListener('resize', fit);

  // File upload
  if(fileInput){
    fileInput.addEventListener('change', e=>{
      const f = e.target.files && e.target.files[0];
      if(!f) return;
      stopCamera(video);
      const url = URL.createObjectURL(f);
      preview.src = url; preview.style.display = 'block';
      if(video) video.style.display = 'none';
      setTimeout(()=>{ fit(); }, 200);
      if(logArea) logArea.innerHTML = `<div>${new Date().toLocaleTimeString()} - Loaded image ${f.name}</div>` + logArea.innerHTML;
    });
  }

  // Camera
  if(camBtn && video){
    camBtn.addEventListener('click', async ()=>{
      if(cameraStream){ stopCamera(video); video.style.display='none'; preview.style.display='block'; return; }
      try{
        await startCamera(video, 'environment');
        video.style.display = 'block'; preview.style.display = 'none';
        fit();
        if(logArea) logArea.innerHTML = `<div>${new Date().toLocaleTimeString()} - Camera started</div>` + logArea.innerHTML;
      }catch(err){ if(logArea) logArea.innerHTML = `<div>Camera error: ${err.message}</div>` + logArea.innerHTML; }
    });
  }

  // Clear
  if(clearBtn){ clearBtn.addEventListener('click', ()=>{ clearCanvas(overlay); if(logArea) logArea.innerHTML = `<div>${new Date().toLocaleTimeString()} - Cleared</div>` + logArea.innerHTML; latest.textContent='—'; countEl.textContent='0'; }); }

  // Run detection (simulated)
  if(runBtn){
    runBtn.addEventListener('click', async ()=>{
      // make overlay match current preview/video
      const target = (video && video.style.display !== 'none') ? video : preview;
      resizeCanvasToElement(overlay, target);

      // fake latency
      await new Promise(r=>setTimeout(r, 380));
      const labels = ['Helmet','No Helmet'];
      const count = simulateDetectionsOnCanvas(overlay, labels);
      if(countEl) countEl.textContent = count;
      if(latest) latest.textContent = count ? (count>1? 'Multiple' : 'Helmet') : 'No detections';
      if(logArea) logArea.innerHTML = `<div>${new Date().toLocaleTimeString()} - Detected ${count} object(s)</div>` + logArea.innerHTML;
    });
  }
}

function initFatiguePage(){
  const fileInput = safeGet('fileFat');
  const camBtn = safeGet('camFat');
  const runBtn = safeGet('runFat');
  const clearBtn = safeGet('clearFat');
  const preview = safeGet('previewFat');
  const video = safeGet('videoFat');
  const overlay = safeGet('overlayFat');
  const logArea = safeGet('logAreaFat');
  const latest = safeGet('latestFat');
  const countEl = safeGet('countFat');

  if(!overlay) return;

  function fit(){
    const target = (video && video.style.display !== 'none') ? video : preview;
    if(!target) return;
    resizeCanvasToElement(overlay, target);
  }
  window.addEventListener('resize', fit);

  if(fileInput){
    fileInput.addEventListener('change', e=>{
      const f = e.target.files && e.target.files[0];
      if(!f) return;
      stopCamera(video);
      const url = URL.createObjectURL(f);
      preview.src = url; preview.style.display = 'block';
      if(video) video.style.display = 'none';
      setTimeout(()=>{ fit(); }, 200);
      if(logArea) logArea.innerHTML = `<div>${new Date().toLocaleTimeString()} - Loaded image ${f.name}</div>` + logArea.innerHTML;
    });
  }

  if(camBtn && video){
    camBtn.addEventListener('click', async ()=>{
      if(cameraStream){ stopCamera(video); video.style.display='none'; preview.style.display='block'; return; }
      try{
        await startCamera(video, 'user');
        video.style.display = 'block'; preview.style.display = 'none';
        fit();
        if(logArea) logArea.innerHTML = `<div>${new Date().toLocaleTimeString()} - Camera started</div>` + logArea.innerHTML;
      }catch(err){ if(logArea) logArea.innerHTML = `<div>Camera error: ${err.message}</div>` + logArea.innerHTML; }
    });
  }

  if(clearBtn){ clearBtn.addEventListener('click', ()=>{ clearCanvas(overlay); if(logArea) logArea.innerHTML = `<div>${new Date().toLocaleTimeString()} - Cleared</div>` + logArea.innerHTML; latest.textContent='—'; countEl.textContent='0'; }); }

  if(runBtn){
    runBtn.addEventListener('click', async ()=>{
      const target = (video && video.style.display !== 'none') ? video : preview;
      resizeCanvasToElement(overlay, target);
      await new Promise(r=>setTimeout(r, 420));
      // labels for fatigue detectors
      const labels = ['Drowsy','Yawning','Alert'];
      const count = simulateDetectionsOnCanvas(overlay, labels);
      if(countEl) countEl.textContent = count;
      if(latest) latest.textContent = count ? (count>1? 'Multiple events' : 'Drowsy') : 'No events';
      if(logArea) logArea.innerHTML = `<div>${new Date().toLocaleTimeString()} - Fatigue check: ${count} event(s)</div>` + logArea.innerHTML;
    });
  }
}

// =========================
// Init all pages
// =========================
function init(){
  try{ initSidebar(); }catch(e){ console.warn('Sidebar init failed', e); }
  try{ initDemoForm(); }catch(e){ /* no form present on this page */ }
  try{ initFAQ(); }catch(e){ /* no faq */ }
  try{ initHelmetPage(); }catch(e){ /* ignore */ }
  try{ initFatiguePage(); }catch(e){ /* ignore */ }

  // helpful console note to developer
  console.info('SUT demo app.js loaded. Logo / screenshots used from local paths:');
  console.info('/mnt/data/Screenshot 2025-11-26 002524.png');
  console.info('/mnt/data/Screenshot 2025-11-26 002551.png');
  console.info('/mnt/data/Screenshot 2025-11-26 002541.png');
  console.info('/mnt/data/Screenshot 2025-11-26 002533.png');
}

// run init when DOM is ready
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
