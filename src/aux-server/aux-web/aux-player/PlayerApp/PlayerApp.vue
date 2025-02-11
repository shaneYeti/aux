<template>
    <div id="app">
        <load-app>
            <md-button class="show-navigation-button md-icon-button" @click="menuClicked()">
                <md-icon>menu</md-icon>
            </md-button>

            <md-drawer :md-active.sync="showNavigation">
                <div class="menu-header">
                    <span class="md-title">{{ session || 'AUX Player' }} {{ setTitleToID() }}</span
                    ><br />
                    <div class="user-info" v-if="getUser() != null">
                        <span class="md-body-1 username-label"
                            >Logged In: {{ getUser().name }}</span
                        >
                        <span class="admin-badge" v-if="isAdmin">Admin</span>
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
                    <md-list-item @click="addSimulation()" v-if="getUser() != null && authorized">
                        <md-icon>cloud</md-icon>
                        <span class="md-list-item-text">Add Channel</span>
                    </md-list-item>
                    <md-list-item
                        v-for="simulation in simulations"
                        :key="simulation.id"
                        @click="removeSimulation(simulation)"
                        @click.right="toggleOnlineOffline(simulation)"
                    >
                        <md-icon class="forced-offline-error" v-if="forcedOffline(simulation)"
                            >error</md-icon
                        >
                        <md-icon class="synced-checkmark" v-else-if="simulation.synced"
                            >cloud_done</md-icon
                        >
                        <md-icon class="not-synced-warning" v-else>cloud_off</md-icon>
                        <span class="md-list-item-text">{{ simulation.displayName }}</span>
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

            <checkout></checkout>

            <md-dialog :md-active.sync="showQRCode" class="qr-code-dialog">
                <div class="qr-code-container">
                    <span>{{ getQRCode() }}</span>
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
                    <span>{{ getLoginCode() }}</span>
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

            <md-dialog
                :md-active.sync="showQRScanner"
                class="qr-scanner-dialog"
                @md-closed="onQrCodeScannerClosed()"
            >
                <div class="qr-scanner-container">
                    <h3>Scan a QR Code</h3>
                    <qrcode-stream @decode="onQRCodeScanned"></qrcode-stream>
                </div>
                <md-dialog-actions>
                    <md-button class="md-primary" @click="hideQRCodeScanner()">Close</md-button>
                </md-dialog-actions>
            </md-dialog>

            <md-dialog
                :md-active.sync="showBarcodeScanner"
                class="barcode-scanner-dialog"
                @md-closed="onBarcodeScannerClosed()"
            >
                <div class="barcode-scanner-container">
                    <h3>Scan a Barcode</h3>
                    <barcode-stream @decode="onBarcodeScanned"></barcode-stream>
                </div>
                <md-dialog-actions>
                    <md-button class="md-primary" @click="hideBarcodeScanner()">Close</md-button>
                </md-dialog-actions>
            </md-dialog>

            <md-dialog-prompt
                :md-active.sync="showAddSimulation"
                v-model="newSimulation"
                md-title="Add Channel"
                md-confirm-text="Add"
                @md-confirm="finishAddSimulation"
            />

            <md-dialog-confirm
                v-if="simulationToRemove"
                :md-active.sync="showRemoveSimulation"
                md-title="Remove Channel"
                :md-content="`Remove ${simulationToRemove.displayName}?`"
                @md-confirm="finishRemoveSimulation()"
            />

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
                            class="color-picker-basic"
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
                :md-duration="snackbar.duration != undefined ? snackbar.duration : 2000"
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
<script src="./PlayerApp.ts"></script>
<style src="./PlayerApp.css"></style>
