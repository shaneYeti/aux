<template>
    <div id="app">
        <load-app>
            <md-toolbar>
                <div class="md-toolbar-section-start">
                    <md-button class="md-icon-button" @click="menuClicked()">
                        <md-icon>menu</md-icon>
                    </md-button>
                    <bot-search v-if="authorized" :mode="userMode" ref="searchBar"></bot-search>
                    <md-button
                        class="md-icon-button user-mode-toggle"
                        v-if="userMode === false"
                        @click="toggleUserMode()"
                    >
                        <md-icon>close</md-icon>
                    </md-button>
                </div>
            </md-toolbar>

            <md-drawer :md-active.sync="showNavigation">
                <div class="menu-header">
                    <span class="md-title"
                        >{{ session || 'Channel Deser' }} {{ setTitleToID() }}</span
                    ><br />
                    <div class="user-info" v-if="getUser() != null">
                        <span class="md-body-1 username-label"
                            >Logged In: {{ getUser().name }}</span
                        >
                    </div>
                </div>
                <md-list>
                    <md-list-item
                        @click="showQRCode = true"
                        v-if="getUser() != null"
                        class="qr-code-item"
                    >
                        <qr-code :value="url()" :options="{ width: 256 }" />
                    </md-list-item>
                    <md-list-item
                        v-if="getUser() != null && isAdmin && showCreateChannel"
                        @click="createChannel()"
                    >
                        <md-icon id="channel-does-not-exist-error">warning</md-icon>
                        <span class="md-list-item-text"
                            >Channel doesn't exist. Click here to create it.</span
                        >
                    </md-list-item>
                    <md-list-item
                        v-if="getUser() != null && !getUser().isGuest"
                        @click="showLoginQRCode()"
                    >
                        <md-icon>devices_other</md-icon>
                        <span class="md-list-item-text">Login with Another Device</span>
                    </md-list-item>
                    <md-list-item @click="logout">
                        <md-icon>exit_to_app</md-icon>
                        <span class="md-list-item-text">
                            {{ !getUser() || getUser().isGuest ? 'Login' : 'Logout' }}
                        </span>
                    </md-list-item>
                    <router-link
                        v-if="getUser() != null && $route.name !== 'home'"
                        tag="md-list-item"
                        :to="{ name: 'home', params: { id: session } }"
                    >
                        <md-icon>home</md-icon>
                        <span class="md-list-item-text">Home</span>
                    </router-link>
                    <md-list-item @click="upload" v-if="getUser() != null && authorized">
                        <md-icon>cloud_upload</md-icon>
                        <span class="md-list-item-text">Upload Channel</span>
                    </md-list-item>
                    <md-list-item @click="download" v-if="getUser() != null && authorized">
                        <md-icon>cloud_download</md-icon>
                        <span class="md-list-item-text">Download Channel</span>
                    </md-list-item>
                    <md-list-item @click="fork" v-if="getUser() != null && isAdmin">
                        <fork-icon class="md-icon md-icon-font md-theme-default"></fork-icon>
                        <span class="md-list-item-text">Fork Channel</span>
                    </md-list-item>
                    <md-list-item
                        v-if="getUser() != null && isAdmin"
                        class="nuke-site-item"
                        @click="nukeSite()"
                        :disabled="!(online && synced)"
                    >
                        <md-icon class="nuke-everything-icon">delete_forever</md-icon>
                        <span class="md-list-item-text">Clear Channel</span>

                        <md-tooltip v-if="!(online && synced)"
                            >Must be online &amp; synced to clear the simulation.</md-tooltip
                        >
                    </md-list-item>
                    <router-link
                        v-if="dev && getUser() != null"
                        tag="md-list-item"
                        :to="{ name: 'aux-debug', params: { id: session } }"
                    >
                        <md-icon>bug_report</md-icon>
                        <span class="md-list-item-text">Debug</span>
                    </router-link>
                    <md-list-item v-if="getUser() != null" @click.right="toggleOnlineOffline()">
                        <md-icon id="forced-offline-error" v-if="forcedOffline()">error</md-icon>
                        <md-icon id="synced-checkmark" v-else-if="synced">cloud_done</md-icon>
                        <md-icon id="not-synced-warning" v-else>cloud_off</md-icon>
                        <span class="md-list-item-text" v-if="forcedOffline()">
                            Forced Offline
                        </span>
                        <span class="md-list-item-text" v-else-if="synced">
                            Synced
                            <span v-if="online">Online</span>
                            <span v-else>Offline</span>
                        </span>
                        <span class="md-list-item-text" v-else>
                            Not Synced
                            <span v-if="online">Online</span>
                            <span v-else>Offline</span>
                        </span>
                    </md-list-item>
                    <md-list-item v-if="updateAvailable" @click="refreshPage()">
                        <md-icon>update</md-icon>
                        <span class="md-list-item-text">A new version is available!</span>
                    </md-list-item>
                    <md-list-item
                        v-show="authorized"
                        v-for="item in extraItems"
                        :key="item.id"
                        @click="item.click()"
                    >
                        <md-icon v-if="item.icon">{{ item.icon }}</md-icon>
                        <span class="md-list-item-text">{{ item.text }}</span>
                    </md-list-item>
                    <md-list-item>
                        <span
                            class="md-list-item-text"
                            @click.left="copy(version)"
                            @click.right="copy(versionTooltip)"
                        >
                            Version: {{ version }}
                            <md-tooltip md-direction="bottom">{{ versionTooltip }}</md-tooltip>
                        </span>
                    </md-list-item>

                    <tagline></tagline>
                </md-list>
            </md-drawer>

            <md-dialog :md-active.sync="showQRCode" class="qr-code-dialog">
                <div class="qr-code-container">
                    <span class="qr-code-label">{{ getQRCode() }}</span>
                    <qr-code :value="getQRCode()" :options="{ width: 310 }" />
                </div>
                <md-dialog-actions>
                    <md-button
                        class="md-primary"
                        @click="
                            showQRCode = false;
                            qrCode = null;
                        "
                        >Close</md-button
                    >
                </md-dialog-actions>
            </md-dialog>

            <md-dialog :md-active.sync="showLoginCode" class="qr-code-dialog">
                <div class="qr-code-container" @click="copy(getLoginCode())">
                    <span class="qr-code-label">{{ getLoginCode() }}</span>
                    <qr-code
                        :value="getLoginCode()"
                        :options="{ width: 310, color: { dark: '#0044AA' } }"
                    />
                </div>
                <md-dialog-actions>
                    <md-button class="md-primary" @click="showLoginCode = false">Close</md-button>
                </md-dialog-actions>
            </md-dialog>

            <md-dialog :md-active.sync="showBarcode" class="barcode-dialog">
                <div class="barcode-container">
                    <barcode :value="getBarcode()" :format="getBarcodeFormat()" />
                </div>
                <md-dialog-actions>
                    <md-button
                        class="md-primary"
                        @click="
                            showBarcode = false;
                            barcode = null;
                        "
                        >Close</md-button
                    >
                </md-dialog-actions>
            </md-dialog>

            <md-dialog :md-active.sync="showFileUpload" class="bot-upload-dialog">
                <md-dialog-title>Upload Files</md-dialog-title>
                <div class="bot-upload-container">
                    <bot-pond
                        allow-multiple="false"
                        @addfile="fileAdded"
                        @removefile="fileRemoved"
                    />
                </div>
                <md-dialog-actions>
                    <md-button @click="cancelFileUpload">Close</md-button>
                    <md-button
                        class="md-primary"
                        @click="uploadFiles"
                        :disabled="uploadedFiles.length <= 0"
                        >Upload</md-button
                    >
                </md-dialog-actions>
            </md-dialog>

            <md-dialog :md-active.sync="showFork" class="fork-dialog">
                <md-dialog-title>Fork Channel</md-dialog-title>
                <md-dialog-content>
                    <div class="fork-container">
                        <md-field>
                            <label for="fork-name">Fork Name</label>
                            <md-input name="fork-name" id="fork-name" v-model="forkName" />
                        </md-field>
                    </div>
                </md-dialog-content>
                <md-dialog-actions>
                    <md-button @click="cancelFork">Cancel</md-button>
                    <md-button
                        class="md-primary"
                        @click="finishFork"
                        :disabled="!forkName || forkName.length === 0"
                        >Fork</md-button
                    >
                </md-dialog-actions>
            </md-dialog>

            <md-dialog-confirm
                :md-active.sync="showConfirmDialog"
                v-bind:md-title="confirmDialogOptions.title"
                v-bind:md-content="confirmDialogOptions.body"
                v-bind:md-confirm-text="confirmDialogOptions.okText"
                v-bind:md-cancel-text="confirmDialogOptions.cancelText"
                @md-cancel="onConfirmDialogCancel"
                @md-confirm="onConfirmDialogOk"
            />

            <md-dialog-alert
                :md-active.sync="showAlertDialog"
                v-bind:md-content="alertDialogOptions.body"
                v-bind:md-confirm-text="alertDialogOptions.confirmText"
            />

            <md-dialog
                :md-active.sync="showInputDialog"
                @md-closed="closeInputDialog()"
                :style="{
                    'background-color': inputDialogBackgroundColor,
                    color: inputDialogLabelColor,
                }"
            >
                <md-dialog-title>{{ inputDialogLabel }}</md-dialog-title>
                <md-dialog-content>
                    <md-field>
                        <label :style="{ color: inputDialogLabelColor }">{{
                            inputDialogPlaceholder
                        }}</label>
                        <md-input
                            v-model="inputDialogInputValue"
                            @keyup.enter="saveInputDialog()"
                            style="-webkit-text-fill-color: inherit;"
                            :style="{ color: inputDialogLabelColor }"
                        ></md-input>
                    </md-field>
                    <div v-if="inputDialogType === 'color'">
                        <color-picker-swatches
                            v-if="inputDialogSubtype === 'swatch'"
                            :value="inputDialogInputValue"
                            @input="updateInputDialogColor"
                            :disableAlpha="true"
                        ></color-picker-swatches>
                        <color-picker-advanced
                            v-else-if="inputDialogSubtype === 'advanced'"
                            :value="inputDialogInputValue"
                            @input="updateInputDialogColor"
                            class="color-picker-advanced"
                            :disableAlpha="true"
                        ></color-picker-advanced>
                        <color-picker-basic
                            v-else
                            :value="inputDialogInputValue"
                            @input="updateInputDialogColor"
                            :disableAlpha="true"
                        ></color-picker-basic>
                    </div>
                </md-dialog-content>
                <md-dialog-actions>
                    <md-button @click="closeInputDialog()" :style="{ color: inputDialogLabelColor }"
                        >Cancel</md-button
                    >
                    <md-button @click="saveInputDialog()" class="md-primary">Save</md-button>
                </md-dialog-actions>
            </md-dialog>

            <login :show="showLogin" @close="showLogin = false"></login>
            <authorize :show="showAuthorize" @close="showAuthorize = false"></authorize>

            <md-snackbar
                md-position="center"
                :md-duration="2000"
                :md-active.sync="snackbar.visible"
            >
                <span>{{ snackbar.message }}</span>
                <md-button
                    v-if="snackbar.action"
                    class="md-primary"
                    @click="snackbarClick(snackbar.action)"
                    >{{ snackbar.action.label }}</md-button
                >
            </md-snackbar>

            <console
                v-if="showConsole"
                @close="closeConsole()"
                :autoSelectSources="['script']"
            ></console>

            <html-modal></html-modal>

            <md-content class="app-content">
                <router-view></router-view>
            </md-content>
        </load-app>
    </div>
</template>
<script src="./BuilderApp.ts"></script>
<style src="./BuilderApp.css"></style>
