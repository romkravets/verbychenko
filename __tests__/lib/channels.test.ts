import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock process.env BEFORE importing the module so envList picks up the values
const originalEnv = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  process.env = { ...originalEnv };
});

// ─── channelPickPlaylist — which playlist plays this session ──────────────────

describe("channelPickPlaylist — pick a playlist for the current session", () => {
  it("returns null when no playlists are configured for the channel", async () => {
    delete process.env.NEXT_PUBLIC_RADIO_UA_FOLK_PLAYLISTS;
    const { CHANNELS, channelPickPlaylist } = await import("@/lib/channels");
    const folk = CHANNELS.find((c) => c.id === "ua-folk")!;
    expect(channelPickPlaylist(folk)).toBeNull();
  });

  it("always returns the single configured playlist ID", async () => {
    process.env.NEXT_PUBLIC_RADIO_UA_FOLK_PLAYLISTS = "PLabc123";
    const { CHANNELS, channelPickPlaylist } = await import("@/lib/channels");
    const folk = CHANNELS.find((c) => c.id === "ua-folk")!;
    expect(channelPickPlaylist(folk)).toBe("PLabc123");
  });

  it("returns one of the configured playlists at random (all are valid)", async () => {
    process.env.NEXT_PUBLIC_RADIO_UA_FOLK_PLAYLISTS = "PLabc,PLdef,PLghi";
    const { CHANNELS, channelPickPlaylist } = await import("@/lib/channels");
    const folk = CHANNELS.find((c) => c.id === "ua-folk")!;
    const valid = new Set(["PLabc", "PLdef", "PLghi"]);
    // Run 20 times to be confident every result comes from the configured set
    for (let i = 0; i < 20; i++) {
      const pick = channelPickPlaylist(folk);
      expect(pick).not.toBeNull();
      expect(valid.has(pick!)).toBe(true);
    }
  });

  it("trims whitespace from playlist IDs in the env variable", async () => {
    process.env.NEXT_PUBLIC_RADIO_UA_FOLK_PLAYLISTS = " PL1 , PL2 ";
    const { CHANNELS } = await import("@/lib/channels");
    const folk = CHANNELS.find((c) => c.id === "ua-folk")!;
    expect(folk.playlistIds).toEqual(["PL1", "PL2"]);
  });

  it("ignores empty entries from a trailing comma or double comma", async () => {
    process.env.NEXT_PUBLIC_RADIO_UA_FOLK_PLAYLISTS = "PL1,,PL2,";
    const { CHANNELS } = await import("@/lib/channels");
    const folk = CHANNELS.find((c) => c.id === "ua-folk")!;
    expect(folk.playlistIds).toEqual(["PL1", "PL2"]);
  });
});

// ─── channelPlaylist — video ID fallback when no playlist is configured ───────

describe("channelPlaylist — comma-separated video IDs for fallback mode", () => {
  it("joins multiple video IDs into a comma-separated string", async () => {
    process.env.NEXT_PUBLIC_RADIO_UA_KANAL_VIDEOS = "vid1,vid2,vid3";
    const { CHANNELS, channelPlaylist } = await import("@/lib/channels");
    const kanal = CHANNELS.find((c) => c.id === "ua-kanal")!;
    expect(channelPlaylist(kanal)).toBe("vid1,vid2,vid3");
  });
});

// ─── channelFirstVideo — first video used as the initial videoId param ────────

describe("channelFirstVideo — which video starts the fallback playlist", () => {
  it("returns the first video ID from the configured list", async () => {
    process.env.NEXT_PUBLIC_RADIO_UA_KANAL_VIDEOS = "first,second,third";
    const { CHANNELS, channelFirstVideo } = await import("@/lib/channels");
    const kanal = CHANNELS.find((c) => c.id === "ua-kanal")!;
    expect(channelFirstVideo(kanal)).toBe("first");
  });

  it("returns an empty string when no videos are configured", async () => {
    delete process.env.NEXT_PUBLIC_RADIO_UA_KANAL_VIDEOS;
    const { CHANNELS, channelFirstVideo } = await import("@/lib/channels");
    const kanal = CHANNELS.find((c) => c.id === "ua-kanal")!;
    expect(channelFirstVideo(kanal)).toBe("");
  });
});

// ─── CHANNELS — channel registry integrity ────────────────────────────────────

describe("CHANNELS registry", () => {
  it("has exactly 5 channels defined", async () => {
    const { CHANNELS } = await import("@/lib/channels");
    expect(CHANNELS).toHaveLength(5);
  });

  it("every channel has the required fields filled in", async () => {
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

  it("all channel IDs are unique — no duplicates", async () => {
    const { CHANNELS } = await import("@/lib/channels");
    const ids = CHANNELS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
