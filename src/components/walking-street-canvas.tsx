"use client";
import { useEffect, useRef } from "react";
import type { WalkState } from "@/services/walking-scene";
export default function WalkingStreetCanvas({
  state,
  shaded,
  mallName,
  paused,
}: {
  state: WalkState;
  shaded: boolean;
  mallName?: string;
  paused: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null),
    latest = useRef({ state, shaded, mallName, paused });
  latest.current = { state, shaded, mallName, paused };
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let frame = 0,
      stopped = false;
    const draw = () => {
      if (stopped) return;
      const box = canvas.getBoundingClientRect(),
        w = box.width,
        h = box.height,
        dpr = Math.min(devicePixelRatio || 1, 2);
      if (
        canvas.width !== Math.round(w * dpr) ||
        canvas.height !== Math.round(h * dpr)
      ) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const { state: s, shaded: shade, mallName: name } = latest.current,
        indoor = s.phase === "indoors" || s.phase === "exit",
        moving = indoor ? s.indoorMetres : s.metres,
        hy = h * 0.42,
        f = w * 0.78;
      const project = (x: number, y: number, z: number): [number, number] => [
        w / 2 + (x * f) / (z + 8),
        hy + ((1.65 - y) * f) / (z + 8),
      ];
      const polygon = (
        points: [number, number][],
        fill: string,
        stroke?: string,
      ) => {
        ctx.beginPath();
        points.forEach((p, i) => (i ? ctx.lineTo(...p) : ctx.moveTo(...p)));
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
        if (stroke) {
          ctx.strokeStyle = stroke;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      };
      const face = (
        points: [number, number, number][],
        fill: string,
        stroke?: string,
      ) =>
        polygon(
          points.map((p) => project(...p)),
          fill,
          stroke,
        );
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, indoor ? "#d5d9da" : "#dce3e5");
      sky.addColorStop(0.5, "#f8f9f7");
      sky.addColorStop(1, "#d8deda");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);
      if (indoor) {
        ctx.fillStyle = "#eceeec";
        ctx.fillRect(0, hy, w, h - hy);
        face(
          [
            [-7, 0, 0],
            [-7, 0, 100],
            [-7, 6, 100],
            [-7, 6, 0],
          ],
          "#d1d5d3",
          "#aeb7b2",
        );
        face(
          [
            [7, 0, 0],
            [7, 6, 0],
            [7, 6, 100],
            [7, 0, 100],
          ],
          "#bfc6c2",
          "#9ba8a1",
        );
        face(
          [
            [-7, 6, 0],
            [7, 6, 0],
            [7, 6, 100],
            [-7, 6, 100],
          ],
          "#f5f6f2",
        );
        for (let z = 100; z > 1; z -= 8) {
          const q = (((z - moving) % 100) + 100) % 100;
          if (q < 2) continue;
          face(
            [
              [-7, 0, q],
              [7, 0, q],
              [7, 0, q + 0.08],
              [-7, 0, q + 0.08],
            ],
            "#b4bfba",
          );
          face(
            [
              [-3, 5.9, q],
              [3, 5.9, q],
              [3, 5.9, q + 1],
              [-3, 5.9, q + 1],
            ],
            "#fff",
          );
          for (const side of [-1, 1])
            face(
              [
                [side * 6.98, 0.2, q],
                [side * 6.98, 3.8, q],
                [side * 6.98, 3.8, q + 5],
                [side * 6.98, 0.2, q + 5],
              ],
              "#748b82",
              "#f7faf8",
            );
        }
        const exitZ = Math.max(3, 75 - s.indoorMetres);
        face(
          [
            [-3, 0, exitZ],
            [3, 0, exitZ],
            [3, 4, exitZ],
            [-3, 4, exitZ],
          ],
          "#f9fffc",
          "#59776b",
        );
        const sign = project(0, 4.8, exitZ);
        ctx.fillStyle = "#176f5b";
        ctx.textAlign = "center";
        ctx.font = `bold ${Math.max(13, Math.min(28, 200 / (exitZ + 8)))}px sans-serif`;
        ctx.fillText("EXIT →", sign[0], sign[1]);
      } else {
        ctx.fillStyle = "#c3cbc7";
        ctx.fillRect(0, hy, w, h - hy);
        face(
          [
            [-5, 0, 0],
            [5, 0, 0],
            [5, 0, 180],
            [-5, 0, 180],
          ],
          "#ecefe9",
        );
        face(
          [
            [-18, -0.03, 0],
            [-7, -0.03, 0],
            [-7, -0.03, 180],
            [-18, -0.03, 180],
          ],
          "#9fa9a4",
        );
        for (let i = 18; i >= 0; i--) {
          const z = ((((i * 13 - moving * 0.7) % 247) + 247) % 247) + 5,
            height = 7 + ((i * 7) % 15),
            wide = 4 + (i % 3);
          for (const side of [-1, 1]) {
            const x = side * (7 + (i % 3));
            face(
              [
                [x, 0, z],
                [x, 0, z + 10],
                [x, height, z + 10],
                [x, height, z],
              ],
              side < 0 ? "#c2c9c5" : "#b0bbb5",
              "#8d9a93",
            );
            face(
              [
                [x, 0, z],
                [x + side * wide, 0, z],
                [x + side * wide, height, z],
                [x, height, z],
              ],
              "#e9ece8",
              "#aab5ae",
            );
            for (let floor = 2; floor < height - 1; floor += 2.8) {
              face(
                [
                  [x + side * 0.6, floor, z - 0.02],
                  [x + side * (wide - 0.6), floor, z - 0.02],
                  [x + side * (wide - 0.6), floor + 1.1, z - 0.02],
                  [x + side * 0.6, floor + 1.1, z - 0.02],
                ],
                "#86968d",
              );
            }
          }
        }
        for (let i = 14; i >= 0; i--) {
          const z = ((((i * 14 - moving) % 210) + 210) % 210) + 1;
          face(
            [
              [-0.06, 0.015, z],
              [0.06, 0.015, z],
              [0.06, 0.015, z + 5],
              [-0.06, 0.015, z + 5],
            ],
            "#9ab8a7",
          );
          if (shade) {
            face(
              [
                [-5, 0.025, z],
                [-1, 0.025, z],
                [5, 0.025, z + 9],
                [1, 0.025, z + 9],
              ],
              "rgba(49,67,58,.29)",
            );
            face(
              [
                [1, 0.03, z + 9],
                [5, 0.03, z + 9],
                [5, 0.03, z + 12],
                [3, 0.03, z + 12],
              ],
              "rgba(49,67,58,.2)",
            );
          }
        }
        // A crossing is illustrative scenery, not an asserted surveyed crossing.
        const crossing = (((120 - moving) % 160) + 160) % 160;
        for (let i = 0; i < 6; i++)
          face(
            [
              [-4 + i * 1.4, 0.04, crossing],
              [-3.25 + i * 1.4, 0.04, crossing],
              [-3.25 + i * 1.4, 0.04, crossing + 4],
              [-4 + i * 1.4, 0.04, crossing + 4],
            ],
            "#f8faf7",
          );
        if (name && (s.phase === "choice" || (s.branch && s.metres < 130))) {
          const z = s.phase === "choice" ? 15 : 30;
          face(
            [
              [-7, 0, z],
              [7, 0, z],
              [7, 8, z],
              [-7, 8, z],
            ],
            "#d9dfda",
            "#718579",
          );
          face(
            [
              [-6, 6.4, z - 0.1],
              [6, 6.4, z - 0.1],
              [6, 7.7, z - 0.1],
              [-6, 7.7, z - 0.1],
            ],
            "#233e33",
          );
          const sign = project(0, 6.8, z - 0.2);
          ctx.fillStyle = "white";
          ctx.textAlign = "center";
          ctx.font = `600 ${Math.min(27, w / 30)}px sans-serif`;
          ctx.fillText(name, sign[0], sign[1], w * 0.52);
          face(
            [
              [-1.8, 0, z - 0.1],
              [1.8, 0, z - 0.1],
              [1.8, 4, z - 0.1],
              [-1.8, 4, z - 0.1],
            ],
            "#738e7e",
            "#fff",
          );
          const door = project(0, 3, z - 0.2);
          ctx.fillStyle = "white";
          ctx.font = "bold 14px sans-serif";
          ctx.fillText("ENTRANCE", door[0], door[1]);
        }
      }
      // A clear floor arrow keeps the walking direction legible on small screens.
      polygon(
        [
          [w * 0.5, h * 0.7],
          [w * 0.46, h * 0.77],
          [w * 0.485, h * 0.77],
          [w * 0.485, h * 0.86],
          [w * 0.515, h * 0.86],
          [w * 0.515, h * 0.77],
          [w * 0.54, h * 0.77],
        ],
        indoor ? "#7b66a0" : "#167964",
      );
      frame = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
    };
  }, []);
  return (
    <canvas
      ref={ref}
      className="walking-street-canvas"
      aria-label="Generated first-person walking scene with illustrative buildings, path and shadows"
    />
  );
}
