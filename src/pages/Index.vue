<template>
<q-layout view="hHh lpR fFf full-width full-height">
<q-dialog :model-value="!user || loading || !playerId" persistent>
  <q-card class="q-pa-lg" style="max-width: 440px">
    <h2 class="text-h5">Memory Game</h2>
    <p v-if="loading">Checking your account…</p>
    <template v-else-if="!user">
      <p>Sign in with Google to recover your player on any device.</p>
      <q-btn @click="login" color="primary" label="Continue with Google" />
      <q-btn @click="loadAccount" label="Retry" />
    </template>
    <form v-else @submit.prevent="createPlayer">
      <p>Choose a player name to link to your account. Existing names require an administrator to migrate them.</p>
      <q-input v-model="newName" label="Player name" maxlength="30" />
      <q-btn type="submit" :disable="busy || newName.trim().length < 4" label="Create player" color="primary" />
      <q-btn @click="logout" :disable="busy" label="Sign out" />
    </form>
    <p v-if="authError" role="alert">{{authError}}</p>
  </q-card>
</q-dialog>
<q-dialog v-model="hasWon" persistent>
  <q-card class="full-width column wrap justify-center items-center content-center q-pa-lg">
    <div v-if="newHighScore" class="row text-h3">New High Score</div>
    <div v-else class="row text-h3">Try Again</div>
    <div class="row text-h4">High Score: {{ highScore }}</div>
    <div class="row text-h6"> Your Score: {{ score }}</div>
  <q-btn @click="refreshPage" class="row float-left bg-positive text-white">Play again?</q-btn>
  <q-btn v-if="newHighScore" @click="postScore" class="row bg-positive text-white q-mt-md">Post to Leaderboard</q-btn>
  </q-card>
</q-dialog>
<q-dialog v-model="leaderboards">
  <q-card class="full-width column wrap justify-center items-center content-center q-pa-lg bg-primary">
      <div class="q-pa-md full-width">
        <q-table
          class="text-dark"
          title="Leaderboard - Top 5"
          :rows="rows"
          :columns="columns"
        />
        <q-btn @click="refreshPage" class="row full-width bg-positive text-white q-mt-md">Play again?</q-btn>
  </div>
  </q-card>
</q-dialog>
    <q-page-container class=" row full-height full-width">
    <q-header class="row full-width justify-center shadow-5 q-py-sm q-px-lg" style="min-width:317px;">
      <div class="row">
        <q-img class="row" src="img/logo.png" fit="contain" style="max-height: 80px; max-width:400px;" />
        <div class="row no-wrap">
          <q-btn v-if="user" @click="logout" :disable="busy" flat label="Sign out of shared account" />
          <q-btn class="column text-warning" flat icon-right="person">{{username}}</q-btn>
          <q-btn class="column text-secondary" @click="leaderboards = !leaderboards" flat  icon-right="emoji_events">{{highScore}}</q-btn>
        </div>
      </div>
    </q-header>
    <q-page class="row full-width justify-center no-margin q-px-sm q-py-lg bg-dark" style="min-width:317px;">
        <div v-for="(colz,index) in newArray" :key="colz" class="colz transparent no-border">
            <q-btn :disable="!playerId || !user" rounded class="qBtn no-padding" @click="testClick">
              <q-icon :color="cardColor" class="no-pointer-events flip-horizontal" :name="newArray[index]" />
            </q-btn>
        </div>
    </q-page>
    <q-footer class="justify-around row no-wrap full-width q-pa-sm" style="min-width:317px;">
        <div class="text-secondary text-h6"><q-icon size="md" name="timer"/>: {{time}}</div>
        <q-btn class="bg-orange"  rounded @click="refreshPage" icon="restart_alt" />
        <div class="text-right text-h6 text-secondary">{{moves}}:<q-icon size="md" name="do_not_touch"/></div>
    </q-footer>
    </q-page-container>
</q-layout>
</template>

