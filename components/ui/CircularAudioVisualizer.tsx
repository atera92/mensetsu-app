"use client";

import React, { useMemo } from "react";
// ↓ ここで上のフックを読み込みます（相対パス）
import { useAudioAnalyser } from "../../hooks/useAudioAnalyser";

const BAR_COUNT = 80;
const RADIUS = 120;
const MAX_BAR_HEIGHT = 150;

export const CircularAudioVisualizer = () => {
  const { frequencyData, error } = useAudioAnalyser();

  const bars = useMemo(() => {
    if (!frequencyData) return new Array(BAR_COUNT).fill(0);
    const step = Math.floor(frequencyData.length / BAR_COUNT);
    const sampledData = [];
    for (let i = 0; i < BAR_COUNT; i++) {
      const dataIndex = i * step;
      const value = frequencyData[dataIndex] || 0;
      sampledData.push(value);
    }
    return sampledData;
  }, [frequencyData]);

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  return (
    <div className="relative flex items-center justify-center w-[600px] h-[600px]">
      {/* 基準円 */}
      <div 
        className="absolute rounded-full border border-white/10"
        style={{ width: RADIUS * 2, height: RADIUS * 2 }} 
      />
      {/* 波形バー */}
      {bars.map((value, index) => {
        const height = Math.max(2, (value / 255) * MAX_BAR_HEIGHT);
        const rotation = (360 / BAR_COUNT) * index;
        return (
          <div
            key={index}
            className="absolute bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.5)]"
            style={{
              width: "4px",
              height: `${height}px`,
              transform: `rotate(${rotation}deg) translateY(-${RADIUS + height / 2}px)`,
              transition: "height 0.05s ease-out",
            }}
          />
        );
      })}
    </div>
  );
};