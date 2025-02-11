import { AuxModule, AuxChannel } from '@casual-simulation/aux-vm';
import {
    USERNAME_CLAIM,
    RealtimeChannelInfo,
    DeviceInfo,
    remote,
    SESSION_ID_CLAIM,
    CausalTreeStore,
    DEVICE_ID_CLAIM,
} from '@casual-simulation/causal-trees';
import { Subscription } from 'rxjs';
import { flatMap } from 'rxjs/operators';
import {
    LocalActions,
    CheckoutSubmittedAction,
    ON_CHECKOUT_ACTION_NAME,
    FinishCheckoutAction,
    calculateStringTagValue,
    BotTags,
    action,
    ON_PAYMENT_SUCCESSFUL_ACTION_NAME,
    ON_PAYMENT_FAILED_ACTION_NAME,
} from '@casual-simulation/aux-common';
import {
    NodeAuxChannel,
    isAdminChannel,
    AuxChannelManager,
} from '@casual-simulation/aux-vm-node';
import Stripe from 'stripe';

export type StripeFactory = (key: string) => Stripe;

/**
 * Defines an module that adds Github-related functionality.
 */
export class CheckoutModule implements AuxModule {
    private _channelManager: AuxChannelManager;
    private _stripeFactory: StripeFactory;

    constructor(stripeFactory: StripeFactory) {
        this._stripeFactory = stripeFactory;
    }

    setChannelManager(manager: AuxChannelManager) {
        this._channelManager = manager;
    }

    async setup(
        info: RealtimeChannelInfo,
        channel: NodeAuxChannel
    ): Promise<Subscription> {
        let sub = new Subscription();

        // TODO: Update to not require device events.
        sub.add(
            channel.onDeviceEvents
                .pipe(
                    flatMap(events => events),
                    flatMap(async event => {
                        if (event.event) {
                            let local = <LocalActions>event.event;
                            if (local.type === 'checkout_submitted') {
                                await this._submitCheckout(
                                    info,
                                    local,
                                    event.device
                                );
                            }
                        }
                    })
                )
                .subscribe()
        );

        sub.add(
            channel.onLocalEvents
                .pipe(
                    flatMap(events => events),
                    flatMap(async event => {
                        if (event.type === 'finish_checkout') {
                            await this._finishCheckout(info, channel, event);
                        }
                    })
                )
                .subscribe()
        );

        return sub;
    }

    async deviceConnected(
        info: RealtimeChannelInfo,
        channel: AuxChannel,
        device: DeviceInfo
    ): Promise<void> {}

    async deviceDisconnected(
        info: RealtimeChannelInfo,
        channel: AuxChannel,
        device: DeviceInfo
    ): Promise<void> {}

    private async _submitCheckout(
        info: RealtimeChannelInfo,
        event: CheckoutSubmittedAction,
        device: DeviceInfo
    ) {
        const processingInfo: RealtimeChannelInfo = {
            id: `aux-${event.processingChannel}`,
            type: 'aux',
        };
        const hasChannel = await this._channelManager.hasChannel(
            processingInfo
        );
        if (!hasChannel) {
            console.log(
                `[CheckoutModule] Skipping checkout process because the channel does not exist.`
            );
            return;
        }
        const channel = await this._channelManager.loadChannel(processingInfo);

        await channel.simulation.helper.action(ON_CHECKOUT_ACTION_NAME, null, {
            productId: event.productId,
            token: event.token,
            user: {
                username: device.claims[USERNAME_CLAIM],
                device: device.claims[DEVICE_ID_CLAIM],
                session: device.claims[SESSION_ID_CLAIM],
            },
        });
    }

    private async _finishCheckout(
        info: RealtimeChannelInfo,
        channel: NodeAuxChannel,
        event: FinishCheckoutAction
    ) {
        try {
            const calc = channel.helper.createContext();
            const globals = channel.helper.globalsBot;
            const key = calculateStringTagValue(
                calc,
                globals,
                'stripe.secretKey',
                null
            );

            if (!key) {
                console.log(
                    '[CheckoutModule] Unable to finish checkout because no secret key is configured.'
                );

                await channel.helper.createBot(undefined, {
                    'stripe.charges': true,
                    'stripe.failedCharges': true,
                    'stripe.outcome.reason': 'no_secret_key',
                    'stripe.outcome.type': 'invalid',
                    'stripe.outcome.sellerMessage':
                        'Unable to finish checkout because no secret key is configured.',
                    'aux.color': 'red',
                });
                return;
            }

            const stripe = this._stripeFactory(key);
            const charge = await stripe.charges.create({
                amount: event.amount,
                currency: event.currency,
                description: event.description,
                source: event.token,
            });

            let tags: BotTags = {
                'stripe.charges': true,
                'stripe.charge': charge.id,
                'stripe.charge.receipt.url': charge.receipt_url,
                'stripe.charge.receipt.number': charge.receipt_number,
                'stripe.charge.description': charge.description,
            };

            if (charge.status === 'succeeded') {
                tags['stripe.successfulCharges'] = true;
            } else {
                tags['stripe.failedCharges'] = true;
                tags['aux.color'] = 'red';
            }

            if (charge.status === 'failed') {
                if (charge.outcome) {
                    tags['stripe.outcome.networkStatus'] =
                        charge.outcome.network_status;
                    tags['stripe.outcome.reason'] = charge.outcome.reason;
                    tags['stripe.outcome.riskLevel'] =
                        charge.outcome.risk_level;
                    tags['stripe.outcome.riskScore'] =
                        charge.outcome.risk_score;
                    tags['stripe.outcome.rule'] = charge.outcome.rule;
                    tags['stripe.outcome.sellerMessage'] =
                        charge.outcome.seller_message;
                    tags['stripe.outcome.type'] = charge.outcome.type;
                }
            }

            const id = await channel.helper.createBot(undefined, tags);

            await channel.helper.transaction(
                action(
                    ON_PAYMENT_SUCCESSFUL_ACTION_NAME,
                    null,
                    channel.helper.userId,
                    {
                        bot: channel.helper.botsState[id],
                        charge: charge,
                        extra: event.extra,
                    }
                )
            );
        } catch (error) {
            let id: string;
            if (error.type && error.message) {
                id = await channel.helper.createBot(undefined, {
                    'stripe.errors': true,
                    'stripe.error': error.message,
                    'stripe.error.type': error.type,
                });
            } else {
                console.error(error);
            }

            await channel.helper.transaction(
                action(
                    ON_PAYMENT_FAILED_ACTION_NAME,
                    null,
                    channel.helper.userId,
                    {
                        bot: id ? channel.helper.botsState[id] : null,
                        error: error,
                        extra: event.extra,
                    }
                )
            );
        }
    }
}