<script>
import { api } from 'boot/axios'
import { Notify } from 'quasar'
import { defineComponent } from 'vue';
export default defineComponent ({
  data: () => ({
    catalogArray: ['shopping_cart', 'local_florist', 'favorite', 'lightbulb', 'star_rate', 'extension', 'pets', 'nightlight_round', 'photo_camera', 'cookie', 'face', 'thumb_up', 'visibility', 'build', 'savings', 'android', 'thumb_down', 'hourglass_empty', 'anchor', 'music_note', 'brush', 'color_lens', 'flash_on', 'landscape', 'checkroom', 'all_inclusive', 'airport_shuttle', 'sports_bar', 'casino', 'ac_unit', 'fitness_center', 'sports_esports', 'catching_pokemon', 'sports_football', 'cruelty_free', 'piano', 'skateboarding', 'key', 'attach_file', 'attach_money', 'headphones', 'flight', 'lunch_dining', 'two_wheeler', 'icecream'],
    iconsArray: [],
    newArray: [],
    time: 0,
    firstClick: null,
    firstPath: null,
    secondPath: null,
    secondClick: null,
    hasStarted: false,
    canClick: true,
    confirmed: 0,
    mainTimer: null,
    hasWon: false,
    calcWidth: 5,
    calcHeight: 4,
    username: null,
    score: 0,
    cardColor: 'white',
    moves: 0,
    playerId: null,
    user: null,
    loading: true,
    busy: false,
    newName: '',
    authError: '',
    playerInfo: [],
    highScore: null,
    newHighScore: false,
    leaderboards: false,
    timeMultiplier: 100,
    triesMultiplier: 100,
    serverData: null,
    rows: [],
    columns: [{
      name: 'player',
      required: true,
      label: 'Player Name',
      align: 'left',
      field: 'player',
      sortable: true
    },{
      name: 'score',
      required: true,
      label: 'Score',
      align: 'right',
      field: 'score',
      sortable: true
    }]
  }),
  created () {
    this.createCatalog()
    this.loadAccount()
  },
  beforeUnmount(){ clearInterval(this.mainTimer) },
  methods: {
    authConfig(){
      const token = localStorage.getItem('strapi_jwt')
      if (!token) throw Object.assign(new Error('Sign in required'), {response:{status:401}})
      return {headers:{Authorization:'Bearer ' + token}, withCredentials:false}
    },
    login(){
      const nonce = Array.from(crypto.getRandomValues(new Uint8Array(32)), n => n.toString(16).padStart(2, '0')).join('')
      sessionStorage.setItem('strapi_google_state', nonce)
      sessionStorage.setItem('strapi_google_return', '/games/memory/#/')
      const callback = new URL('https://jaimegonzalezjr.com/Projects/TimeForge/auth/google')
      callback.searchParams.set('state', nonce)
      window.location.assign('https://strapi.jaimegonzalezjr.com/connect/google?callback=' + encodeURIComponent(callback.href))
    },
    async loadAccount(){
      this.loading = true
      this.authError = ''
      try {
        this.user = (await api.get('/users/me', this.authConfig())).data
        const profiles = (await api.get('/memorygames?portfolioUserId=' + encodeURIComponent(this.user.id), this.authConfig())).data
        if (profiles.length) this.applyProfile(profiles[0])
        else this.playerId = null
        await this.getDB()
      } catch(error) { this.handleError(error) }
      finally { this.loading = false }
    },
    applyProfile(profile){
      const value = Number(profile.score)
      if (!['number', 'string'].includes(typeof profile.score) || String(profile.score).trim() === '' || !Number.isFinite(value) || !Number.isSafeInteger(value) || value < 0) throw new Error('Invalid saved profile value')
      this.playerId = profile.id
      this.username = profile.player
      this.highScore = value
    },
    handleError(error){
      if (error.response && error.response.status === 401) {
        this.user = null
        this.playerId = null
        this.username = null
        this.highScore = null
        this.rows = []
        this.hasWon = false
        this.leaderboards = false
        clearInterval(this.mainTimer)
        this.authError = 'Please sign in with Google to continue.'
      } else {
        this.authError = 'Unable to load or save your account. Please retry.'
      }
      Notify.create({type: 'negative', message: this.authError})
    },
    async logout(){
      this.busy = true
      try {
        localStorage.removeItem('strapi_jwt')
        try { await api.post('/auth/logout', {}, {withCredentials:true}) } catch (_) {}
        window.location.reload()
      } catch(error) { this.handleError(error) }
      finally { this.busy = false }
    },
    async createPlayer(){
      if (this.busy || this.newName.trim().length < 4) return
      this.busy = true
      this.authError = ''
      try {
        this.applyProfile((await api.post('/memorygames', {player: this.newName.trim().toLowerCase()}, this.authConfig())).data)
      } catch(error) {
        if (error.response && error.response.status === 409) {
          if ((error.response.data.message || error.response.data.error) === 'profile_exists') await this.loadAccount()
          else this.authError = 'That name is reserved. Choose another name or contact the administrator to migrate your existing player.'
        } else this.handleError(error)
      } finally { this.busy = false }
    },
    createCatalog(){
      for(let i = 0; i < 10; i++){
        const randInt = Math.floor(Math.random() * this.catalogArray.length)
        const newData = this.catalogArray[randInt]
        this.iconsArray.push(newData)
        this.iconsArray.push(newData)
        this.catalogArray.splice(randInt, 1)
      }
      this.shuffleCards()
    },
    shuffleCards(){
      for(let i = 0; i < 20; i++){
        const tmpMax = this.iconsArray.length
        const index = Math.floor(Math.random() * tmpMax)
        const newData = this.iconsArray[index]
        this.newArray.push(newData)
        this.iconsArray.splice(index, 1)
      }
    },
    refreshPage(){
      window.location.reload()
    },
    timer(){
      this.time++
      this.timeMultiplier--
    },
    reduceMultiplier(){
      this.timeMultiplier -= 10
    },
    testClick(event){
      if (!this.user || !this.playerId) return
      // parent click boolean
      if(this.canClick){
        // start timer
        if(!this.hasStarted){
          this.hasStarted = true
          this.mainTimer = setInterval(this.timer, 1000)
          this.cardColor = ''
        }
        // get/set variables
        const myPath = event.target.parentNode
        // for(let i = 0; i < myPaths.length; i++){
        //   if(myPaths[i].classList.contains('qBtn')){
        //     myPath = event.path[1]
        //   }
        // }
        const myLetter = event.target.innerText
        // turn button blue on click
        if(!myPath.classList.contains('active')){
          myPath.className += ' active'
        }
        // check click
        if(this.firstClick != null){
          // second click event
          this.secondClick = myLetter
          this.secondPath = myPath
          if(this.firstClick == this.secondClick){
            // match success
            this.resetClicks()
          }else{
            // match failed
            this.canClick = false
            this.moves++
            this.triesMultiplier--
            this.resetClicked()
          }
        } else{
          // first click event
          this.firstClick = myLetter
          this.firstPath = myPath
        }
      }
    },
    resetClicks(){
      if(this.confirmed < 9){
        this.confirmed++
      }else{
        this.canClick = false
        clearInterval(this.mainTimer)
        const result = this.timeMultiplier * this.triesMultiplier
        const factor = this.timeMultiplier / this.triesMultiplier
        this.score = Math.round( (result * factor) + result )
        if(this.score > this.highScore){
          this.highScore = this.score
          this.newHighScore = true
        }
        this.hasWon = true
      }
      this.firstClick = null
      this.secondClick = null
      this.firstPath = null
      this.secondPath = null
    },
    resetClicked(){
      setTimeout(() => {
      this.firstClick = null
      this.secondClick = null
      this.firstPath.classList.remove('active')
      this.secondPath.classList.remove('active')
      this.firstPath = null
      this.secondPath = null
      this.canClick = true
      } ,500)
    },
    getIndex(rowz, colz){
      let currRowz = rowz - 1
      let currColz = colz - 1
      let subtract
      if(currRowz == 0){
        subtract = 0
      } else if(currRowz == 1){
        subtract = 6
      } else if(currRowz == 2){
        subtract = 12
      } else if(currRowz == 3){
        subtract = 18
      } else{
        subtract = 24
      }
      let output = [currRowz+""+currColz].join() - subtract
      return output
    },
    async postScore(){
      if (this.busy) return
      this.busy = true
      try {
        await api.put('/memorygames/' + this.playerId, {score: this.highScore}, this.authConfig())
        this.newHighScore = false
        await this.getDB()
        this.hasWon = false
        this.leaderboards = true
      } catch(error) { this.handleError(error) }
      finally { this.busy = false }
    },
    async getDB(){
      this.rows = (await api.get('/memorygames?_sort=score:desc', this.authConfig())).data
    }

  }
})
</script>
<style lang="sass" scoped>
html
  min-width: 351px
.colz
  width: calc(95%/4)!important
@media (min-width: 700px)
  .colz
    width: calc(95%/5)!important
  .qBtn
    font-size: 3em!important

.row > div
  padding: 5px
.qBtn
  margin: 0
  padding: 0
  width: 100%
  height: 100%
  background-color: $primary
  color: transparent
  font-size: 2em
  transition: all 0.5s ease-out
.active
  background-color: $warning
  color: white
  pointer-events: none
  transform: rotateY(180deg)
</style>