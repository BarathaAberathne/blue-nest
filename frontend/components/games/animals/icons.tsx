/**
 * Inline SVG illustrations for the six animals plus the Blue Nest bird and the
 * "Animal Explorer" badge. Pure, scalable React components — no images, no
 * canvas. Brand palette: Blue #4A90E2 · Deep #2F5D9F · Sage #A9C5B0 ·
 * Green #6F8E6C · Sand #DCCDBA · Brown #8B6B4A.
 */
import type { SVGProps } from "react";
import type { AnimalId } from "./types";

type S = SVGProps<SVGSVGElement>;

/** Round trig output so SSR and client produce identical markup (no hydration mismatch). */
const rnd = (n: number) => Math.round(n * 1000) / 1000;

function Robin(props: S) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M14 40c-6-1-10 2-10 2s5 3 10 3 6-3 6-3-2-1-6-2Z" fill="#7A5A3C" />
      <ellipse cx="34" cy="36" rx="20" ry="17" fill="#8B6B4A" />
      <path d="M22 38c4-9 16-11 24-6 5 4 5 12-1 16-9 6-20 1-24-5-1-2 0-4 1-5Z" fill="#6E5236" />
      <ellipse cx="36" cy="40" rx="13" ry="12" fill="#D9744B" />
      <circle cx="44" cy="26" r="13" fill="#8B6B4A" />
      <circle cx="49" cy="24" r="4" fill="#FBF7F0" />
      <circle cx="50" cy="24" r="2.1" fill="#2A2320" />
      <path d="M56 27l8 1-7 4-1-5Z" fill="#F0A93D" />
      <path d="M30 52v6M40 52v6" stroke="#E0813C" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function Hedgehog(props: S) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M8 40c0-14 12-22 26-22s24 8 24 20-12 14-26 14S8 50 8 40Z" fill="#8B6B4A" />
      <g stroke="#6E5236" strokeWidth="3" strokeLinecap="round">
        <path d="M18 26l-4-8M28 22l-2-9M38 22l1-9M48 26l5-7M16 36l-9-3M18 46l-9 2" />
      </g>
      <path d="M40 40c8 0 16 3 16 9 0 5-7 7-16 7-6 0-10-3-10-8s4-8 10-8Z" fill="#E0CDB4" />
      <circle cx="54" cy="46" r="3" fill="#2A2320" />
      <circle cx="46" cy="44" r="2" fill="#2A2320" />
      <path d="M38 56v4M48 56v4" stroke="#6E5236" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function Squirrel(props: S) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M48 56c14-4 18-20 10-32-5-7-14-6-16 2-3 10 0 24 6 30Z" fill="#C97E36" />
      <path d="M48 52c8-4 11-16 6-25" stroke="#A9621F" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
      <ellipse cx="30" cy="42" rx="15" ry="18" fill="#C97E36" />
      <ellipse cx="30" cy="46" rx="9" ry="12" fill="#EAD3B0" />
      <circle cx="24" cy="22" r="12" fill="#C97E36" />
      <path d="M16 14l-3-7 8 3ZM32 14l3-7-8 3Z" fill="#B5732E" />
      <circle cx="20" cy="22" r="3" fill="#2A2320" />
      <circle cx="21" cy="21" r="1" fill="#fff" />
      <path d="M14 26c-3 0-5 2-5 4s3 2 6 0" stroke="#8B6B4A" strokeWidth="2" strokeLinecap="round" />
      <path d="M30 56v5M38 56v5" stroke="#A9621F" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function Duck(props: S) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M8 44c-4-1-6 1-6 1s3 3 7 3 5-2 5-2-2-1-6-2Z" fill="#C9B79C" />
      <ellipse cx="32" cy="42" rx="24" ry="15" fill="#C9B79C" />
      <path d="M16 42c6-8 26-9 36-3 5 3 5 10-1 13-12 6-30 2-36-4-1-2 0-4 1-6Z" fill="#A99478" />
      <path d="M44 22c8 0 14 5 14 11 0 4-3 7-8 8-6 1-12-2-12-9 0-6 3-10 6-10Z" fill="#3E7A3A" />
      <circle cx="50" cy="26" r="3" fill="#2A2320" />
      <circle cx="51" cy="25" r="1" fill="#fff" />
      <path d="M56 30l9 1-8 5-1-6Z" fill="#F0C03D" />
      <path d="M54 28a3 3 0 0 1 0 6" stroke="#F0C03D" strokeWidth="0" />
    </svg>
  );
}

