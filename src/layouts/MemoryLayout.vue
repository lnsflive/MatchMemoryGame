<template>
  <q-layout view="hHh lpR fFf" class="full-width full-height">
    <q-header class="row full-width justify-center shadow-5 q-py-sm q-px-lg" style="min-width:317px;">
      <div class="row">
        <q-img class="row" src="img/logo.png" alt="Memory Game" fit="contain" style="max-height:80px;max-width:400px;" />
        <div class="row no-wrap"><slot name="account" /></div>
      </div>
    </q-header>
    <q-page-container class="row full-height full-width"><slot /></q-page-container>
    <q-footer v-if="$slots.footer" class="justify-around row no-wrap full-width q-pa-sm" style="min-width:317px;"><slot name="footer" /></q-footer>
  </q-layout>
</template>
<script>
export default {name:'MemoryLayout'}
</script>
