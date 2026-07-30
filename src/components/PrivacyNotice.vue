<template>
  <div class="privacy-box">
    {{ message }}
  </div>
</template>

<script setup>
import { PRIVACY_MESSAGE } from '../utils/constants.js'
const message = PRIVACY_MESSAGE
</script>
