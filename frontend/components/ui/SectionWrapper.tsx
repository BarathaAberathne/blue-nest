interface SectionWrapperProps {
  children: React.ReactNode;
  className?: string;
  tinted?: boolean;
}

export default function SectionWrapper({ children, className = "", tinted = false }: SectionWrapperProps) {
  return (
    <section className={`py-14 sm:py-20 ${tinted ? "bg-brand-50" : ""} ${className}`}>
      <div className="container-site">{children}</div>
    </section>
  );
}
