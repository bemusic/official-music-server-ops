
# Bemuse official server management scripts

Adding new songs to the official Bemuse server is not a simple process.
I have to:

- Obtain the permission to use the song from the artist.
- Create extra charts (e.g. when easy charts are not included with the original BMS package).
- Convert the BGA to a format suitable for web streaming (when a chart contains an HD BGA).
- Synchronize the BGA with the in-game chart (if applicable).
- Analyze the loudness of the song (in order to normalize the sound volume across songs).
- Generate preview music.
- Fix file encoding (if needed).
- Add eyecatch and background images (if applicable).
- Add metadata (e.g. artist/song/video/full version/BMS search URLs).

This repository contains the scripts that helps me with this workflow.

