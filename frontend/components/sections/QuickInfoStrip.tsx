import { Baby, Clock, MapPin, Phone } from "lucide-react";

const items = [
  { icon: Baby,   label: "Ages",      value: "3 months – 5 years"         },
  { icon: Clock,  label: "Hours",     value: "Mon–Fri, 7:30am–6:00pm"     },
  { icon: MapPin, label: "Locations", value: "Harrow · Pinner · Borehamwood" },
  { icon: Phone,  label: "Call us",   value: "020 8861 5574"               },
];

export default function QuickInfoStrip() {
  return (
    <div className="chalk-bg px-4 py-5 sm:px-6 lg:px-8">
      <div className="container-site">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {items.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20">
                <Icon className="h-4 w-4 text-white" aria-hidden="true" />
              </div>
              <div>
                <p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-white/65">{label}</p>
                <p className="text-sm font-semibold leading-tight text-white">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
