type LogoProps = {
  className?: string;
};

export default function Logo({ className = 'h-10 w-auto' }: LogoProps) {
  return (
    <img
      src="/logo.png"
      alt="SEVIGPRO — Seguridad, Vigilancia y Protección"
      className={`object-contain ${className}`}
    />
  );
}
