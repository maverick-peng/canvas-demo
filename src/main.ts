import './style.css';
import bgImage from './assets/bg.png';

import { fromEvent, switchMap, takeUntil, tap } from 'rxjs';

var canvas = document.querySelector<HTMLCanvasElement>('canvas')!;
var context = canvas.getContext('2d')!;
canvas.width = 600;
canvas.height = 400;

let scale = 1.0;

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

// drag
fromEvent<MouseEvent>(canvas, 'mousedown')
  .pipe(
    tap((event) => {
      mouse.bounds = canvas.getBoundingClientRect();
      mouse.screenX = event.clientX - mouse.bounds.left;
      mouse.screenY = event.clientY - mouse.bounds.top;
      mouse.realX = screenToRealX(mouse.screenX);
      mouse.realY = screenToRealY(mouse.screenY);
      console.log(mouse);
    }),
    switchMap(() =>
      fromEvent<MouseEvent>(canvas, 'mousemove').pipe(
        tap((innerEvent) => {
          const lastX = mouse.realX;
          const lastY = mouse.realY;

          mouse.bounds = canvas.getBoundingClientRect();
          mouse.screenX = innerEvent.clientX - mouse.bounds.left;
          mouse.screenY = innerEvent.clientY - mouse.bounds.top;
          mouse.realX = screenToRealX(mouse.screenX);
          mouse.realY = screenToRealY(mouse.screenY);

          const dx = mouse.realX - lastX;
          const dy = mouse.realY - lastY;
          originX -= dx;
          originY -= dy;
          mouse.realX = screenToRealX(mouse.screenX);
          mouse.realY = screenToRealY(mouse.screenY);

          render();
        }),
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

      mouse.bounds = canvas.getBoundingClientRect();
      mouse.screenX = event.clientX - mouse.bounds.left;
      mouse.screenY = event.clientY - mouse.bounds.top;
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
  )
  .subscribe();

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
  context.drawImage(
    image,
    realToScreenX(0),
    realToScreenY(0),
    zoom(image.naturalWidth),
    zoom(image.naturalHeight)
  );
  context.beginPath();
  context.rect(realToScreenX(50), realToScreenY(50), zoom(100), zoom(100));
  context.fillStyle = 'skyblue';
  context.fill();

  context.beginPath();
  context.arc(
    realToScreenX(350),
    realToScreenY(250),
    zoom(50),
    0,
    2 * Math.PI,
    false
  );
  context.fillStyle = 'green';
  context.fill();

  // window.requestAnimationFrame(render);
}
