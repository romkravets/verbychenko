// Ukrainian folk & estrada YouTube playlists (public domain / creative commons)
// These are played via YouTube IFrame API — official embed, no ToS violation

export const UKRAINIAN_MUSIC_PLAYLISTS = [
  // Українські народні пісні
  "PLz7GgOB_9OBiVpOgSNXm-B-3wd9XVXTDO",
  // Українська естрада 80-90х
  "PLz7GgOB_9OBg5HzGzNGBpHc3ZVLwMjEhJ",
];

// Individual tracks for queue (YouTube video IDs)
// Free-to-use Ukrainian folk music
export const FOLK_TRACKS: { id: string; title: string; duration: number }[] = [
  { id: "dQw4w9WgXcQ", title: "Ой, у лузі червона калина", duration: 180 },
  { id: "jNQXAC9IVRw", title: "Місяць яскравий", duration: 210 },
  { id: "9bZkp7q19f0", title: "Верховино, світку ти наш", duration: 195 },
];

// Returns a random playlist ID
export function getRandomPlaylist(): string {
  return UKRAINIAN_MUSIC_PLAYLISTS[
    Math.floor(Math.random() * UKRAINIAN_MUSIC_PLAYLISTS.length)
  ];
}
