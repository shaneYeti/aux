<template>
    <div>
        <game-view
            v-if="!isLoading"
            class="game-view"
            @onContextMenu="handleContextMenu"
            @onContextMenuHide="hideContextMenu"
            :debug="debug"
            :channelId="channelId"
        >
            <div class="ui-container">
                <md-card
                    ref="card"
                    class="info-card"
                    :class="{ maximized: this.setLargeSheet }"
                    v-if="isOpen && botsMode && isVis"
                >
                    <md-card-content>
                        <bot-table
                            ref="table"
                            class="bots-table"
                            @closeWindow="toggleOpen()"
                            @tagFocusChanged="tagFocusChanged"
                            :bots="bots"
                            :searchResult="searchResult"
                            :setLargeSheet="setLargeSheet"
                            :isSearch="isSearch"
                            :updateTime="updateTime"
                            :selectionMode="selectionMode"
                            :diffSelected="isDiff"
                            :showAddTagButton="false"
                        ></bot-table>
                    </md-card-content>
                </md-card>
            </div>
        </game-view>

        <div class="context-menu" :style="contextMenuStyle">
            <md-menu v-show="contextMenuEvent" :md-active.sync="contextMenuVisible">
                <md-menu-content>
                    <div v-if="contextMenuEvent">
                        <md-menu-item
                            v-for="item of contextMenuEvent.actions"
                            v-bind:key="item.label"
                            @click="item.onClick"
                        >
                            {{ item.label }}
                        </md-menu-item>
                    </div>
                    <div v-else>
                        <!-- render nothing you fools -->
                    </div>
                </md-menu-content>
            </md-menu>
        </div>
    </div>
</template>
<script src="./BuilderHome.ts"></script>
<style src="./BuilderHome.css"></style>