function BeeIcon(props: S) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <ellipse cx="40" cy="14" rx="12" ry="9" fill="#FBF7F0" opacity="0.9" transform="rotate(-20 40 14)" />
      <ellipse cx="24" cy="14" rx="12" ry="9" fill="#FBF7F0" opacity="0.9" transform="rotate(20 24 14)" />
      <ellipse cx="32" cy="38" rx="20" ry="16" fill="#F4C236" />
      <path d="M22 26c6-3 16-3 22 1M16 38h32M20 50c5 3 19 3 24 0" stroke="#3A2E20" strokeWidth="4" strokeLinecap="round" />
      <circle cx="46" cy="30" r="11" fill="#3A2E20" />
      <circle cx="51" cy="28" r="3" fill="#FBF7F0" />
      <circle cx="52" cy="28" r="1.4" fill="#2A2320" />
      <path d="M52 18l4-5M44 16l1-6" stroke="#3A2E20" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="56" cy="12" r="2" fill="#3A2E20" />
      <circle cx="45" cy="9" r="2" fill="#3A2E20" />
    </svg>
  );
}

function Rabbit(props: S) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <ellipse cx="32" cy="44" rx="18" ry="16" fill="#A99E90" />
      <ellipse cx="32" cy="48" rx="11" ry="11" fill="#E7E0D6" />
      <circle cx="30" cy="28" r="13" fill="#A99E90" />
      <path d="M22 18C18 4 22 0 25 0s4 6 3 18Z" fill="#A99E90" />
      <path d="M40 18C44 4 40 0 37 0s-4 6-3 18Z" fill="#A99E90" />
      <path d="M23 16C21 6 23 4 24.5 4M41 16C43 6 41 4 39.5 4" stroke="#F2C0CC" strokeWidth="3" strokeLinecap="round" />
      <circle cx="25" cy="28" r="2.4" fill="#2A2320" />
      <circle cx="35" cy="28" r="2.4" fill="#2A2320" />
      <path d="M30 33h4l-2 2Z" fill="#C98B98" />
      <circle cx="48" cy="46" r="6" fill="#F4EEE6" />
    </svg>
  );
}

const ANIMAL_ICONS: Record<AnimalId, (p: S) => React.ReactElement> = {
  robin: Robin,
  hedgehog: Hedgehog,
  squirrel: Squirrel,
  duck: Duck,
  bee: BeeIcon,
  rabbit: Rabbit,
};

export function AnimalIcon({ id, ...props }: S & { id: AnimalId }) {
  const Cmp = ANIMAL_ICONS[id];
  return <Cmp aria-hidden {...props} />;
}

/** The Blue Nest bird, used on the completion screen + header. */
export function NestBird(props: S) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M14 40c-6-2-10 0-10 0s4 4 9 5 7-2 7-2-2-2-6-3Z" fill="#2F5D9F" />
      <ellipse cx="34" cy="38" rx="20" ry="18" fill="#4A90E2" />
      <ellipse cx="38" cy="44" rx="13" ry="12" fill="#FBF7F0" />
      <path d="M26 32c8-3 16 0 19 6 2 5-1 11-7 12-8 2-15-3-17-9-1-4 1-7 5-9Z" fill="#2F5D9F" />
      <circle cx="42" cy="24" r="13" fill="#4A90E2" />
      <circle cx="36" cy="29" r="3" fill="#F2B8C6" opacity="0.85" />
      <circle cx="46" cy="22" r="4" fill="#FBF7F0" />
      <circle cx="47" cy="22" r="2.2" fill="#2A2320" />
      <path d="M54 24l8 2-7 4-1-6Z" fill="#F0A93D" />
    </svg>
  );
}

/** "Animal Explorer" paw rosette badge. */
export function AnimalBadge(props: S) {
  return (
    <svg viewBox="0 0 80 96" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M30 50l-8 36 18-10 18 10-8-36Z" fill="#6F8E6C" />
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return <circle key={i} cx={rnd(40 + Math.cos(a) * 30)} cy={rnd(36 + Math.sin(a) * 30)} r="7" fill="#A9C5B0" />;
      })}
      <circle cx="40" cy="36" r="28" fill="#6F8E6C" />
      <circle cx="40" cy="36" r="22" fill="#FAF8F4" />
      {/* paw print */}
      <circle cx="40" cy="40" r="7" fill="#6F8E6C" />
      <circle cx="31" cy="32" r="3.4" fill="#6F8E6C" />
      <circle cx="40" cy="28" r="3.4" fill="#6F8E6C" />
      <circle cx="49" cy="32" r="3.4" fill="#6F8E6C" />
    </svg>
  );
}
