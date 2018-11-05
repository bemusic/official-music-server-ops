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


## Folder structure

These folders are included in this repository:

- `admin` - An Electron-based GUI app to ease the workflow.
- `scripts` - A folder containing various scripts.

These folders are not in this repository:

- `archive` - Contains raw downloaded files.
- `music` - Contains the official music server content (this will be deployed).
    - `index.json` - The staging JSON file (contains unreleased songs).
    - `live.json` - The production JSON file.
- `packages` - Working directory for adding new songs to Bemuse. When preparing a song for addition in Bemuse, I will do it in this folder before moving them to the staging server.
- `renders` - Contains the rendered `.wav` file of each song. They are generated with `bms-renderer` and the loudness is normalized using WaveGain.

## Server deployment

Deployment process:

    My laptop --> Google Cloud --> Actual music server

Synchronizing from my laptop to Google Cloud:

```
# On laptop
gsutil -m rsync -r music/ gs://bemuse-official-server.appspot.com/official-server/music/
gsutil -m rsync -r renders/ gs://bemuse-official-server.appspot.com/official-server/renders/
```

Synchronizing from Google Cloud to music server:

```
# On music server
docker run --rm -it --volumes-from gcloud-config \
  -v /mnt/bemuse-server-data/official-server:/official-server \
   google/cloud-sdk gsutil -m rsync -r \
   gs://bemuse-official-server.appspot.com/official-server/ \
   /official-server/
```

Synchronizing from music server to Google Cloud:

```
# On music server
docker run --rm -it --volumes-from gcloud-config \
  -v /mnt/bemuse-server-data/official-server:/official-server \
   google/cloud-sdk gsutil -m rsync -r \
   /official-server/ \
   gs://bemuse-official-server.appspot.com/official-server/
```

## BGA conversion

I run it on Hyper.sh. For the latest video conversion process, refer to <https://github.com/dtinth/hypertasks> for how I do it.
