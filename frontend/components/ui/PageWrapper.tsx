interface PageWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export default function PageWrapper({ children, className = "" }: PageWrapperProps) {
  return (
    <div className={`container-site py-12 sm:py-16 ${className}`}>
      {children}
    </div>
  );
}
