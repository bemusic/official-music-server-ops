const Vue = require('vue/dist/vue')
const path = require('path')
const fs = require('fs')
const base = path.dirname(__dirname)
const smalltalk = require('smalltalk')

Vue.component('admin-packages', {
  template: `
    <div>
      Admin packages!
      <ul>
        <li v-for="song in songs">
          <a v-on:click="selectSong(song)" href="javascript://">{{song}}</a>
        </li>
      </ul>
    </div>
  `,
  methods: {
    selectSong (song) {
      navigateTo.song(path.join(this.base, song))
    }
  },
  data () {
    const base = path.resolve(__dirname, '../packages')
    return {
      songs: getPackageSongs(),
      base: base
    }

    function getPackageSongs () {
      const files = require('glob').sync('*/*.{bms,bme,bml,bmson,pms}', { cwd: base })
      return [ ...new Set(files.map(x => path.dirname(x))) ]
    }
  }
})

Vue.component('admin-song', {
  props: [ 'songDir' ],
  template: `
    <div>
      <h2>Song</h2>
      <p>
        <button v-on:click="toPackages">Song packages</button>
        <button v-on:click="refresh">Refresh</button>
      </p>
      <p><strong>{{status}}</strong> {{relativeDir}} <button v-on:click="finder">Show in Finder</button></p>
      <div v-if="songState">
        <h3>Charts</h3>
        <table border='1'>
          <thead>
            <tr>
              <th>Name</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="chart of songState.charts">
              <td>{{chart}}</td>
              <td>
                <button v-on:click="soundCheck(chart)" title="sound check">🔊</button>
              </td>
            </tr>
          </tbody>
        </table>
        <h3>
          Preview music
          <button v-on:click="rendered">Open rendered track</button>
          <button v-on:click="renderPreview">Render preview</button>
          <button v-on:click="listenPreview">Listen to preview</button>
        </h3>
        <h3>Metadata</h3>
        <p>
          <strong>URL</strong>
          <button v-on:click="setAttribute('artist_url')">ArtistURL</button>
          <button v-on:click="setAttribute('bms_url')">BMS</button>
          <button v-on:click="setAttribute('song_url')">Song</button>
          <button v-on:click="setAttribute('long_url')">Long</button>
          <button v-on:click="setAttribute('youtube_url')">YouTube</button>
          <br />
          <strong>BGA</strong>
          <button v-on:click="setBGA">BGAURL</button>
          <button v-on:click="setAttribute('video_offset')">BGAOffset</button>
          <br />
          <strong>etc</strong>
          <button v-on:click="setAttribute('alias_of')">ArtistAlias</button>
          <button v-on:click="setAttribute('replaygain')">ReplayGain</button>
          <button v-on:click="setAttribute('bmssearch_id')">BMSSearch</button>
          <button v-on:click="setAddedDate">Added date</button>
          <button v-on:click="setUnreleased">Unreleased</button>
        </p>
        <textarea v-model="readmeText" style="box-sizing: border-box; width: 100%; height: 15em; font: inherit;"></textarea>
        <button v-on:click="save">Save YAML</button>
      </div>
    </div>
  `,
  computed: {
    relativeDir () {
      return path.relative(base, this.songDir)
    }
  },
  methods: {
    toPackages () {
      navigateTo.packages()
    },
    soundCheck (chart) {
      const cmd = `./scripts/sound-check '${this.relativeDir}/${chart}' '${this.songState.songId}'`
      smalltalk.prompt('Sound check', 'Run this command', cmd)
    },
    modifyReadme (f) {
      const data = require('front-matter')(this.readmeText)
      data.attributes = data.attributes || { }
      f(data.attributes)
      this.readmeText = '---\n' + require('js-yaml').safeDump(data.attributes, { lineWidth: 999 }) + '---\n' + data.body
    },
    finder () {
      require('child_process').execFile('open', [ this.songDir ])
    },
    async rendered () {
      const wav = `${base}/renders/${this.songState.songId}.wav`
      if (!fs.existsSync(wav)) {
        await smalltalk.alert('wav file not found — please run sound check first')
        return
      }
      require('child_process').execFile('open', [ '-a', 'Audacity', wav ])
    },
    async renderPreview () {
      const wav = `${base}/renders/${this.songState.songId}.wav`
      if (!fs.existsSync(wav)) {
        await smalltalk.alert('wav file not found — please run sound check first')
        return
      }
      const data = require('front-matter')(this.readmeText)
      const originalStart = data.attributes && data.attributes.preview_start || 0
      const start = +(await smalltalk.prompt('Render preview', 'Where to start preview?', String(originalStart))) || 0
      this.modifyReadme(d => {
        d.preview_start = start
      })
      try {
        await require('util').promisify(require('child_process').execFile)(
          './scripts/_render-preview',
          [ wav, this.songDir, String(start) ],
          { cwd: base }
        )
        await this.save()
        this.listenPreview()
      } catch (e) {
        await smalltalk.alert('Error', e.stack)
      }
    },
    listenPreview () {
      require('electron').remote.getCurrentWindow().previewFile(
        path.join(this.songDir, '_bemuse_preview.mp3')
      )
    },
    async save () {
      try {
        fs.writeFileSync(path.join(this.songDir, 'README.md'), this.readmeText)
        await smalltalk.alert('Saved', 'Save OK!')
      } catch (e) {
        await smalltalk.alert('Error', e.stack)
      }
    },
    async refresh () {
      this.status = 'Refreshing...'
      try {
        this.songState = await getSongState(this.songDir)
        this.readmeText = this.songState.readmeText
        this.status = 'OK'
      } catch (e) {
        this.status = String(e)
      }
    },
    async setAttribute (name) {
      const value = await smalltalk.prompt('Set ' + name, 'Value')
      this.modifyReadme((d) => {
        d[name] = value
      })
    },
    async setBGA () {
      const value = await smalltalk.prompt('Set ' + name, 'Value')
      const prefix = /:/.test(value) ? '' : 'https://bga.bemuse.ninja/'
      this.modifyReadme((d) => {
        d.video_url = prefix + value
      })
    },
    setAddedDate () {
      this.modifyReadme((d) => {
        const date = new Date()
        date.setUTCHours(0)
        date.setUTCMinutes(0)
        date.setUTCSeconds(0)
        date.setUTCMilliseconds(0)
        d.added = date
      })
    },
    setUnreleased () {
      this.modifyReadme((d) => {
        if (d.unreleased) {
          delete d.unreleased
        } else {
          d.unreleased = true
        }
      })
    }
  },
  created () {
    this.refresh()
  },
  data () {
    return {
      status: 'Loading...',
      songState: null,
      readmeText: ''
    }
  }
})

function getSongState (songDir) {
  const charts = require('glob').sync('*.{bms,bme,bml,bmson,pms}', { cwd: songDir })
  const songId = path.basename(songDir)
  const readmePath = path.join(songDir, 'README.md')
  return {
    charts,
    songId,
    readmeText: fs.existsSync(readmePath) ? fs.readFileSync(readmePath, 'utf8') : ''
  }
}

const navigateTo = {
  packages () {
    instance.route = {
      name: 'packages'
    }
  },
  song (dir) {
    instance.route = {
      name: 'song',
      songDir: dir
    }
  }
}

const instance = new Vue({
  el: '#main',
  data: {
    route: {
      name: 'packages'
    }
  },
  template: `
    <div>
      <div style="position:absolute;top:4px;left:4px;opacity:0.5;font-size:0.8em;">
        route.name={{route.name}}
      </div>
      <div v-if="route.name === 'packages'">
        <admin-packages></admin-packages>
      </div>
      <div v-if="route.name === 'song'">
        <admin-song :songDir="route.songDir"></admin-song>
      </div>
    </div>
  `
})
