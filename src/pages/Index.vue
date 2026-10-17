<template>
<MemoryLayout>
<q-dialog :model-value="!user || loading || !playerId" persistent>
  <q-card class="q-pa-lg" style="max-width: 440px">
    <h2 class="text-h5">Memory Game</h2>
    <p v-if="loading">Checking your account…</p>
    <template v-else-if="!user">
      <p>Sign in with Google to recover your player on any device.</p>
      <AccountForm @signed-in="loadAccount" />
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
<template #account>
          <q-btn v-if="user" @click="logout" :disable="busy" flat label="Sign out of shared account" />
          <q-btn class="column text-warning" flat icon-right="person">{{username}}</q-btn>
          <q-btn class="column text-secondary" @click="leaderboards = !leaderboards" flat  icon-right="emoji_events">{{highScore}}</q-btn>
</template>
    <q-page class="row full-width justify-center no-margin q-px-sm q-py-lg bg-dark" style="min-width:317px;">
        <div v-for="(colz,index) in newArray" :key="index" class="colz transparent no-border">
            <q-btn :disable="!playerId || !user" rounded class="qBtn no-padding" @click="testClick($event, colz)">
              <q-icon :color="cardColor" class="no-pointer-events flip-horizontal" :name="newArray[index]" />
            </q-btn>
        </div>
    </q-page>
    <template #footer>
        <div class="text-secondary text-h6"><q-icon size="md" name="timer"/>: {{time}}</div>
        <q-btn class="bg-orange"  rounded @click="refreshPage" icon="restart_alt" />
        <div class="text-right text-h6 text-secondary">{{moves}}:<q-icon size="md" name="do_not_touch"/></div>
    </template>

</MemoryLayout>
</template>

