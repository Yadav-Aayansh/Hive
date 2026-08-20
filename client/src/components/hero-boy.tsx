import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const HEAD_PIVOT = { x: 260, y: 302 };

export function HeroBoy({ className }: { className?: string }) {
  const scene = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const node = scene.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const head = node.querySelector<SVGGElement>("[data-head]");
    const eyes = node.querySelector<SVGGElement>("[data-eyes]");
    const body = node.querySelector<SVGGElement>("[data-body]");
    const props = Array.from(node.querySelectorAll<SVGGElement>("[data-depth]"));

    let frame = 0;
    let target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };

    const paint = () => {
      current.x += (target.x - current.x) * 0.12;
      current.y += (target.y - current.y) * 0.12;

      const { x, y } = current;

      head?.setAttribute(
        "transform",
        `translate(${x * 13} ${y * 9}) rotate(${x * 7} ${HEAD_PIVOT.x} ${HEAD_PIVOT.y})`,
      );
      eyes?.setAttribute("transform", `translate(${x * 7} ${y * 5})`);
      body?.setAttribute("transform", `translate(${x * 4} ${y * 2.5})`);

      for (const prop of props) {
        const depth = Number(prop.dataset.depth ?? 1);
        prop.setAttribute(
          "transform",
          `translate(${x * depth * 26} ${y * depth * 18})`,
        );
      }

      const settled =
        Math.abs(target.x - current.x) < 0.001 &&
        Math.abs(target.y - current.y) < 0.001;

      frame = settled ? 0 : requestAnimationFrame(paint);
    };

    const queue = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };

    const onMove = (event: PointerEvent) => {
      const box = node.getBoundingClientRect();
      const cx = box.left + box.width / 2;
      const cy = box.top + box.height * 0.42;

      target = {
        x: Math.max(-1, Math.min(1, (event.clientX - cx) / (window.innerWidth / 2))),
        y: Math.max(-1, Math.min(1, (event.clientY - cy) / (window.innerHeight / 2))),
      };
      queue();
    };

    const onLeave = () => {
      target = { x: 0, y: 0 };
      queue();
    };

    window.addEventListener("pointermove", onMove);
    document.addEventListener("pointerleave", onLeave);

    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <svg
      ref={scene}
      viewBox="0 0 520 470"
      preserveAspectRatio="xMidYMax meet"
      className={cn("size-full", className)}
      role="img"
      aria-label="A student looking around the page"
    >
      <defs>
        <radialGradient id="hb-skin" cx="34%" cy="26%" r="80%">
          <stop offset="0%" stopColor="#ecd3b9" />
          <stop offset="72%" stopColor="#d7ab8f" />
          <stop offset="100%" stopColor="#c69176" />
        </radialGradient>

        <radialGradient id="hb-hair" cx="32%" cy="20%" r="82%">
          <stop offset="0%" stopColor="#6a4b33" />
          <stop offset="100%" stopColor="#402719" />
        </radialGradient>

        <linearGradient id="hb-shirt" x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0%" stopColor="#f29a43" />
          <stop offset="60%" stopColor="#d5661f" />
          <stop offset="100%" stopColor="#b64c1b" />
        </linearGradient>

        <radialGradient id="hb-ear" cx="40%" cy="35%" r="75%">
          <stop offset="0%" stopColor="#d7ab8f" />
          <stop offset="100%" stopColor="#c69176" />
        </radialGradient>

        <filter id="hb-blush" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="7" />
        </filter>

        <filter id="hb-soft" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.5" />
        </filter>
      </defs>

      {/* the halo the character sits in front of */}
      <circle
        cx="260"
        cy="430"
        r="178"
        className="fill-muted-foreground/[0.05]"
      />

      {/* floating props, each drifting at its own depth */}
      <g data-depth="0.85">
        <g className="animate-[hive-float_7s_ease-in-out_infinite] motion-reduce:animate-none">
          <polygon
            points="72,214 103,232 103,268 72,286 41,268 41,232"
            className="fill-muted-foreground/[0.16]"
          />
          <polygon
            points="72,226 93,238 93,262 72,274 51,262 51,238"
            className="fill-muted-foreground/[0.11]"
          />
        </g>
      </g>

      <g data-depth="0.6">
        <g className="animate-[hive-float_9s_ease-in-out_infinite_-2s] motion-reduce:animate-none">
          <path
            d="M416 168 L455 148 L468 206 L429 192 Z"
            className="fill-muted-foreground/[0.16]"
            strokeLinejoin="round"
          />
          <rect
            x="404"
            y="170"
            width="16"
            height="22"
            rx="6"
            className="fill-muted-foreground/[0.19]"
          />
          <path
            d="M474 160 q12 18 0 36"
            className="fill-none stroke-muted-foreground/[0.16]"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </g>
      </g>

      <g data-depth="1">
        <g className="animate-[hive-float_8s_ease-in-out_infinite_-4s] motion-reduce:animate-none">
          <rect
            x="44"
            y="348"
            width="70"
            height="62"
            rx="14"
            className="fill-muted-foreground/[0.16]"
          />
          <rect
            x="44"
            y="348"
            width="70"
            height="18"
            rx="9"
            className="fill-muted-foreground/[0.13]"
          />
          <rect x="60" y="340" width="7" height="16" rx="3.5" className="fill-muted-foreground/[0.19]" />
          <rect x="92" y="340" width="7" height="16" rx="3.5" className="fill-muted-foreground/[0.19]" />
          <rect x="58" y="378" width="16" height="7" rx="3.5" className="fill-muted-foreground/[0.12]" />
          <rect x="82" y="378" width="16" height="7" rx="3.5" className="fill-muted-foreground/[0.12]" />
          <rect x="58" y="392" width="16" height="7" rx="3.5" className="fill-muted-foreground/[0.12]" />
        </g>
      </g>

      <g data-depth="0.9">
        <g className="animate-[hive-float_10s_ease-in-out_infinite_-6s] motion-reduce:animate-none">
          <path
            d="M440 340 l-8 34 20-11 20 11 -8-34z"
            className="fill-muted-foreground/[0.13]"
          />
          <circle cx="452" cy="322" r="26" className="fill-muted-foreground/[0.16]" />
          <circle cx="452" cy="322" r="15" className="fill-muted-foreground/[0.11]" />
        </g>
      </g>

      <g data-depth="0.75">
        <g className="animate-[hive-float_11s_ease-in-out_infinite_-1s] motion-reduce:animate-none">
          <rect
            x="418"
            y="418"
            width="80"
            height="48"
            rx="12"
            className="fill-muted-foreground/[0.15]"
          />
          <path
            d="M462 424 v36"
            className="stroke-muted-foreground/[0.19]"
            strokeWidth="3"
            strokeDasharray="5 6"
            strokeLinecap="round"
          />
        </g>
      </g>

      <circle cx="139" cy="176" r="9" className="fill-muted-foreground/[0.17]" data-depth="1.3" />
      <circle cx="381" cy="258" r="7" className="fill-muted-foreground/[0.17]" data-depth="1.15" />
      <circle cx="112" cy="452" r="6" className="fill-muted-foreground/[0.15]" data-depth="1.4" />

      {/* body */}
      <g data-body="">
        <rect x="234" y="252" width="52" height="58" rx="24" fill="#c69176" />
        <ellipse cx="260" cy="268" rx="26" ry="14" fill="#a87a5f" opacity="0.35" />

        <path
          d="M112 470
             C112 418, 136 380, 170 366
             C185 331, 218 312, 260 312
             C302 312, 335 331, 350 366
             C384 380, 408 418, 408 470 Z"
          fill="url(#hb-shirt)"
        />

        <path
          d="M214 318 C230 344, 290 344, 306 318"
          fill="none"
          stroke="#b64c1b"
          strokeWidth="9"
          strokeLinecap="round"
          opacity="0.6"
        />

        <g className="fill-white/40">
          <polygon points="196,404 207,410 207,423 196,429 185,423 185,410" />
          <polygon points="322,430 331,435 331,446 322,451 313,446 313,435" />
          <circle cx="248" cy="440" r="5" />
          <circle cx="296" cy="398" r="4" />
          <circle cx="216" cy="458" r="4" />
          <circle cx="340" cy="404" r="3.5" />
          <path
            d="M270 462 h14"
            className="stroke-white/40"
            strokeWidth="4.5"
            strokeLinecap="round"
          />
          <path
            d="M156 430 h13"
            className="stroke-white/40"
            strokeWidth="4.5"
            strokeLinecap="round"
          />
        </g>
      </g>

      {/* head — the part that follows the cursor */}
      <g data-head="">
        <g transform="translate(260 192) scale(1.08) translate(-260 -192)">
        <ellipse cx="163" cy="204" rx="17" ry="21" fill="url(#hb-ear)" />
        <ellipse cx="357" cy="204" rx="17" ry="21" fill="url(#hb-ear)" />

        <ellipse cx="260" cy="192" rx="99" ry="94" fill="url(#hb-skin)" />

        <ellipse
          cx="207"
          cy="232"
          rx="21"
          ry="13"
          fill="#ee908d"
          opacity="0.5"
          filter="url(#hb-blush)"
        />
        <ellipse
          cx="313"
          cy="232"
          rx="21"
          ry="13"
          fill="#ee908d"
          opacity="0.5"
          filter="url(#hb-blush)"
        />

        <path
          d="M223 172 q13 -9 26 -1"
          fill="none"
          stroke="#523524"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <path
          d="M271 171 q13 -8 26 1"
          fill="none"
          stroke="#523524"
          strokeWidth="7"
          strokeLinecap="round"
        />

        <g data-eyes="">
          <ellipse cx="228" cy="200" rx="11.5" ry="14.5" fill="#332219" />
          <ellipse cx="292" cy="200" rx="11.5" ry="14.5" fill="#332219" />
          <circle cx="232" cy="194" r="4.2" fill="#fff" />
          <circle cx="296" cy="194" r="4.2" fill="#fff" />
        </g>

        <ellipse cx="260" cy="222" rx="10" ry="8" fill="#d0977a" />

        <path
          d="M237 244 q23 24 46 0"
          fill="none"
          stroke="#332219"
          strokeWidth="7.5"
          strokeLinecap="round"
        />

        <path
          d="M161 198
             C156 118, 199 76, 260 76
             C321 76, 364 118, 359 198
             C355 176, 341 165, 327 171
             C312 145, 289 135, 268 145
             C252 126, 226 125, 212 145
             C194 139, 175 154, 170 177
             C168 186, 164 192, 161 198 Z"
          fill="url(#hb-hair)"
        />
        <path
          d="M200 104 C224 86, 262 82, 288 94"
          fill="none"
          stroke="#6a4b33"
          strokeWidth="9"
          strokeLinecap="round"
          opacity="0.55"
          filter="url(#hb-soft)"
        />
        </g>
      </g>
    </svg>
  );
}
