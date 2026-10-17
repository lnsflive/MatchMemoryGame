<template><div><div ref="form" /><p v-if="error" role="alert">{{ error }}</p></div></template>
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'
import { mountAccountForm, type MountedAccountForm } from '../utils/google-auth'

const emit = defineEmits<{ 'signed-in': [] }>()
const form = useTemplateRef<HTMLDivElement>('form')
const error = ref('')
let accountForm: MountedAccountForm | null = null

onMounted(async () => {
  if (!form.value) {
    error.value = 'Account form could not be displayed. Please retry.'
    return
  }
  try { accountForm = await mountAccountForm(form.value, () => emit('signed-in')) }
  catch (cause) { error.value = cause instanceof Error ? cause.message : 'Account service unavailable. Please retry.' }
})

onBeforeUnmount(() => accountForm?.destroy())
</script>
