import { useState } from "react";


interface TeamMarkProps {
  name: string | null;
  shortName: string | null;
  logoUrl?: string | null;
  size?: "small" | "medium";
}

const TEAM_LOGO_PATH_PREFIX = "/api/assets/team-logos/";

const getLocalTeamLogoUrl = (logoUrl: string | null): string | null => {
  if (logoUrl === null) {
    return null;
  }

  try {
    const pathname = logoUrl.startsWith("/")
      ? logoUrl.split(/[?#]/, 1)[0]
      : new URL(logoUrl).pathname;

    if (!pathname.startsWith(TEAM_LOGO_PATH_PREFIX)) {
      return null;
    }

    const slug = decodeURIComponent(pathname.slice(TEAM_LOGO_PATH_PREFIX.length));
    if (!slug || slug.includes("/") || slug === "." || slug === "..") {
      return null;
    }

    return `${TEAM_LOGO_PATH_PREFIX}${encodeURIComponent(slug)}`;
  } catch {
    return null;
  }
};

const TeamMark = ({ name, shortName, logoUrl = null, size = "medium" }: TeamMarkProps) => {
  const [failedLogoUrl, setFailedLogoUrl] = useState<string | null>(null);
  const [loadedLogoUrl, setLoadedLogoUrl] = useState<string | null>(null);
  const localLogoUrl = getLocalTeamLogoUrl(logoUrl);
  const resolvedLogoUrl = localLogoUrl !== null && failedLogoUrl !== localLogoUrl ? localLogoUrl : null;
  const isLoading = resolvedLogoUrl !== null && loadedLogoUrl !== resolvedLogoUrl;
  const className = `team-mark team-mark--${size}${resolvedLogoUrl === null ? " team-mark--fallback" : ""}${isLoading ? " is-loading" : ""}`;

  return (
    <span className={className} aria-hidden="true" title={name ?? undefined}>
      {resolvedLogoUrl ? (
        <img
          src={resolvedLogoUrl}
          alt=""
          onLoad={() => setLoadedLogoUrl(resolvedLogoUrl)}
          onError={() => setFailedLogoUrl(resolvedLogoUrl)}
        />
      ) : (
        (shortName ?? name ?? "").slice(0, 3)
      )}
    </span>
  );
};

export { TeamMark };