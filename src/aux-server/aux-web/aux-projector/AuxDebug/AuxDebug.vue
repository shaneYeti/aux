<template>
    <div class="aux-debug">
        <md-button @click="download">
            <md-icon>cloud_download</md-icon>
            <span>Download Channel</span>
        </md-button>
        <md-button @click="upload">
            <md-icon>cloud_upload</md-icon>
            <span>Upload Channel</span>
        </md-button>
        <div class="search">
            <md-field>
                <md-icon>search</md-icon>
                <label>Search...</label>
                <md-input v-model="search"></md-input>
            </md-field>
            <md-switch v-model="includeDestroyed">Include Destroyed</md-switch>
        </div>
        <div class="json-content">
            <tree-view
                :data="auxJson"
                :options="{ limitRenderDepth: true, maxDepth: 2 }"
            ></tree-view>
        </div>
    </div>
</template>
<script src="./AuxDebug.ts"></script>
<style src="./AuxDebug.css"></style>
