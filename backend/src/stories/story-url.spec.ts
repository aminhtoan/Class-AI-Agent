import { UnprocessableEntityException } from "@nestjs/common";
import { parseAllowedDomains, parseStorySourceUrl } from "./story-url";

describe("story-url helpers", () => {
  it("normalizes a valid http url", () => {
    const result = parseStorySourceUrl(
      "https://Example.com/story/abc?chapter=1",
    );

    expect(result.sourceUrl).toBe("https://example.com/story/abc?chapter=1");
    expect(result.sourceHost).toBe("example.com");
  });

  it("throws for invalid protocols", () => {
    expect(() => parseStorySourceUrl("ftp://example.com/story")).toThrow(
      UnprocessableEntityException,
    );
  });

  it("parses allowed domains from config", () => {
    expect(parseAllowedDomains("example.com, story-site.com")).toEqual([
      "example.com",
      "story-site.com",
    ]);
  });
});
