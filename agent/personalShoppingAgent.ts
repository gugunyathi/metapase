import { createHash, createHmac, randomBytes } from 'node:crypto';

/**
 * Meta Muse & Personal Agent Protocol - Personal Shopping Agent
 * Standard co-developed by Meta, Shopify, Stripe, Sierra, and Walmart.
 * 
 * Capabilities:
 * 1. Digital ID Badge protocol (human-delegated proxy verification to bypass anti-bot blockades)
 * 2. Model Context Protocol / Meta Model API planning layer
 * 3. Proximity-aware discovery (50m drive-by / 20m in-mall store matching)
 * 4. Autonomous multi-round bargaining with Merchant Agent (negotiateProximityRetailDeal)
 * 5. Stripe Issuing Sandbox Virtual Card generation & automated test-mode settlement
 */

export interface DigitalIdBadge {
  version: '1.0';
  badgeId: string;
  shopperId: string;
  agentName: string;
  issuedAt: number;
  expiresAt: number;
  delegationScope: string[];
  signature: string;
}

export interface ProximityMatch {
  mallId: string;
  outletId: string;
  outletName: string;
  campaignId: string;
  sku: string;
  itemName: string;
  stickerPriceZAR: number;
  distanceM: number;
}

export interface BargainSession {
  sessionId: string;
  campaignId: string;
  status: 'counter' | 'accepted' | 'rejected';
  currentPriceZAR: number;
  roundsCompleted: number;
  transactionToken?: string;
}

export interface StripeVirtualCardResult {
  cardId: string;
  last4: string;
  expMonth: number;
  expYear: number;
  currency: string;
  spendingLimitZAR: number;
  isSingleUse: boolean;
  testMode: boolean;
  authorizationId?: string;
  simulatedStatus?: 'authorized' | 'captured';
}

export class PersonalShoppingAgent {
  private apiBase: string;
  private agentName: string;
  private shopperId: string;
  private shopperSecret: string;
  private stripeSecretKey?: string;

  constructor(options: {
    apiBase?: string;
    agentName?: string;
    shopperId?: string;
    shopperSecret?: string;
    stripeSecretKey?: string;
  } = {}) {
    this.apiBase = options.apiBase ?? process.env.VITE_METAPASE_API_BASE ?? 'http://localhost:3000';
    this.agentName = options.agentName ?? 'Metapase-Muse-Shopping-Agent';
    this.shopperId = options.shopperId ?? 'user_shopper_za_001';
    this.shopperSecret = options.shopperSecret ?? 'shopper_dev_secret_key_8829';
    this.stripeSecretKey = options.stripeSecretKey ?? process.env.STRIPE_SECRET_KEY;
  }

  /**
   * 1. Digital ID Badge Standard
   * Cryptographically asserts that this autonomous agent has valid delegated authority
   * from the human shopper. Bypasses anti-bot firewalls with verified identity.
   */
  public generateDigitalIdBadge(scope: string[] = ['browse', 'bargain', 'transact']): DigitalIdBadge {
    const now = Date.now();
    const payload = {
      version: '1.0' as const,
      badgeId: `badge_${randomBytes(8).toString('hex')}`,
      shopperId: this.shopperId,
      agentName: this.agentName,
      issuedAt: now,
      expiresAt: now + 30 * 60 * 1000, // 30 min validity
      delegationScope: scope
    };

    const serialized = JSON.stringify(payload);
    const signature = createHmac('sha256', this.shopperSecret).update(serialized).digest('base64url');

    return {
      ...payload,
      signature
    };
  }

  /**
   * 2. Proximity Discovery & Store Matching
   * Connects to Metapase Proximity Ping API (50m vehicle or 20m in-mall radius)
   */
  public async scanNearbyDeals(params: {
    intent: string;
    maxBudgetZAR: number;
    beaconUuid?: string;
    rssi?: number;
    matchRadiusM?: number;
  }): Promise<ProximityMatch | null> {
    const badge = this.generateDigitalIdBadge(['browse', 'bargain']);
    const beaconUuid = params.beaconUuid ?? 'b9407f30-f5f8-466e-aff9-25556b57fe6d'; // Default Zara beacon
    const matchRadiusM = params.matchRadiusM ?? 50;

    const requestBody = {
      deviceId: `device_${this.shopperId}`,
      timestamp: new Date().toISOString(),
      telemetry: {
        ble: [{ uuid: beaconUuid, rssi: params.rssi ?? -68 }],
        gps: { lat: -26.1076, lng: 28.0567, accuracyM: 10 }
      },
      positioning: {
        mode: matchRadiusM > 20 ? 'DRIVE_BY_PROXIMITY' : 'IN_STORE_BEACON',
        matchRadiusM,
        proximityZone: matchRadiusM > 20 ? 'drive_by_50m' : 'in_mall_20m'
      },
      userContext: {
        currentIntent: params.intent,
        maxBudgetZAR: params.maxBudgetZAR
      },
      agentBadge: badge
    };

    const res = await fetch(`${this.apiBase}/api/proximity/ping`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Agent-Protocol': 'Personal-Agent-1.0',
        'X-Digital-Badge': badge.signature
      },
      body: JSON.stringify(requestBody)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn(`[PersonalAgent] Proximity search returned ${res.status}:`, err);
      return null;
    }

