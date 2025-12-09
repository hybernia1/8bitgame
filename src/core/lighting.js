export function renderLighting(ctx, canvas, camera, sources) {
  if (!sources.length) return;

  ctx.save();
  ctx.fillStyle = 'rgba(2, 2, 4, 0.9)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = 'destination-out';

  sources.forEach((source) => {
    const screenX = source.x - camera.x;
    const screenY = source.y - camera.y;
    const radius = source.radius;
    const innerRadius = radius * 0.35;
    const gradient = ctx.createRadialGradient(screenX, screenY, innerRadius, screenX, screenY, radius);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
    gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.4)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
}
