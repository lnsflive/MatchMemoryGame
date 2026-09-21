<template>
  <MemoryLayout>
    <q-page class="full-width column flex-center bg-dark text-white q-pa-xl">
      <h1 class="text-h4">Memory Game</h1>
      <p role="status">{{ error || 'Completing your Memory Game sign-in…' }}</p>
      <q-btn v-if="error" href="./" label="Return to Memory Game" color="primary" />
    </q-page>
  </MemoryLayout>
</template>
<script>
import MemoryLayout from 'layouts/MemoryLayout.vue'
import { completeGoogleLogin } from 'src/utils/google-auth'
export default {
  components: {MemoryLayout},
  props: {search: {type:String, required:true}},
  data: () => ({error:''}),
  async mounted() {
    const search = this.search
    window.history.replaceState(null, '', window.location.pathname)
    try { window.location.replace(await completeGoogleLogin(search)) }
    catch (_) { this.error = 'Sign-in could not be completed. Please try again.' }
  }
}
</script>
