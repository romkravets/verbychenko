import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock process.env BEFORE importing the module so envList picks up the values
const originalEnv = { ...process.env };

beforeEach(() => {
  // Reset modules between tests so envList() re-reads env
  vi.resetModules();
  process.env = { ...originalEnv };
});

describe("channelPickPlaylist", () => {
  it("returns null when no playlists configured (env not set)", async () => {
    delete process.env.NEXT_PUBLIC_RADIO_UA_FOLK_PLAYLISTS;
    const { CHANNELS, channelPickPlaylist } = await import("@/lib/channels");
    const folk = CHANNELS.find((c) => c.id === "ua-folk")!;
    expect(channelPickPlaylist(folk)).toBeNull();
  });

  it("returns the single playlist ID when only one is configured", async () => {
    process.env.NEXT_PUBLIC_RADIO_UA_FOLK_PLAYLISTS = "PLabc123";
    const { CHANNELS, channelPickPlaylist } = await import("@/lib/channels");
    const folk = CHANNELS.find((c) => c.id === "ua-folk")!;
    expect(channelPickPlaylist(folk)).toBe("PLabc123");
  });

  it("returns one of the playlist IDs when multiple are configured", async () => {
    process.env.NEXT_PUBLIC_RADIO_UA_FOLK_PLAYLISTS = "PLabc,PLdef,PLghi";
    const { CHANNELS, channelPickPlaylist } = await import("@/lib/channels");
    const folk = CHANNELS.find((c) => c.id === "ua-folk")!;
    const valid = new Set(["PLabc", "PLdef", "PLghi"]);
    // Call 20 times to be confident random is within expected values
    for (let i = 0; i < 20; i++) {
      const pick = channelPickPlaylist(folk);
      expect(pick).not.toBeNull();
      expect(valid.has(pick!)).toBe(true);
    }
  });

  it("trims whitespace from comma-separated playlist IDs", async () => {
    process.env.NEXT_PUBLIC_RADIO_UA_FOLK_PLAYLISTS = " PL1 , PL2 ";
    const { CHANNELS } = await import("@/lib/channels");
    const folk = CHANNELS.find((c) => c.id === "ua-folk")!;
    expect(folk.playlistIds).toEqual(["PL1", "PL2"]);
  });

  it("ignores empty entries in comma-separated list", async () => {
    process.env.NEXT_PUBLIC_RADIO_UA_FOLK_PLAYLISTS = "PL1,,PL2,";
    const { CHANNELS } = await import("@/lib/channels");
    const folk = CHANNELS.find((c) => c.id === "ua-folk")!;
    expect(folk.playlistIds).toEqual(["PL1", "PL2"]);
  });
});

describe("channelPlaylist (fallback)", () => {
  it("returns comma-separated video IDs for channels with no playlist", async () => {
    process.env.NEXT_PUBLIC_RADIO_UA_KANAL_VIDEOS = "vid1,vid2,vid3";
    const { CHANNELS, channelPlaylist } = await import("@/lib/channels");
    const kanal = CHANNELS.find((c) => c.id === "ua-kanal")!;
    expect(channelPlaylist(kanal)).toBe("vid1,vid2,vid3");
  });
});

describe("channelFirstVideo", () => {
  it("returns the first video ID", async () => {
    process.env.NEXT_PUBLIC_RADIO_UA_KANAL_VIDEOS = "first,second,third";
    const { CHANNELS, channelFirstVideo } = await import("@/lib/channels");
    const kanal = CHANNELS.find((c) => c.id === "ua-kanal")!;
    expect(channelFirstVideo(kanal)).toBe("first");
  });

  it("returns empty string when no videos configured", async () => {
    delete process.env.NEXT_PUBLIC_RADIO_UA_KANAL_VIDEOS;
    const { CHANNELS, channelFirstVideo } = await import("@/lib/channels");
    const kanal = CHANNELS.find((c) => c.id === "ua-kanal")!;
    expect(channelFirstVideo(kanal)).toBe("");
  });
});

describe("CHANNELS structure", () => {
  it("has exactly 5 channels", async () => {
    const { CHANNELS } = await import("@/lib/channels");
    expect(CHANNELS).toHaveLength(5);
  });

  it("all channels have required fields", async () => {
    const { CHANNELS } = await import("@/lib/channels");
    for (const ch of CHANNELS) {
      expect(ch.id).toBeTruthy();
      expect(ch.name).toBeTruthy();
      expect(ch.emoji).toBeTruthy();
      expect(ch.country).toMatch(/^(ua|world)$/);
      expect(Array.isArray(ch.playlistIds)).toBe(true);
      expect(Array.isArray(ch.videoIds)).toBe(true);
    }
  });

  it("channel IDs are unique", async () => {
    const { CHANNELS } = await import("@/lib/channels");
    const ids = CHANNELS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
