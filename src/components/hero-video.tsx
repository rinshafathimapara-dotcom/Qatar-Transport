"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

export default function HeroVideo() {
  const video = useRef<HTMLVideoElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (
      navigator as Navigator & {
        connection?: EventTarget & { saveData?: boolean };
      }
    ).connection;
    const update = () => setEnabled(!motion.matches && !connection?.saveData);
    update();
    motion.addEventListener("change", update);
    connection?.addEventListener("change", update);
    return () => {
      motion.removeEventListener("change", update);
      connection?.removeEventListener("change", update);
    };
  }, []);

  useEffect(() => {
    const element = backdrop.current;
    if (!element) return;
    let inView = false;
    const update = () => setVisible(inView && !document.hidden);
    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        update();
      },
      { threshold: 0.05 },
    );
    observer.observe(element);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  useEffect(() => {
    const element = video.current;
    if (!element) return;
    if (enabled && visible && !paused && !failed) {
      let active = true;
      void element.play().catch((error: Error) => {
        // View changes may cancel a pending play request; retain the user's intent.
        if (active && error.name !== "AbortError") setPaused(true);
      });
      return () => {
        active = false;
        element.pause();
      };
    }
    element.pause();
  }, [enabled, visible, paused, failed]);

  return (
    <>
      <div ref={backdrop} className="hero-video-backdrop" aria-hidden="true">
        {enabled && !failed && (
          <video
            ref={video}
            className="hero-background-video"
            muted
            loop
            playsInline
            preload="metadata"
            src="/videos/dashboard-city.mp4"
            poster="/images/dashboard-city-poster.jpg"
            onError={() => setFailed(true)}
            tabIndex={-1}
            disablePictureInPicture
          />
        )}
      </div>
      {enabled && !failed && (
        <button
          className="hero-motion-toggle"
          type="button"
          aria-label={
            paused ? "Play background video" : "Pause background video"
          }
          onClick={() => setPaused((value) => !value)}
        >
          {paused ? <Play size={14} /> : <Pause size={14} />}
          <span>{paused ? "Play video" : "Pause video"}</span>
        </button>
      )}
    </>
  );
}
