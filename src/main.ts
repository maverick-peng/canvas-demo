import './style.css';
import bgImage from './assets/bg.png';

import { fromEvent, iif, switchMap, takeUntil, tap } from 'rxjs';

/**
 * Extend CanvasRenderingContext2D class so that it could draw rectangle with rounded corners
 */ 
 CanvasRenderingContext2D.prototype.roundRect = function(x: number, y: number, w: number, h: number, r: number) {
  this.beginPath();
  this.moveTo(x + r, y);
  this.arcTo(x + w, y, x + w, y + h, r);
  this.arcTo(x + w, y + h, x, y + h, r);
  this.arcTo(x, y + h, x, y, r);
  this.arcTo(x, y, x + w, y, r);
  this.fill();
  return this;
}

var canvas = document.querySelector<HTMLCanvasElement>('canvas')!;
var context = canvas.getContext('2d')!;
canvas.width = window.innerWidth * 0.7;
canvas.height = window.innerHeight;

let scale = canvas.width / 1920;

let originX = 0;
let originY = 0;
let screenOriginX = 0;
let screenOriginY = 0;

interface Mouse {
  screenX: number;
  screenY: number;
  realX: number;
  realY: number;
  bounds?: DOMRect;
}

let mouse: Mouse = {
  screenX: 0,
  screenY: 0,
  realX: 0,
  realY: 0,
};

const image = new Image();
image.src = bgImage;
image.onload = function () {
  scale = canvas.width / image.naturalWidth;
  render();
};

/**
 * Update screen coordinates (screenX, screenY) by given client position (clientX, clientY)
 * @param event 
 */
function updateScreenCoords(clientX: number, clientY: number) {
  mouse.bounds = canvas.getBoundingClientRect();
  mouse.screenX = clientX - mouse.bounds.left;
  mouse.screenY = clientY - mouse.bounds.top;
}


function handleDrag(clientX: number, clientY: number) {
  const lastX = mouse.realX;
  const lastY = mouse.realY;

  updateScreenCoords(clientX, clientY);
  mouse.realX = screenToRealX(mouse.screenX);
  mouse.realY = screenToRealY(mouse.screenY);

  const dx = mouse.realX - lastX;
  const dy = mouse.realY - lastY;
  originX -= dx;
  originY -= dy;
  mouse.realX = screenToRealX(mouse.screenX);
  mouse.realY = screenToRealY(mouse.screenY);

  render();
}

function handleZoom(clientX: number, clientY: number) {
  updateScreenCoords(clientX, clientY);

  mouse.realX = screenToRealX(mouse.screenX);
  mouse.realY = screenToRealY(mouse.screenY);

  originX = mouse.realX;
  originY = mouse.realY;
  screenOriginX = mouse.screenX;
  screenOriginY = mouse.screenY;

  mouse.realX = screenToRealX(mouse.screenX);
  mouse.realY = screenToRealY(mouse.screenY);
}

// drag
fromEvent<MouseEvent>(canvas, 'mousedown')
  .pipe(
    tap((event) => {
      updateScreenCoords(event.clientX, event.clientY);
      mouse.realX = screenToRealX(mouse.screenX);
      mouse.realY = screenToRealY(mouse.screenY);
    }),
    switchMap(() =>
      fromEvent<MouseEvent>(canvas, 'mousemove').pipe(
        tap((innerEvent) => 
          handleDrag(innerEvent.clientX, innerEvent.clientY)
        ),
        takeUntil(fromEvent<MouseEvent>(canvas, 'mouseout')),
        takeUntil(fromEvent<MouseEvent>(canvas, 'mouseup'))
      )
    )
  )
  .subscribe();

// wheel
fromEvent<WheelEvent>(canvas, 'wheel', { passive: false })
  .pipe(
    tap((event) => {
      event.preventDefault();

      if (event.deltaY < 0) {
        scale = Math.min(5, scale * 1.1); // zoom in
      } else {
        scale = Math.max(0.1, scale * (1 / 1.1)); // zoom out is inverse of zoom in
      }

      handleZoom(event.clientX, event.clientY);
      render();
    })
  
  
  ).subscribe();

// touch
let originalDistance = 0;
fromEvent<TouchEvent>(canvas, 'touchstart')
  .pipe(
    tap(event => {
      updateScreenCoords(event.touches[0].clientX, event.touches[0].clientY);
      mouse.realX = screenToRealX(mouse.screenX);
      mouse.realY = screenToRealY(mouse.screenY);
    }),
    switchMap(event => {
      
      if (event.touches.length === 2) {
        originalDistance = Math.hypot(
          event.touches[0].clientX - event.touches[1].clientX,
          event.touches[0].clientY - event.touches[1].clientY
        );
      }
      const startScale = scale;

      return iif(
        () => event.touches.length === 2,
        // pinch
        fromEvent<TouchEvent>(canvas, 'touchmove', { passive: false }).pipe(
          tap(innerEvent => {
            const distance = Math.hypot(
              innerEvent.touches[0].clientX - innerEvent.touches[1].clientX,
              innerEvent.touches[0].clientY - innerEvent.touches[1].clientY
            );

            // update scale according to distance of fingers
            scale = startScale * (distance / originalDistance);

            // get the mid-point of two fingers
            const middleX = (innerEvent.touches[0].clientX + innerEvent.touches[1].clientX) / 2;
            const middleY = (innerEvent.touches[0].clientY + innerEvent.touches[1].clientY) / 2;

            handleZoom(middleX, middleY);
            render();
          }),
        ),
        // slide
        fromEvent<TouchEvent>(canvas, 'touchmove').pipe(
          tap(innerEvent => 
            handleDrag(innerEvent.touches[0].clientX, innerEvent.touches[0].clientY)
          )
        )
      ).pipe(
        takeUntil(fromEvent(canvas, 'touchend')),
        takeUntil(fromEvent(canvas, 'touchcancel'))
      )
    }),
  ).subscribe(() => {}, () => {}, () => {
    alert('complete')
  });

/* Coordinates trasformation functions */

// just scale
function zoom(number: number) {
  return Math.floor(number * scale);
}
// converts from world coord to screen pixel coord
function realToScreenX(number: number) {
  return Math.floor((number - originX) * scale + screenOriginX);
}

function realToScreenY(number: number) {
  return Math.floor((number - originY) * scale + screenOriginY);
}

// inverse function converts from screen pixel coord to world coord
function screenToRealX(number: number) {
  return Math.floor((number - screenOriginX) * (1 / scale) + originX);
}

function screenToRealY(number: number) {
  return Math.floor((number - screenOriginY) * (1 / scale) + originY);
}

function render() {
  context.clearRect(0, 0, canvas.width, canvas.height);
  // context.clae

  // draw background
  context.drawImage(
    image,
    realToScreenX(0),
    realToScreenY(0),
    zoom(image.naturalWidth),
    zoom(image.naturalHeight),
    );
  
  // change fill style
  context.fillStyle = 'lineargradiant(0, 0, blue, red)';

  // draw a rectangle with rounded corners
  context.roundRect(realToScreenX(194), realToScreenY(350), zoom(100), zoom(100), zoom(10));
}

fromEvent(window, 'resize').pipe(
  tap(() => {
    canvas.width = window.innerWidth;
    scale = canvas.width / image.naturalWidth;
    resetPosition();
    render();
  })
).subscribe();

function resetPosition() {
  originX = 0;
  originY = 0;
  screenOriginX = 0;
  screenOriginY = 0;
  mouse = {
    screenX: 0,
    screenY: 0,
    realX: 0,
    realY: 0
  }
}

/* Add Buttons */