<script setup lang="ts">
import type { AxiosRequestConfig } from 'axios'
import type { QTableColumn } from 'quasar'
import { Notify } from 'quasar'
import { onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { api } from '../utils/api'
import AccountForm from '../components/AccountForm.vue'
import MemoryLayout from '../layouts/MemoryLayout.vue'
import { getAccounts, type SharedAccountsClient } from '../utils/google-auth'

type AccountUser = { id: number }
type MemoryProfile = { id: number; player: string; score: number }
const catalog = ['shopping_cart', 'local_florist', 'favorite', 'lightbulb', 'star_rate', 'extension', 'pets', 'nightlight_round', 'photo_camera', 'cookie', 'face', 'thumb_up', 'visibility', 'build', 'savings', 'android', 'thumb_down', 'hourglass_empty', 'anchor', 'music_note', 'brush', 'color_lens', 'flash_on', 'landscape', 'checkroom', 'all_inclusive', 'airport_shuttle', 'sports_bar', 'casino', 'ac_unit', 'fitness_center', 'sports_esports', 'catching_pokemon', 'sports_football', 'cruelty_free', 'piano', 'skateboarding', 'key', 'attach_file', 'attach_money', 'headphones', 'flight', 'lunch_dining', 'two_wheeler', 'icecream']
const newArray = ref<string[]>([])
const time = ref(0)
const firstClick = ref<string | null>(null)
const firstPath = shallowRef<HTMLElement | null>(null)
const secondPath = shallowRef<HTMLElement | null>(null)
const hasStarted = ref(false)
const canClick = ref(true)
const confirmed = ref(0)
let mainTimer: ReturnType<typeof setInterval> | null = null
const hasWon = ref(false)
const username = ref<string | null>(null)
const score = ref(0)
const cardColor = ref('white')
const moves = ref(0)
const playerId = ref<number | null>(null)
const accounts = shallowRef<SharedAccountsClient | null>(null)
const user = shallowRef<AccountUser | null>(null)
const loading = ref(true)
const busy = ref(false)
const newName = ref('')
const authError = ref('')
const highScore = ref<number | null>(null)
const newHighScore = ref(false)
const leaderboards = ref(false)
const timeMultiplier = ref(100)
const triesMultiplier = ref(100)
const rows = ref<MemoryProfile[]>([])
const columns: QTableColumn[] = [
  { name: 'player', required: true, label: 'Player Name', align: 'left', field: 'player', sortable: true },
  { name: 'score', required: true, label: 'Score', align: 'right', field: 'score', sortable: true }
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseUser(value: unknown): AccountUser {
  if (!isRecord(value) || typeof value.id !== 'number' || !Number.isSafeInteger(value.id) || value.id < 1) throw new Error('Invalid account response')
  return { id: value.id }
}

function parseProfile(value: unknown): MemoryProfile {
  if (!isRecord(value) || typeof value.id !== 'number' || !Number.isSafeInteger(value.id) || value.id < 1 || typeof value.player !== 'string') throw new Error('Invalid saved profile')
  const parsedScore = Number(value.score)
  if (!['number', 'string'].includes(typeof value.score) || String(value.score).trim() === '' || !Number.isSafeInteger(parsedScore) || parsedScore < 0) throw new Error('Invalid saved profile value')
  return { id: value.id, player: value.player, score: parsedScore }
}

function parseProfiles(value: unknown): MemoryProfile[] {
  if (!Array.isArray(value)) throw new Error('Invalid profile response')
  return value.map(parseProfile)
}

function authConfig(): AxiosRequestConfig {
  const token = localStorage.getItem(accounts.value?.storageKey() ?? 'strapi_jwt')
  if (!token) throw Object.assign(new Error('Sign in required'), { response: { status: 401 } })
  return { headers: { Authorization: `Bearer ${token}` }, withCredentials: false }
}

function applyProfile(profile: MemoryProfile) {
  playerId.value = profile.id
  username.value = profile.player
  highScore.value = profile.score
}

function errorStatus(error: unknown): number | undefined {
  return isRecord(error) && 'response' in error && isRecord(error.response) && typeof error.response.status === 'number'
    ? error.response.status
    : undefined
}

function errorCode(error: unknown): string | undefined {
  if (!isRecord(error) || !('response' in error) || !isRecord(error.response) || !('data' in error.response) || !isRecord(error.response.data)) return undefined
  const { message, error: code } = error.response.data
  return typeof message === 'string' ? message : typeof code === 'string' ? code : undefined
}

function stopTimer() {
  if (mainTimer !== null) clearInterval(mainTimer)
  mainTimer = null
}

function handleError(error: unknown) {
  if (errorStatus(error) === 401) {
    user.value = null
    playerId.value = null
    username.value = null
    highScore.value = null
    rows.value = []
    hasWon.value = false
    leaderboards.value = false
    stopTimer()
    authError.value = 'Please sign in with Google to continue.'
  } else {
    authError.value = 'Unable to load or save your account. Please retry.'
  }
  Notify.create({ type: 'negative', message: authError.value })
}

async function getDB() {
  rows.value = parseProfiles((await api.get<unknown>('/memorygames?_sort=score:desc', authConfig())).data)
}

async function loadAccount() {
  loading.value = true
  authError.value = ''
  try {
    accounts.value = await getAccounts()
    user.value = parseUser((await api.get<unknown>('/users/me', authConfig())).data)
    const profiles = parseProfiles((await api.get<unknown>(`/memorygames?portfolioUserId=${encodeURIComponent(user.value.id)}`, authConfig())).data)
    const profile = profiles[0]
    if (profile) applyProfile(profile)
    else playerId.value = null
    await getDB()
  } catch (error) { handleError(error) }
  finally { loading.value = false }
}

async function logout() {
  busy.value = true
  try {
    localStorage.removeItem(accounts.value?.storageKey() ?? 'strapi_jwt')
    try { await api.post('/auth/logout', {}, { withCredentials: true }) } catch (_) {}
    window.location.reload()
  } catch (error) { handleError(error) }
  finally { busy.value = false }
}

async function createPlayer() {
  if (busy.value || newName.value.trim().length < 4) return
  busy.value = true
  authError.value = ''
  try {
    applyProfile(parseProfile((await api.post<unknown>('/memorygames', { player: newName.value.trim().toLowerCase() }, authConfig())).data))
  } catch (error) {
    if (errorStatus(error) === 409) {
      if (errorCode(error) === 'profile_exists') await loadAccount()
      else authError.value = 'That name is reserved. Choose another name or contact the administrator to migrate your existing player.'
    } else handleError(error)
  } finally { busy.value = false }
}

function createCatalog() {
  const available = [...catalog]
  const pairs: string[] = []
  for (let index = 0; index < 10; index++) {
    const randomIndex = Math.floor(Math.random() * available.length)
    const [icon] = available.splice(randomIndex, 1)
    if (!icon) throw new Error('Unable to create the card catalog')
    pairs.push(icon, icon)
  }
  while (pairs.length > 0) {
    const randomIndex = Math.floor(Math.random() * pairs.length)
    const [icon] = pairs.splice(randomIndex, 1)
    if (!icon) throw new Error('Unable to shuffle the card catalog')
    newArray.value.push(icon)
  }
}

function refreshPage() { window.location.reload() }

function timer() {
  time.value++
  timeMultiplier.value--
}

function resetClicks() {
  if (confirmed.value < 9) confirmed.value++
  else {
    canClick.value = false
    stopTimer()
    const result = timeMultiplier.value * triesMultiplier.value
    const factor = timeMultiplier.value / triesMultiplier.value
    score.value = Math.round((result * factor) + result)
    if (score.value > (highScore.value ?? 0)) {
      highScore.value = score.value
      newHighScore.value = true
    }
    hasWon.value = true
  }
  firstClick.value = null
  firstPath.value = null
  secondPath.value = null
}

function resetClicked() {
  window.setTimeout(() => {
    firstClick.value = null
    firstPath.value?.classList.remove('active')
    secondPath.value?.classList.remove('active')
    firstPath.value = null
    secondPath.value = null
    canClick.value = true
  }, 500)
}

function testClick(event: Event, icon: string) {
  if (!user.value || !playerId.value || !canClick.value || !(event.currentTarget instanceof HTMLElement)) return
  if (!hasStarted.value) {
    hasStarted.value = true
    mainTimer = setInterval(timer, 1000)
    cardColor.value = ''
  }
  const card = event.currentTarget
  card.classList.add('active')
  if (firstClick.value === null) {
    firstClick.value = icon
    firstPath.value = card
    return
  }
  secondPath.value = card
  if (firstClick.value === icon) resetClicks()
  else {
    canClick.value = false
    moves.value++
    triesMultiplier.value--
    resetClicked()
  }
}

async function postScore() {
  if (busy.value || playerId.value === null || highScore.value === null) return
  busy.value = true
  try {
    await api.put(`/memorygames/${playerId.value}`, { score: highScore.value }, authConfig())
    newHighScore.value = false
    await getDB()
    hasWon.value = false
    leaderboards.value = true
  } catch (error) { handleError(error) }
  finally { busy.value = false }
}

createCatalog()
onMounted(loadAccount)
onBeforeUnmount(stopTimer)
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
