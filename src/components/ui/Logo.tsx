interface LogoProps {
  size?: number;
  className?: string;
}

/**
 * Analyfy Academy logo — automatically switches between
 * light (logo-light.webp) and dark (logo-dark.webp) based on
 * the OS / browser color-scheme preference.
 */
export default function Logo({ size = 32, className = '' }: LogoProps) {
  return (
    <picture>
      <source media="(prefers-color-scheme: dark)" srcSet="/logo-dark.webp" />
      <img
        src="/logo-light.webp"
        alt="آکادمی آنالیفای"
        width={size}
        height={size}
        className={className}
        style={{ objectFit: 'contain' }}
      />
    </picture>
  );
}
