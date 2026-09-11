// Keyless Google Maps embed for a single branch (no API key / billing —
// plain ?q=…&output=embed iframe). Branch pages render this inside their
// fixed-height "Find us" wrapper; the iframe just fills it. The all-branches
// map on /contact keeps using LeafletMap (via BranchMap).
export default function BranchMapEmbed({ src, branchName }: { src: string; branchName: string }) {
  return (
    <iframe
      src={src}
      title={`Map showing Blue Nest Montessori School in ${branchName}`}
      className="h-full w-full"
      style={{ border: 0 }}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      allowFullScreen
    />
  );
}
