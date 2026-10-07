import { Camera, Vector, getCameraBounds } from 'ecslime-engine';

export const drawGrid = (
    ctx: CanvasRenderingContext2D,
    camera: Camera,
    zoom: number,
    showGrid: boolean,
    gridSize: number,
) => {
    if (!showGrid) return;

    const bounds = getCameraBounds(camera);
    const startX = Math.floor(bounds.left / gridSize) * gridSize;
    const endX = Math.ceil(bounds.right / gridSize) * gridSize;
    const startY = Math.floor(bounds.bottom / gridSize) * gridSize;
    const endY = Math.ceil(bounds.top / gridSize) * gridSize;

    ctx.save();
    ctx.strokeStyle = 'rgba(218, 230, 240, 0.16)';
    ctx.lineWidth = 1 / zoom;

    for (let y = startY; y <= endY; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(bounds.left, y);
        ctx.lineTo(bounds.right, y);
        ctx.stroke();
    }

    for (let x = startX; x <= endX; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, bounds.bottom);
        ctx.lineTo(x, bounds.top);
        ctx.stroke();
    }

    ctx.restore();
};

export const drawGameBorder = (ctx: CanvasRenderingContext2D, zoom: number, mapWidth: number, mapHeight: number) => {
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2 / zoom;
    ctx.strokeRect(0, 0, mapWidth, mapHeight);

    ctx.save();
    ctx.translate(0, mapHeight + 10 / zoom);
    ctx.scale(1, -1);
    ctx.fillStyle = 'red';
    ctx.font = `${18 / zoom}px Arial`;
    ctx.fillText('Game border', 0, 0);
    ctx.restore();
};

export const drawMultipleSelection = (
    ctx: CanvasRenderingContext2D,
    zoom: number,
    start: Vector | null,
    current: Vector,
) => {
    if (!start) return;

    const left = Math.min(start.x, current.x);
    const right = Math.max(start.x, current.x);
    const bottom = Math.min(start.y, current.y);
    const top = Math.max(start.y, current.y);

    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2 / zoom;
    ctx.strokeRect(left, bottom, right - left, top - bottom);
};
