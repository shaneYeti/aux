<template>
    <md-list-item
        class="menu-bot"
        :class="{ active: selected }"
        :style="{ 'background-color': backgroundColor }"
        @click="click()"
    >
        <div class="menu-bot-text" v-show="label" :style="{ color: labelColor }">
            {{ label }}
        </div>
    </md-list-item>
</template>
<script src="./MenuBot.ts"></script>
<style src="./MenuBot.css"></style>
