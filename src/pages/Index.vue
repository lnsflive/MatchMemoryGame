<template>
  <MemoryLayout>
    <template #account>
      <div v-if="user" class="memory-account">
        <q-btn flat no-caps icon="leaderboard" label="Leaderboard" class="leaderboard-trigger" @click="leaderboards = true" />
        <q-btn flat no-caps class="memory-player" aria-label="Account menu">
          <span class="player-avatar" aria-hidden="true">{{ username?.charAt(0).toUpperCase() || 'P' }}</span>
          <span class="player-name">{{ username }}</span>
          <q-icon name="expand_more" size="18px" />
          <q-menu anchor="bottom right" self="top right">
            <q-list style="min-width: 180px">
              <q-item-label header>{{ username }}</q-item-label>
              <q-item v-close-popup clickable :disable="busy" @click="logout">
                <q-item-section avatar><q-icon name="logout" /></q-item-section>
                <q-item-section>Sign out</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
      </div>
    </template>

    <main class="memory-board-page">
      <div class="game-workspace">
        <section class="game-overview" aria-label="Game information">
          <div class="game-intro">
            <span class="eyebrow">A LITTLE FOCUS GOES A LONG WAY</span>
            <h1>Find your<br /> next <em>match.</em></h1>
            <p>Turn two cards. Find a pair.<br /> See what you remember.</p>
          </div>

          <div class="game-stats">
            <div class="game-stat">
              <span class="stat-label"><q-icon name="schedule" /> Time</span>
              <strong>{{ formattedTime }}</strong>
            </div>
            <div class="game-stat">
              <span class="stat-label"><q-icon name="touch_app" /> Misses</span>
              <strong>{{ mismatches.toString().padStart(2, '0') }}</strong>
            </div>
            <div class="game-stat game-stat--best">
              <span class="stat-label"><q-icon name="emoji_events" /> Personal best</span>
              <strong>{{ formatScore(highScore ?? 0) }}</strong>
            </div>
          </div>

          <div class="pair-progress">
            <div class="pair-progress__label">
              <span>Pairs found</span>
              <strong>{{ matchedPairs }} <span>/ 10</span></strong>
            </div>
            <div class="progress-track" role="progressbar" :aria-valuenow="matchedPairs" aria-valuemin="0" aria-valuemax="10" aria-label="Pairs found">
              <span v-for="pair in 10" :key="pair" :class="{ 'is-complete': pair <= matchedPairs }" />
            </div>
          </div>

          <q-btn class="memory-restart" unelevated no-caps icon="restart_alt" label="New game" aria-label="Restart game" @click="requestRestart" />
          <span class="game-note">Your first flip starts the clock.</span>
        </section>

        <section class="board-section" aria-label="Memory game">
          <div class="board-heading">
            <span><span class="status-dot" /> {{ matchedPairs === 10 ? 'ALL PAIRS FOUND' : hasStarted ? 'GAME IN PROGRESS' : 'READY WHEN YOU ARE' }}</span>
            <span class="board-heading__size">20 CARDS · 10 PAIRS</span>
          </div>
          <div class="memory-board" aria-label="Memory game board">
            <button
              v-for="(card, index) in cards"
              :key="card.id"
              type="button"
              :disabled="!playerId || !user"
              :aria-label="cardLabel(card, index)"
              :aria-disabled="card.state !== 'hidden' || !canClick"
              :class="['memory-card', `memory-card--${card.state}`]"
              @click="selectCard(card)"
            >
              <span v-if="card.state === 'hidden'" class="card-back" aria-hidden="true">
                <span class="card-back__mark"><span /><span /><span /><span /></span>
              </span>
              <template v-else>
                <q-icon class="memory-card__symbol" :name="card.icon.name" />
                <q-icon v-if="card.state === 'matched'" class="memory-card__matched" name="check" />
              </template>
            </button>
          </div>
          <div class="board-caption">
            <span class="game-feedback" role="status">{{ gameFeedback }}</span>
            <span class="board-legend"><i /> Matched</span>
          </div>
        </section>
      </div>
    </main>

    <template #footer>
      <span>TWENTY CARDS. TEN CONNECTIONS.</span>
      <span>Play with touch, mouse, or keyboard.</span>
    </template>

    <q-dialog :model-value="!user || loading || !playerId" persistent>
      <q-card class="game-dialog auth-card">
        <span class="dialog-kicker">WELCOME TO MATCH MEMORY</span>
        <h2 class="dialog-title">A fresh deck.<br />A familiar player.</h2>
        <p v-if="loading" role="status">Getting your player ready…</p>
        <template v-else-if="!user">
          <p>Sign in with Google to save your best score and pick up on any device.</p>
          <AccountForm @signed-in="loadAccount" />
          <q-btn flat no-caps @click="loadAccount" label="Retry sign-in" />
        </template>
        <form v-else @submit.prevent="createPlayer">
          <p>Choose your player name. Existing names need an administrator to link them to your account.</p>
          <q-input v-model="newName" label="Player name" maxlength="30" />
          <q-btn type="submit" :disable="busy || newName.trim().length < 4" no-caps label="Create player" color="primary" />
          <q-btn @click="logout" :disable="busy" flat no-caps label="Sign out" />
        </form>
        <p v-if="authError" class="auth-error" role="alert">{{ authError }}</p>
      </q-card>
    </q-dialog>

    <q-dialog v-model="hasWon" persistent>
      <q-card class="game-dialog result-card">
        <div class="result-medal"><q-icon name="emoji_events" /></div>
        <span class="dialog-kicker">ALL TEN PAIRS, FOUND.</span>
        <h2 class="dialog-title">{{ newHighScore ? 'A new personal best.' : 'Nicely remembered.' }}</h2>
        <div class="result-score">{{ formatScore(score) }} <span>points</span></div>
        <div class="result-details"><span>{{ formattedTime }} elapsed</span><span>{{ mismatches }} misses</span></div>
        <div class="result-card__actions">
          <q-btn v-if="newHighScore" @click="postScore" :loading="busy" unelevated no-caps class="dialog-primary" label="Save to leaderboard" />
          <q-btn @click="resetGame" flat no-caps color="primary" label="Play again" :disable="busy" />
        </div>
      </q-card>
    </q-dialog>

    <q-dialog v-model="leaderboards">
      <q-card class="game-dialog leaderboard-card">
        <div class="dialog-heading">
          <span class="dialog-kicker">A LITTLE FRIENDLY COMPETITION</span>
          <q-btn v-close-popup flat round dense icon="close" aria-label="Close leaderboard" />
        </div>
        <h2 class="dialog-title">The leaderboard.</h2>
        <q-table
          flat
          class="leaderboard-table"
          :rows="rows"
          :columns="columns"
          row-key="id"
          :rows-per-page-options="[5]"
          v-model:pagination="leaderboardPagination"
        >
          <template #body-cell-player="props">
            <q-td :props="props">
              <span class="leaderboard-name" :class="{ 'leaderboard-name--you': props.row.id === playerId }">
                {{ props.row.player }} <small v-if="props.row.id === playerId">YOU</small>
              </span>
            </q-td>
          </template>
        </q-table>
        <div class="leaderboard-bottom">
          <span>Your best <strong>{{ formatScore(highScore ?? 0) }}</strong></span>
          <q-btn v-close-popup unelevated no-caps class="dialog-primary" label="Back to game" />
        </div>
      </q-card>
    </q-dialog>
  </MemoryLayout>
