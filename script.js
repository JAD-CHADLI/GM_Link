document.addEventListener('DOMContentLoaded', () => {
    // --- SETUP: CANVASES, AUDIO, AND STATE ---
    const bgCanvas = document.getElementById('particle-canvas'), bgCtx = bgCanvas.getContext('2d');
    const trailCanvas = document.getElementById('trail-canvas'), trailCtx = trailCanvas.getContext('2d');
    const electricCanvas = document.querySelector('.eb-canvas'), electricCtx = electricCanvas.getContext('2d');
    const electricContainer = document.querySelector('.electric-border');
    const perspectiveWrap = document.querySelector('.perspective-wrap');

    const audioLoad = document.getElementById('audio-load');
    const audioHover = document.getElementById('audio-hover');
    const audioAmbient = document.getElementById('audio-ambient');
    
    let canvases = [bgCanvas, trailCanvas];
    canvases.forEach(c => { c.width = window.innerWidth; c.height = window.innerHeight; });

    const mouse = { x: null, y: null, isDown: false };
    
    // --- EVENT LISTENERS ---
    window.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; handleParallax(e); });
    window.addEventListener('mouseout', () => { mouse.x = null; mouse.y = null; });
    window.addEventListener('mousedown', () => { mouse.isDown = true; });
    window.addEventListener('mouseup', () => { mouse.isDown = false; flingParticles(); });
    // Play sounds after first user interaction
    const playSounds = () => {
        audioLoad.play().catch(e => console.error("Audio play failed:", e));
        audioAmbient.play().catch(e => console.error("Audio play failed:", e));
        document.body.removeEventListener('mousemove', playSounds);
    };
    document.body.addEventListener('mousemove', playSounds);

    // --- ANIMATION SYSTEM 1: BACKGROUND PARTICLES & GRAVITY WELL ---
    let bgParticles = [];
    class BGParticle {
        constructor(x, y, dX, dY, size, color) { this.x=x; this.y=y; this.directionX=dX; this.directionY=dY; this.size=size; this.color=color; this.originalSize=size; }
        draw() { bgCtx.beginPath(); bgCtx.arc(this.x, this.y, this.size, 0, Math.PI * 2); bgCtx.fillStyle = this.color; bgCtx.fill(); }
        update() {
            if (this.x > bgCanvas.width + 20 || this.x < -20 || this.y > bgCanvas.height + 20 || this.y < -20) {
                 this.x = Math.random() * innerWidth; this.y = Math.random() * innerHeight; this.size = this.originalSize;
            }
            if (mouse.isDown && mouse.x) { // Gravity Well
                const dx = this.x - mouse.x, dy = this.y - mouse.y, dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 1) { this.directionX -= dx / dist / 2; this.directionY -= dy / dist / 2; }
            }
            this.x += this.directionX; this.y += this.directionY; this.draw();
        }
    }
    function initBGParticles() {
        bgParticles = []; let num = (bgCanvas.width * bgCanvas.height) / 9000;
        for (let i = 0; i < num; i++) {
            let size = (Math.random() * 2) + 1, x = Math.random() * innerWidth, y = Math.random() * innerHeight;
            let dX = (Math.random() * 0.4) - 0.2, dY = (Math.random() * 0.4) - 0.2;
            bgParticles.push(new BGParticle(x, y, dX, dY, size, Math.random() > 0.3 ? '#ff6529' : '#ffb92e'));
        }
    }
    function flingParticles() { bgParticles.forEach(p => { const dx = p.x - mouse.x, dy = p.y - mouse.y; const dist = Math.sqrt(dx*dx+dy*dy); p.directionX = (dx / dist) * (200 / dist); p.directionY = (dy / dist) * (200 / dist); }); }
    function drawConnections() { for (let a = 0; a < bgParticles.length; a++) for (let b = a; b < bgParticles.length; b++) { let dist = ((bgParticles[a].x-bgParticles[b].x)**2)+((bgParticles[a].y-bgParticles[b].y)**2); if(dist<(bgCanvas.width/7)**2){ let op = 1-(dist/20000); bgCtx.strokeStyle=`rgba(255,101,41,${op})`; bgCtx.lineWidth=1; bgCtx.beginPath(); bgCtx.moveTo(bgParticles[a].x,bgParticles[a].y); bgCtx.lineTo(bgParticles[b].x,bgParticles[b].y); bgCtx.stroke(); }}}

    // --- ANIMATION SYSTEM 2: CURSOR TRAIL ---
    let trailParticles = [];
    class TrailParticle { constructor(x,y){this.x=x;this.y=y;this.size=Math.random()*3+1;this.speedX=Math.random()*2-1;this.speedY=Math.random()*2-1;this.color=`hsl(${Math.random()*30+10},100%,50%)`;this.life=1}update(){this.x+=this.speedX;this.y+=this.speedY;this.life-=0.04;if(this.size>0.1)this.size-=0.07}draw(){trailCtx.fillStyle=this.color;trailCtx.globalAlpha=this.life;trailCtx.beginPath();trailCtx.arc(this.x,this.y,this.size,0,Math.PI*2);trailCtx.fill();trailCtx.globalAlpha=1} }

    // --- ANIMATION SYSTEM 3: ELECTRIC BORDER ---
    const eConfig = { color: getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim(), speed: 1, chaos: 0.12, borderRadius: 100, displacement: 60, borderOffset: 60 };
    let eTime = 0;
    const eRand=(x)=>(Math.sin(x*12.9898)*43758.5453)%1;const eNoise2D=(x,y)=>{const i=Math.floor(x),j=Math.floor(y),fx=x-i,fy=y-j,a=eRand(i+j*57),b=eRand(i+1+j*57),c=eRand(i+(j+1)*57),d=eRand(i+1+(j+1)*57),ux=fx*fx*(3-2*fx),uy=fy*fy*(3-2*fy);return a*(1-ux)*(1-uy)+b*ux*(1-uy)+c*(1-ux)*uy+d*ux*uy};const eOctaveNoise=(x,oct,lac,gain,amp,freq,time,seed,flat)=>{let y=0,a=amp,f=freq;for(let i=0;i<oct;i++){y+=(i===0?a*flat:a)*eNoise2D(f*x+seed*100,time*f*0.3);f*=lac;a*=gain}return y};const getCorner=(cX,cY,r,sA,aL,p)=>{const ang=sA+p*aL;return{x:cX+r*Math.cos(ang),y:cY+r*Math.sin(ang)}};const getRectPoint=(t,l,top,w,h,r)=>{const sW=w-2*r,sH=h-2*r,cA=(Math.PI*r)/2,tP=2*(sW+sH)+4*cA;let p=t*tP,acc=0;if(p<=(acc+=sW))return{x:l+r+(p-(acc-sW)),y:top};if(p<=(acc+=cA))return getCorner(l+w-r,top+r,r,-Math.PI/2,Math.PI/2,(p-(acc-cA))/cA);if(p<=(acc+=sH))return{x:l+w,y:top+r+(p-(acc-sH))};if(p<=(acc+=cA))return getCorner(l+w-r,top+h-r,r,0,Math.PI/2,(p-(acc-cA))/cA);if(p<=(acc+=sW))return{x:l+w-r-(p-(acc-sW)),y:top+h};if(p<=(acc+=cA))return getCorner(l+r,top+h-r,r,Math.PI/2,Math.PI/2,(p-(acc-cA))/cA);if(p<=(acc+=sH))return{x:l,y:top+h-r-(p-(acc-sH))};return getCorner(l+r,top+r,r,Math.PI,Math.PI/2,(p-acc)/cA)};
    let eWidth, eHeight; const updateElectricCanvasSize=()=>{const rect=electricContainer.getBoundingClientRect();eWidth=rect.width+eConfig.borderOffset*2;eHeight=rect.height+eConfig.borderOffset*2;const dpr=Math.min(window.devicePixelRatio||1,2);electricCanvas.width=eWidth*dpr;electricCanvas.height=eHeight*dpr;electricCanvas.style.width=`${eWidth}px`;electricCanvas.style.height=`${eHeight}px`;electricCtx.scale(dpr,dpr)};
    function drawElectricBorder(deltaTime) { eTime+=deltaTime*eConfig.speed;const dpr=Math.min(window.devicePixelRatio||1,2);electricCtx.setTransform(1,0,0,1,0,0);electricCtx.clearRect(0,0,electricCanvas.width,electricCanvas.height);electricCtx.scale(dpr,dpr);electricCtx.strokeStyle=eConfig.color;electricCtx.lineWidth=1;electricCtx.lineCap='round';electricCtx.lineJoin='round';const bW=eWidth-2*eConfig.borderOffset,bH=eHeight-2*eConfig.borderOffset;const r=Math.min(eConfig.borderRadius,Math.min(bW,bH)/2);const sC=Math.floor(2*(bW+bH)/2.5);electricCtx.beginPath();for(let i=0;i<=sC;i++){const p=i/sC;const pt=getRectPoint(p,eConfig.borderOffset,eConfig.borderOffset,bW,bH,r);const xN=eOctaveNoise(p*8,10,1.6,0.7,eConfig.chaos,10,eTime,0,0),yN=eOctaveNoise(p*8,10,1.6,0.7,eConfig.chaos,10,eTime,1,0);const dX=pt.x+xN*eConfig.displacement,dY=pt.y+yN*eConfig.displacement;i===0?electricCtx.moveTo(dX,dY):electricCtx.lineTo(dX,dY)}electricCtx.closePath();electricCtx.stroke();}
    const eResizeObserver=new ResizeObserver(()=>updateElectricCanvasSize());
    eResizeObserver.observe(electricContainer);

    // --- OTHER INTERACTIVE EFFECTS ---
    const letters = "#!<>-_\\/[]{}—=+*^?#";
    document.querySelectorAll('.link-button').forEach(button => {
        const textEl = button.querySelector('.link-text');
        textEl.dataset.original = textEl.innerText;
        button.addEventListener('mouseenter', () => {
            audioHover.currentTime = 0; audioHover.play();
            let iter = 0;
            const interval = setInterval(() => {
                textEl.innerText = textEl.innerText.split("").map((_, idx) => (idx < iter) ? textEl.dataset.original[idx] : letters[Math.floor(Math.random() * letters.length)]).join("");
                if (iter >= textEl.dataset.original.length) clearInterval(interval);
                iter += 1/3;
            }, 30);
        });
        button.addEventListener('mouseleave', () => { textEl.innerText = textEl.dataset.original; });
    });

    // --- NEW: 3D PARALLAX TILT ---
    function handleParallax(e) {
        if (!e) { electricContainer.style.transform = ''; canvases.forEach(c => c.style.transform = ''); return; }
        const x = (e.clientX / window.innerWidth - 0.5) * 2;
        const y = (e.clientY / window.innerHeight - 0.5) * 2;
        const tiltX = y * -8; // Max rotation in degrees
        const tiltY = x * 8;
        const parallaxX = x * -25; // Max translation in pixels
        const parallaxY = y * -25;
        electricContainer.style.transform = `rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
        canvases.forEach(c => c.style.transform = `translateX(${parallaxX}px) translateY(${parallaxY}px)`);
    }
    perspectiveWrap.addEventListener('mouseleave', () => handleParallax(null));

    // --- MAIN ANIMATION LOOP ---
    let lastTime = 0;
    function mainLoop(currentTime) {
        const deltaTime = (currentTime - lastTime) / 1000;
        lastTime = currentTime;

        bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
        bgParticles.forEach(p => p.update());
        drawConnections();

        trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
        if (mouse.x) { for (let i = 0; i < 2; i++) trailParticles.push(new TrailParticle(mouse.x, mouse.y)); }
        for (let i = trailParticles.length - 1; i >= 0; i--) {
            trailParticles[i].update(); trailParticles[i].draw();
            if (trailParticles[i].life <= 0) trailParticles.splice(i, 1);
        }

        drawElectricBorder(deltaTime);

        requestAnimationFrame(mainLoop);
    }

    // --- INITIALIZATION ---
    initBGParticles();
    updateElectricCanvasSize();
    requestAnimationFrame(mainLoop);
    window.addEventListener('resize', () => {
        canvases.forEach(c => { c.width = window.innerWidth; c.height = window.innerHeight; });
        initBGParticles(); updateElectricCanvasSize();
    });
});
