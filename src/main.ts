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

const mouse: Mouse = {
  screenX: 0,
  screenY: 0,
  realX: 0,
  realY: 0,
};

const image = new Image();
image.src = bgImage;
image.onload = function () {
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

      updateScreenCoords(event.clientX, event.clientY);
      mouse.realX = screenToRealX(mouse.screenX);
      mouse.realY = screenToRealY(mouse.screenY);
      console.log(mouse);

      originX = mouse.realX;
      originY = mouse.realY;
      screenOriginX = mouse.screenX;
      screenOriginY = mouse.screenY;

      mouse.realX = screenToRealX(mouse.screenX);
      mouse.realY = screenToRealY(mouse.screenY);

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


      if (event.touches.length === 2) {
        originalDistance = Math.hypot(
          event.touches[0].pageX - event.touches[1].pageX,
          event.touches[0].pageY - event.touches[1].pageY
        );
      }
    }),
    switchMap(event => iif(
      () => event.touches.length === 2,
      // pinch
      fromEvent<TouchEvent>(canvas, 'touchmove').pipe(
        tap(innerEvent => {
          const distance = Math.hypot(
            innerEvent.touches[0].pageX - innerEvent.touches[1].pageX,
            innerEvent.touches[0].pageY - innerEvent.touches[1].pageY
          );

          scale = (distance / originalDistance);

          render();
        }),
        takeUntil(fromEvent(canvas, 'mouseend'))
      ),
      // slide
      fromEvent<TouchEvent>(canvas, 'touchmove').pipe(
        tap(innerEvent => 
          handleDrag(innerEvent.touches[0].clientX, innerEvent.touches[0].clientY)
        ),
        takeUntil(fromEvent(canvas, 'touchend')),
        takeUntil(fromEvent(canvas, 'touchcancel'))
      )
    )),

  ).subscribe();

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