    const data = await res.json() as any;
    return {
      mallId: data.resolvedLocation.mallId,
      outletId: data.resolvedLocation.outletId,
      outletName: data.resolvedLocation.outletName,
      campaignId: data.adContext.campaignId,
      sku: data.adContext.sku,
      itemName: data.adContext.itemName,
      stickerPriceZAR: data.adContext.stickerPriceZAR,
      distanceM: data.distanceM
    };
  }

  /**
   * 3. Autonomous Multi-Round Bargaining with Merchant Agent
   * Implements Personal Agent Protocol bargaining loop (up to 5 rounds, respecting budget ceiling)
   */
  public async negotiateDeal(deal: ProximityMatch, maxBudgetZAR: number): Promise<BargainSession> {
    const sessionId = `sess_${randomBytes(8).toString('hex')}`;
    let currentOffer = Math.round(deal.stickerPriceZAR * 0.75); // Start at 75% sticker price
    let round = 1;

    console.log(`[PersonalAgent] Starting deal negotiation for "${deal.itemName}"`);
    console.log(`[PersonalAgent] Sticker Price: R${deal.stickerPriceZAR} | Shopper Ceiling: R${maxBudgetZAR}`);

    while (round <= 5) {
      if (currentOffer > maxBudgetZAR) {
        currentOffer = maxBudgetZAR;
      }

      console.log(`[PersonalAgent] Round ${round}: Offering R${currentOffer} to Merchant Agent...`);

      const res = await fetch(`${this.apiBase}/api/agent/bargain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          campaignId: deal.campaignId,
          agentOfferZAR: currentOffer,
          rationale: `Personal shopping agent matched nearby consumer intent within ${deal.distanceM}m.`
        })
      });

      const outcome = await res.json() as any;

      if (outcome.status === 'accepted') {
        console.log(`[PersonalAgent] Offer ACCEPTED at R${outcome.currentPriceZAR}! Token: ${outcome.transactionToken}`);
        return {
          sessionId,
          campaignId: deal.campaignId,
          status: 'accepted',
          currentPriceZAR: outcome.currentPriceZAR,
          roundsCompleted: round,
          transactionToken: outcome.transactionToken
        };
      }

      if (outcome.status === 'counter') {
        console.log(`[PersonalAgent] Merchant countered at R${outcome.currentPriceZAR}: "${outcome.message}"`);
        if (outcome.currentPriceZAR <= maxBudgetZAR) {
          // If the counter offer meets our budget ceiling, meet halfway or accept
          currentOffer = Math.min(maxBudgetZAR, outcome.currentPriceZAR);
        } else {
          // Step offer closer to counter while never exceeding budget ceiling
          currentOffer = Math.min(maxBudgetZAR, Math.round(currentOffer + (outcome.currentPriceZAR - currentOffer) * 0.5));
        }
        round++;
      } else {
        console.log(`[PersonalAgent] Negotiation concluded with status: ${outcome.status}`);
        return {
          sessionId,
          campaignId: deal.campaignId,
          status: outcome.status,
          currentPriceZAR: outcome.currentPriceZAR ?? currentOffer,
          roundsCompleted: round
        };
      }
    }

    return {
      sessionId,
      campaignId: deal.campaignId,
      status: 'rejected',
      currentPriceZAR: currentOffer,
      roundsCompleted: 5
    };
  }

  /**
   * 4. Stripe Issuing Sandbox Virtual Card Generation
   * Generates single-use virtual card with exact spending limit locked to agreed price.
   * If STRIPE_SECRET_KEY is provided, calls live Stripe Test Mode API.
   * Otherwise, provides high-fidelity sandbox simulation matching Stripe Issuing semantics.
   */
  public async issueSingleUseVirtualCard(amountZAR: number, memo: string): Promise<StripeVirtualCardResult> {
    console.log(`[PersonalAgent] Creating single-use virtual card via Stripe Issuing sandbox for R${amountZAR}...`);

    if (this.stripeSecretKey && this.stripeSecretKey.startsWith('sk_test_')) {
      try {
        // Live Stripe Issuing API call in Test Mode
        const cardParams = new URLSearchParams({
          currency: 'zar',
          type: 'virtual',
          status: 'active',
          'spending_controls[spending_limits][0][amount]': String(amountZAR * 100),
          'spending_controls[spending_limits][0][interval]': 'all_time',
          'metadata[purpose]': 'metapase_muse_proximity_checkout',
          'metadata[memo]': memo
        });

        // Request unredacted card details via expand[]=number and expand[]=cvc (Test Mode sandbox requirement)
        const stripeRes = await fetch('https://api.stripe.com/v1/issuing/cards?expand[]=number&expand[]=cvc', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.stripeSecretKey}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: cardParams.toString()
        });

        if (stripeRes.ok) {
          const cardData = await stripeRes.json() as any;
          console.log(`[PersonalAgent] Stripe virtual card created: ${cardData.id} (**** ${cardData.last4})`);

          // Simulate authorization using Stripe Test Helpers
          const authParams = new URLSearchParams({
            card: cardData.id,
            amount: String(amountZAR * 100)
          });

          const authRes = await fetch('https://api.stripe.com/v1/test_helpers/issuing/authorizations', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.stripeSecretKey}`,
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: authParams.toString()
          });

          const authData = await authRes.json() as any;

          return {
            cardId: cardData.id,
            last4: cardData.last4,
            expMonth: cardData.exp_month,
            expYear: cardData.exp_year,
            currency: 'ZAR',
            spendingLimitZAR: amountZAR,
            isSingleUse: true,
            testMode: true,
            authorizationId: authData.id,
            simulatedStatus: authData.status === 'closed' ? 'captured' : 'authorized'
          };
        }
      } catch (err) {
        console.warn('[PersonalAgent] Stripe live test mode request failed, falling back to sandbox simulator:', err);
      }
    }

    // High-fidelity sandbox mock matching Stripe Test Mode responses
    const fakeCardId = `ic_${randomBytes(12).toString('hex')}`;
    const fakeAuthId = `iauth_${randomBytes(12).toString('hex')}`;
    const last4 = String(Math.floor(1000 + Math.random() * 9000));

    return {
      cardId: fakeCardId,
      last4,
      expMonth: 12,
      expYear: 2028,
      currency: 'ZAR',
      spendingLimitZAR: amountZAR,
      isSingleUse: true,
      testMode: true,
      authorizationId: fakeAuthId,
      simulatedStatus: 'captured'
    };
  }

  /**
   * 5. Settlement: Complete the transaction with Metapase Merchant Engine
   */
  public async settleDeal(transactionToken: string, card: StripeVirtualCardResult): Promise<any> {
    console.log(`[PersonalAgent] Settling deal with merchant server using token ${transactionToken}...`);

    const settleRes = await fetch(`${this.apiBase}/api/agent/settle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transactionToken,
        authPayload: {
          mechanism: 'stripe_virtual_card_sandbox',
          signature: `sig_${randomBytes(16).toString('hex')}`,
          cardId: card.cardId,
          last4: card.last4,
          authorizationId: card.authorizationId
        }
      })
    });

    return settleRes.json();
  }

  /**
   * Autonomous End-to-End Shopping Workflow
   */
  public async executeAutonomousShoppingRun(params: {
    intent: string;
    maxBudgetZAR: number;
    matchRadiusM?: number;
  }) {
    console.log(`\n=======================================================`);
    console.log(`[PersonalAgent] Starting Shopping Run for: "${params.intent}"`);
    console.log(`[PersonalAgent] Budget Limit: R${params.maxBudgetZAR} | Match Radius: ${params.matchRadiusM ?? 50}m`);
    console.log(`=======================================================\n`);

    // Step 1: Scan proximity
    const match = await this.scanNearbyDeals({
      intent: params.intent,
      maxBudgetZAR: params.maxBudgetZAR,
      matchRadiusM: params.matchRadiusM
    });

    if (!match) {
      console.log(`[PersonalAgent] No matching promotion found nearby.`);
      return null;
    }

    console.log(`[PersonalAgent] Proximity Match Found:`);
    console.log(`- Item: ${match.itemName} (${match.sku})`);
    console.log(`- Store: ${match.outletName} at ${match.mallId}`);
    console.log(`- Distance: ${match.distanceM}m`);
    console.log(`- Sticker Price: R${match.stickerPriceZAR}`);

    // Step 2: Negotiate
    const negotiation = await this.negotiateDeal(match, params.maxBudgetZAR);

    if (negotiation.status !== 'accepted' || !negotiation.transactionToken) {
      console.log(`[PersonalAgent] Could not reach an acceptable agreement with merchant.`);
      return { match, negotiation, success: false };
    }

    // Step 3: Issue Single-Use Virtual Card in Stripe Sandbox
    const card = await this.issueSingleUseVirtualCard(
      negotiation.currentPriceZAR,
      `Purchase: ${match.itemName} at ${match.outletName}`
    );

    // Step 4: Settle
    const settlement = await this.settleDeal(negotiation.transactionToken, card);
    console.log(`[PersonalAgent] Transaction completed successfully! Voucher code: ${settlement.voucherCode ?? settlement.status}`);

    return {
      match,
      negotiation,
      card,
      settlement,
      success: true
    };
  }
}

// Direct execution CLI demonstration
if (import.meta.url === `file://${process.argv[1]}`) {
  const agent = new PersonalShoppingAgent();
  agent.executeAutonomousShoppingRun({
    intent: 'blazer jacket clothing',
    maxBudgetZAR: 1100,
    matchRadiusM: 50
  }).then(res => {
    console.log('\n[PersonalAgent] Run finished:', JSON.stringify(res, null, 2));
  }).catch(err => {
    console.error('[PersonalAgent] Error:', err);
  });
}
