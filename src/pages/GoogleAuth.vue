<template>
  <MemoryLayout>
    <q-page class="full-width column flex-center bg-dark text-white q-pa-xl">
      <h1 class="text-h4">Memory Game</h1>
      <p role="status">{{ error || 'Completing your Memory Game sign-in…' }}</p>
      <q-btn v-if="error" href="./" label="Return to Memory Game" color="primary" />
    </q-page>
  </MemoryLayout>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import MemoryLayout from '../layouts/MemoryLayout.vue'
import { completeGoogleLogin } from '../utils/google-auth'

const props = defineProps<{ search: string }>()
const error = ref('')

onMounted(async () => {
  window.history.replaceState(null, '', window.location.pathname)
  try { window.location.replace(await completeGoogleLogin(props.search)) }
  catch (_) { error.value = 'Sign-in could not be completed. Please try again.' }
})
</script>
