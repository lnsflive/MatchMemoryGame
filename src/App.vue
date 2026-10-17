<template>
  <GoogleAuth v-if="isAuthReturn" :search="authSearch" />
  <router-view v-else id="q-app" />
</template>
<script setup lang="ts">
import GoogleAuth from './pages/GoogleAuth.vue'

defineOptions({ name: 'App' })

const authSearch = window.__memoryAuthReturn || window.location.search
delete window.__memoryAuthReturn
const query = new URLSearchParams(authSearch)
const isAuthReturn = ['state', 'access_token', 'error'].some(key => query.has(key))
</script>
