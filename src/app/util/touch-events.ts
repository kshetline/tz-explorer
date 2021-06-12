import { Point } from '@tubular/math';

export function getXYForTouchEvent(event: TouchEvent, index = 0): Point {
  const touches = event.touches;

  if (touches.length <= index)
    return { x: -1, y: -1 };

  const rect = (touches[index].target as HTMLElement).getBoundingClientRect();

  return { x: touches[index].clientX - rect.left, y: touches[0].clientY - rect.top };
}

export function getPageXYForTouchEvent(event: TouchEvent, index = 0): Point {
  const result = getXYForTouchEvent(event, index);
  const touches = event.touches;

  if (touches.length > index && touches[index].target) {
    const r = (touches[index].target as HTMLElement).getBoundingClientRect();

    result.x += r.left;
    result.y += r.top;
  }

  return result;
}