</template>

<script setup lang="ts">
import type { AxiosRequestConfig } from 'axios'
import type { QTableColumn } from 'quasar'
import { Dialog, Notify } from 'quasar'
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { api } from '../utils/api'
import AccountForm from '../components/AccountForm.vue'
import MemoryLayout from '../layouts/MemoryLayout.vue'
import { getAccounts, type SharedAccountsClient } from '../utils/google-auth'

type AccountUser = { id: number }
type MemoryProfile = { id: number; player: string; score: number }
type CardState = 'hidden' | 'revealed' | 'matched'
type IconDefinition = { name: string; label: string }
type MemoryCard = { id: string; icon: IconDefinition; state: CardState }
// TODO(scoring-history): Store an immutable record for every completed game before designing scoring v2.
// Record scoringVersion, score, durationMs, matches, mismatches, pairAttempts, cardCount,
// a server-generated completedAt value, and clientVersion. Keep the player profile separate
// and point it to the best run instead of overwriting the only result. On this ten-pair board,
// pairAttempts equals 10 + mismatches and cardFlips equals pairAttempts * 2. Have the API
// calculate the score from the raw inputs.
// If cheat resistance matters, let the server own the run start and completion timestamps too.
const catalog = [
  { name: 'favorite', label: 'heart' },
  { name: 'star_rate', label: 'star' },
  { name: 'pets', label: 'paw' },
  { name: 'flight', label: 'airplane' },
  { name: 'anchor', label: 'anchor' },
  { name: 'key', label: 'key' },
  { name: 'photo_camera', label: 'camera' },
  { name: 'lightbulb', label: 'light bulb' },
  { name: 'music_note', label: 'music note' },
  { name: 'extension', label: 'puzzle piece' },
  { name: 'cookie', label: 'cookie' },
  { name: 'sports_esports', label: 'game controller' },
  { name: 'local_florist', label: 'flower' },
  { name: 'savings', label: 'piggy bank' },
  { name: 'icecream', label: 'ice cream' },
  { name: 'sports_bar', label: 'drink' },
  { name: 'android', label: 'android' },
  { name: 'piano', label: 'piano' },
  { name: 'two_wheeler', label: 'motorcycle' },
  { name: 'casino', label: 'dice' }
] satisfies readonly IconDefinition[]
const cards = ref<MemoryCard[]>([])
const time = ref(0)
const firstCard = shallowRef<MemoryCard | null>(null)
const hasStarted = ref(false)
const canClick = ref(true)
const matchedPairs = ref(0)
let mainTimer: ReturnType<typeof setInterval> | null = null
let mismatchTimer: number | null = null
const hasWon = ref(false)
const username = ref<string | null>(null)
const score = ref(0)
const mismatches = ref(0)
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
const leaderboardPagination = ref({ sortBy: 'score', descending: true, page: 1, rowsPerPage: 5 })
const timeMultiplier = ref(100)
const triesMultiplier = ref(100)
const rows = ref<MemoryProfile[]>([])
const formattedTime = computed(() => {
  const minutes = Math.floor(time.value / 60)
  const seconds = String(time.value % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
})
const gameFeedback = computed(() => {
  if (matchedPairs.value === 10) return 'All pairs found. Nicely done.'
  if (!canClick.value) return 'Not a pair. Remember these for later.'
  if (firstCard.value) return 'One card turned. Find its partner.'
  if (matchedPairs.value > 0) return 'A pair found. Keep the connections coming.'
  return 'Pick any card. Your first flip starts the clock.'
})
const scoreFormatter = new Intl.NumberFormat('en-US')
function formatScore(value: number): string { return scoreFormatter.format(value) }
const columns: QTableColumn[] = [
  { name: 'player', required: true, label: 'Player Name', align: 'left', field: 'player', sortable: true },
  { name: 'score', required: true, label: 'Score', align: 'right', field: 'score', sortable: true, format: (value: number) => formatScore(value) }
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

function stopTimers() {
  if (mainTimer !== null) clearInterval(mainTimer)
  if (mismatchTimer !== null) clearTimeout(mismatchTimer)
  mainTimer = null
  mismatchTimer = null
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
    resetGame()
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
  const deck: MemoryCard[] = []
  for (let pairIndex = 0; pairIndex < 10; pairIndex++) {
    const icon = takeRandom(available)
    deck.push(
      { id: `${pairIndex}-a`, icon, state: 'hidden' },
      { id: `${pairIndex}-b`, icon, state: 'hidden' }
    )
  }
  const shuffled: MemoryCard[] = []
  while (deck.length > 0) shuffled.push(takeRandom(deck))
  cards.value = shuffled
}

function takeRandom<T>(items: T[]): T {
  const randomIndex = Math.floor(Math.random() * items.length)
  const [item] = items.splice(randomIndex, 1)
  if (item === undefined) throw new Error('Unable to build the card deck')
  return item
}

function resetGame() {
  stopTimers()
  firstCard.value = null
  hasStarted.value = false
  canClick.value = true
  matchedPairs.value = 0
  mismatches.value = 0
  time.value = 0
  score.value = 0
  timeMultiplier.value = 100
  triesMultiplier.value = 100
  hasWon.value = false
  newHighScore.value = false
  leaderboards.value = false
  createCatalog()
}

function requestRestart() {
  if (!hasStarted.value || matchedPairs.value === 10) {
    resetGame()
    return
  }
  Dialog.create({
    title: 'Restart game?',
    message: 'Your current game will be lost.',
    cancel: true,
    persistent: true,
    ok: { label: 'Restart', color: 'negative' }
  }).onOk(resetGame)
}

function timer() {
  time.value++
  timeMultiplier.value--
}

function finishGame() {
  canClick.value = false
  stopTimers()
  // TODO(scoring-v2): Replace this formula only with a versioned leaderboard migration.
  // Let t = 100 - elapsed seconds and m = 100 - mismatches. The formula simplifies to
  // score = t * (t + m), with a best score of 20,000. Near that maximum, one second costs
  // about 299 points while one mismatch costs 100, so the formula favors speed heavily.
  // At 100 mismatches, division by zero produces NaN. Longer games can produce negative
  // or rising scores because both multipliers continue below zero.
  //
  // A saved score does not usually identify its original inputs. For example, 11,550 can
  // represent 23 seconds and 27 mismatches, 25 seconds and 21 mismatches, or 30 seconds and
  // 5 mismatches. Of 5,781 scores reachable within 0 to 99 seconds and mismatches, 2,358 have
  // more than one input pair. An importer may enumerate valid pairs, but guessed values must
  // be marked as inferred rather than treated as recorded game data.
  //
  // Preserve existing scores in a read-only v1 leaderboard. Start recording raw v1 runs now,
  // tune v2 from those runs, and start a separate v2 leaderboard. If old scores must appear in
  // v2, mark them as provisional migrated scores. Do not base scoring on the current high score,
  // because that target changes whenever a player sets a record.
  const result = timeMultiplier.value * triesMultiplier.value
  const factor = timeMultiplier.value / triesMultiplier.value
  score.value = Math.round((result * factor) + result)
  newHighScore.value = score.value > (highScore.value ?? 0)
  hasWon.value = true
}

function selectCard(card: MemoryCard) {
  if (!user.value || !playerId.value || !canClick.value || card.state !== 'hidden') return
  if (!hasStarted.value) {
    hasStarted.value = true
    mainTimer = setInterval(timer, 1000)
  }

  card.state = 'revealed'
  const first = firstCard.value
  if (first === null) {
    firstCard.value = card
    return
  }

  if (first.icon.name === card.icon.name) {
    first.state = 'matched'
    card.state = 'matched'
    firstCard.value = null
    matchedPairs.value++
    if (matchedPairs.value === 10) finishGame()
    return
  }

  canClick.value = false
  mismatches.value++
  triesMultiplier.value--
  mismatchTimer = window.setTimeout(() => {
    first.state = 'hidden'
    card.state = 'hidden'
    firstCard.value = null
    canClick.value = true
    mismatchTimer = null
  }, 650)
}

function cardLabel(card: MemoryCard, index: number): string {
  if (card.state === 'hidden') return `Card ${index + 1}, face down`
  if (card.state === 'matched') return `Card ${index + 1}, matched ${card.icon.label}`
  return `Card ${index + 1}, ${card.icon.label}`
}

async function postScore() {
  if (busy.value || playerId.value === null || highScore.value === null) return
  busy.value = true
  try {
    // TODO(scoring-history): This endpoint currently saves only the player's best score.
    // Change it to submit the completed run inputs above. Let the API append the run,
    // calculate its versioned score, and update the player's best-run reference atomically.
    await api.put(`/memorygames/${playerId.value}`, { score: score.value }, authConfig())
    highScore.value = score.value
    newHighScore.value = false
    await getDB()
    hasWon.value = false
    leaderboards.value = true
  } catch (error) { handleError(error) }
  finally { busy.value = false }
}

createCatalog()
onMounted(loadAccount)
onBeforeUnmount(stopTimers)
</script>
<style lang="scss" scoped>
.game-workspace {
  --game-ink: #f2f0e9;
  --game-muted: #9caeb9;
  --game-orange: #ffb347;
  --game-mint: #a9d6c5;
  display: grid;
  grid-template-columns: 245px minmax(0, 1fr);
  gap: clamp(32px, 5vw, 72px);
  width: min(100%, 1020px);
  margin: auto;
  color: var(--game-ink);
}
.memory-board-page { display: flex; flex: 1; padding: 44px 28px; }
.game-overview { display: flex; flex-direction: column; align-items: flex-start; padding-top: 30px; }
.eyebrow, .board-heading, .game-note, .stat-label, .board-caption { color: var(--game-muted); }
.eyebrow { font-size: 9px; letter-spacing: 1.65px; font-weight: 600; }
.game-intro h1 { font-size: clamp(40px, 4vw, 48px); line-height: 1.08; letter-spacing: -2px; font-weight: 650; margin: 18px 0; }
.game-intro h1 em { color: var(--game-orange); font-style: normal; }
.game-intro p { color: var(--game-muted); font-size: 14px; line-height: 1.8; margin: 0; }
.game-stats { display: grid; grid-template-columns: 1fr 1fr; width: 100%; gap: 25px 20px; margin: 34px 0 28px; }
.game-stat { display: flex; flex-direction: column; gap: 8px; }
.stat-label { display: flex; align-items: center; gap: 6px; font-size: 12px; }
.stat-label .q-icon { font-size: 16px; }
.game-stat strong { font-size: 30px; font-weight: 500; line-height: 1; font-variant-numeric: tabular-nums; letter-spacing: -1px; }
.game-stat--best { grid-column: 1 / -1; padding-top: 20px; border-top: 1px solid #ffffff12; }
.game-stat--best strong { font-size: 24px; color: var(--game-orange); }
.pair-progress { width: 100%; margin-bottom: 28px; }
.pair-progress__label { display: flex; justify-content: space-between; align-items: center; font-size: 12px; margin-bottom: 12px; color: var(--game-muted); }
.pair-progress__label strong { color: var(--game-ink); font-size: 16px; font-variant-numeric: tabular-nums; }
.pair-progress__label strong span { color: var(--game-muted); font-size: 12px; font-weight: 400; }
.progress-track { display: flex; gap: 4px; }
.progress-track > span { flex: 1; height: 5px; border-radius: 4px; background: #304452; transition: background .2s; }
.progress-track .is-complete { background: var(--game-mint); }
.memory-restart { width: 100%; min-height: 44px; border: 1px solid #647683; border-radius: 10px; font-size: 13px; color: var(--game-ink); }
.game-note { margin: 12px auto 0; font-size: 11px; }
.board-heading { display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 9px; font-weight: 500; letter-spacing: 1.4px; min-height: 24px; margin-bottom: 14px; }
.board-heading > span:first-child { display: flex; align-items: center; gap: 8px; }
.status-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--game-orange); }
.memory-board { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; }
.memory-card {
  display: grid; place-items: center; position: relative; min-width: 0; min-height: 44px;
  width: 100%; aspect-ratio: 1; padding: 0; border: 1px solid #4a6172;
  border-radius: 13px; background: #263f51; color: #d0b28a;
  box-shadow: 0 4px 0 #0c1822, inset 0 1px 0 #ffffff08;
  cursor: pointer; -webkit-tap-highlight-color: transparent;
  transition: transform .18s ease, background-color .18s ease, border-color .18s ease, box-shadow .18s ease;
}
.memory-card:focus-visible { outline: 3px solid #f2f0e9; outline-offset: 4px; z-index: 1; }
.memory-card:disabled { cursor: default; }
.card-back { position: absolute; inset: 6px; border: 1px solid #ffffff0d; border-radius: 8px; display: grid; place-items: center; background-image: radial-gradient(#ffffff12 .7px, transparent .7px); background-size: 7px 7px; }
.card-back__mark { display: grid; grid-template-columns: repeat(2, 9px); gap: 4px; transform: rotate(-12deg); padding: 7px; background: #263f51; }
.card-back__mark > span { width: 9px; height: 9px; border: 1.5px solid #b7a17f; border-radius: 2px; }
.card-back__mark > span:first-child, .card-back__mark > span:last-child { background: #b7a17f; }
.memory-card--revealed { background: var(--game-orange); color: #192c3b; border-color: #ffd49a; transform: translateY(-2px); box-shadow: 0 6px 0 #80561f; }
.memory-card--matched { background: var(--game-mint); border-color: #c2eadb; color: #183d35; box-shadow: 0 2px 0 #426b5b; transform: translateY(2px); }
.memory-card__symbol { font-size: clamp(30px, 4vw, 52px); }
.memory-card__matched { position: absolute; top: 8px; right: 8px; font-size: 14px; }
.board-caption { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 40px; padding-top: 12px; font-size: 11px; }
.board-legend { display: flex; align-items: center; gap: 6px; white-space: nowrap; }
.board-legend i { width: 7px; height: 7px; background: var(--game-mint); border-radius: 2px; }
.memory-account { display: flex; align-items: center; gap: 16px; }
.leaderboard-trigger { color: #d2dce1; font-size: 12px; min-height: 44px; }
.leaderboard-trigger :deep(.q-icon) { font-size: 18px; margin-right: 8px; }
.memory-player { min-height: 44px; padding: 0; border-radius: 8px; color: #e5e9ea; }
.memory-player :deep(.q-btn__content) { flex-wrap: nowrap; gap: 8px; }
.player-avatar { display: grid; place-items: center; width: 30px; height: 30px; border: 1px solid #627a87; border-radius: 50%; background: #263f51; color: #ffbe64; font-size: 12px; }
.player-name { max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; }
.game-dialog { background: #f4f1e9; color: #203444; padding: 32px; border-radius: 20px; box-shadow: 0 24px 90px #0005; }
.auth-card, .result-card { width: min(92vw, 430px); }
.dialog-kicker { display: block; color: #5e6e76; font-size: 9px; font-weight: 600; letter-spacing: 1.7px; }
.dialog-title { font-size: 32px; line-height: 1.15; letter-spacing: -1px; font-weight: 600; margin: 18px 0 24px; }
.auth-card p { line-height: 1.7; color: #52646d; }
.auth-error { color: #a32e24 !important; }
.result-card { text-align: center; }
.result-medal { display: grid; place-items: center; width: 64px; height: 64px; background: #ffdb9f; color: #704916; border-radius: 50%; font-size: 32px; margin: 0 auto 24px; }
.result-score { font-size: 52px; letter-spacing: -2px; font-weight: 600; }
.result-score span { display: block; font-size: 12px; color: #64747b; font-weight: 400; letter-spacing: 0; }
.result-details { display: flex; justify-content: center; gap: 24px; font-size: 12px; color: #52646d; margin: 20px 0 28px; }
.result-card__actions { display: flex; flex-direction: column; gap: 8px; }
.dialog-primary { background: #203444; color: #f4f1e9; border-radius: 9px; min-height: 44px; }
.leaderboard-card { width: min(94vw, 560px); max-height: 90dvh; overflow-y: auto; }
.dialog-heading { display: flex; align-items: center; justify-content: space-between; }
.leaderboard-table { background: transparent; }
.leaderboard-table :deep(th) { color: #60717b; }
.leaderboard-table :deep(td) { height: 56px; border-color: #20344412; }
.leaderboard-name { font-weight: 500; }
.leaderboard-name small { background: #dce8de; color: #2d5842; border-radius: 4px; padding: 3px 5px; margin-left: 8px; font-size: 9px; }
.leaderboard-bottom { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 24px; font-size: 12px; }
.leaderboard-bottom strong { display: block; font-size: 20px; margin-top: 4px; }
@media (hover: hover) {
  .memory-card--hidden:not(:disabled):hover { transform: translateY(-3px); background: #304e61; border-color: #9d9989; box-shadow: 0 7px 0 #0c1822; }
}
@media (max-width: 1000px) and (min-width: 701px) {
  .game-workspace { display: flex; flex-direction: column; max-width: 660px; gap: 28px; }
  .game-overview { display: grid; grid-template-columns: 1fr auto; padding: 0; gap: 20px 24px; align-items: center; }
  .game-intro { grid-column: 1 / -1; }
  .game-intro h1 { font-size: 42px; margin: 12px 0 0; }
  .game-intro h1 br, .game-intro p { display: none; }
  .game-stats { grid-column: 1 / -1; grid-template-columns: repeat(3, 1fr); margin: 0; }
  .game-stat--best { grid-column: auto; padding: 0; border: 0; }
  .pair-progress { margin: 0; }
  .memory-restart { min-width: 140px; }
  .game-note { display: none; }
}
@media (max-width: 700px) {
  .memory-board-page { padding: 20px 20px 12px; }
  .game-workspace { display: flex; flex-direction: column; gap: 16px; max-width: 470px; }
  .game-overview { padding: 0; display: grid; grid-template-columns: 1fr auto; gap: 12px 16px; align-items: center; }
  .game-intro { grid-column: 1 / -1; }
  .eyebrow { font-size: 8px; letter-spacing: 1.25px; }
  .game-intro h1 { font-size: 34px; line-height: 1.1; letter-spacing: -1.2px; margin: 8px 0; }
  .game-intro h1 br { display: none; }
  .game-intro p { font-size: 12px; line-height: 1.4; }
  .game-intro p br { display: none; }
  .game-stats { margin: 0; gap: 20px; grid-template-columns: auto auto auto; grid-column: 1 / -1; }
  .game-stat { gap: 6px; }
  .game-stat strong { font-size: 25px; }
  .stat-label { font-size: 10px; }
  .game-stat--best { grid-column: auto; border: 0; padding: 0; }
  .game-stat--best strong { font-size: 25px; }
  .pair-progress { margin: 0; }
  .pair-progress__label { margin-bottom: 7px; font-size: 11px; }
  .memory-restart { width: auto; min-width: 110px; min-height: 44px; }
  .game-note { display: none; }
  .board-heading { display: none; }
  .memory-board { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
  .memory-card { border-radius: 11px; }
  .memory-card__symbol { font-size: clamp(28px, 8vw, 40px); }
  .board-caption { font-size: 10px; min-height: 32px; }
  .memory-account { gap: 6px; }
  .player-name { display: none; }
  .leaderboard-trigger { padding-inline: 8px; }
  .leaderboard-trigger :deep(.q-icon) { margin-right: 5px; }
}
@media (orientation: landscape) and (max-height: 600px) {
  .memory-board-page { padding: 14px 24px 8px; }
  .game-workspace { display: grid; grid-template-columns: 180px minmax(0, 1fr); gap: 24px; max-width: 960px; }
  .game-overview { display: flex; padding: 0; gap: 0; }
  .eyebrow, .game-intro p, .game-note, .board-heading { display: none; }
  .game-intro h1 { font-size: 30px; margin: 0 0 16px; letter-spacing: -1px; }
  .game-intro h1 br { display: none; }
  .game-stats { width: 100%; margin: 0 0 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .game-stat--best { display: none; }
  .game-stat strong { font-size: 24px; }
  .pair-progress { margin-bottom: 14px; }
  .pair-progress__label { margin-bottom: 7px; }
  .memory-restart { min-height: 38px; }
  .memory-board { grid-template-columns: repeat(5, minmax(0, 1fr)); grid-template-rows: repeat(4, minmax(0, 1fr)); gap: 8px; height: min(340px, calc(100dvh - 150px)); }
  .memory-card { height: 100%; aspect-ratio: auto; min-height: 32px; border-radius: 9px; }
  .memory-card__symbol { font-size: clamp(24px, 7vh, 36px); }
  .card-back { inset: 4px; }
  .card-back__mark { transform: scale(.7) rotate(-12deg); }
  .board-caption { min-height: 28px; padding-top: 8px; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { transition: none !important; animation: none !important; }
}
</style>
