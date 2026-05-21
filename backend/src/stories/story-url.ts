import { UnprocessableEntityException } from "@nestjs/common";

export interface ParsedStorySourceUrl {
  sourceUrl: string;
  sourceHost: string;
}

function throwValidationError(message: string) {
  throw new UnprocessableEntityException({
    code: "VALIDATION_ERROR",
    message: "Validation failed",
    details: [{ field: "sourceUrl", message }],
  });
}

export function parseStorySourceUrl(sourceUrl: string): ParsedStorySourceUrl {
  let parsedUrl: URL | null = null;

  try {
    parsedUrl = new URL(sourceUrl.trim());
  } catch {
    throwValidationError("sourceUrl must be a valid http or https URL");
  }

  if (!parsedUrl) {
    throwValidationError("sourceUrl must be a valid http or https URL");
  }

  const normalizedUrl = parsedUrl as URL;

  if (
    normalizedUrl.protocol !== "http:" &&
    normalizedUrl.protocol !== "https:"
  ) {
    throwValidationError("sourceUrl must use http or https");
  }

  return {
    sourceUrl: normalizedUrl.toString(),
    sourceHost: normalizedUrl.hostname.toLowerCase(),
  };
}

export function parseAllowedDomains(allowedDomains?: string): string[] {
  if (!allowedDomains) {
    return [];
  }

  return allowedDomains
    .split(",")
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedStoryHost(
  sourceHost: string,
  allowedDomains: string[],
): boolean {
  if (allowedDomains.length === 0) {
    return true;
  }

  return allowedDomains.some(
    (allowedDomain) =>
      sourceHost === allowedDomain || sourceHost.endsWith(`.${allowedDomain}`),
  );
}
