"use client";

import BeadRing from "./BeadRing";

export default function LoadingBeadRing() {
  return (
    <div style={{
      animation: "scalePulse 2s ease-in-out infinite",
    }}>
      <BeadRing current={0} total={108} pulseKey={0} burstKey={undefined} />
      <div className="text-center mt-6 text-xs text-muted">
        Loading
        <span style={{ animation: "dots 1.5s steps(4, end) infinite" }}>
          .
        </span>
        <span style={{ animation: "dots 1.5s steps(4, end) 0.25s infinite" }}>
          .
        </span>
        <span style={{ animation: "dots 1.5s steps(4, end) 0.5s infinite" }}>
          .
        </span>
      </div>

      <style>{`
        @keyframes scalePulse {
          0% {
            transform: scale(0.95);
            opacity: 0.6;
          }
          50% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(0.95);
            opacity: 0.6;
          }
        }

        @keyframes dots {
          0%, 20% {
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          80%, 100% {
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
