import { PersonalShoppingAgent } from './personalShoppingAgent.js';

/**
 * Metapase Model Context Protocol (MCP) & Agent Tool Server
 * 
 * Provides an MCP / JSON-RPC tool execution interface for Meta Muse,
 * Meta Model API, or Claude/Gemini agents to perform:
 * 1. Proximity deal discovery (50m drive-by / 20m in-mall)
 * 2. Multi-turn price bargaining against merchant floor limits
 * 3. Stripe Issuing Sandbox single-use virtual card creation
 * 4. Transaction token settlement
 */

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export const METAPASE_MCP_TOOLS: McpToolDefinition[] = [
  {
    name: 'metapase_scan_proximity',
    description: 'Scans nearby mall stores for active product promotions matching buyer intent within 50m (drive-by) or 20m (in-mall).',
    inputSchema: {
      type: 'object',
      properties: {
        intent: { type: 'string', description: 'What the shopper wants to buy (e.g. "blazer", "running shoes", "coffee").' },
        maxBudgetZAR: { type: 'number', description: 'Shopper budget ceiling in South African Rand (ZAR).' },
        matchRadiusM: { type: 'number', description: 'Scan radius in meters (default 50 for commute/drive-by, 20 for inside mall).' }
      },
      required: ['intent', 'maxBudgetZAR']
    }
  },
  {
    name: 'metapase_negotiate_deal',
    description: 'Autonomous multi-round price bargaining between Personal Shopping Agent and Store Merchant Agent.',
    inputSchema: {
      type: 'object',
      properties: {
        campaignId: { type: 'string', description: 'Campaign identifier returned from metapase_scan_proximity.' },
        sku: { type: 'string', description: 'Target SKU to purchase.' },
        stickerPriceZAR: { type: 'number', description: 'Original sticker price in ZAR.' },
        maxBudgetZAR: { type: 'number', description: 'Shopper budget ceiling in ZAR.' },
        distanceM: { type: 'number', description: 'Distance to store in meters.' }
      },
      required: ['campaignId', 'stickerPriceZAR', 'maxBudgetZAR']
    }
  },
  {
    name: 'metapase_issue_virtual_card',
    description: 'Generates a single-use virtual card via Stripe Issuing sandbox with spending limit locked to agreed price.',
    inputSchema: {
      type: 'object',
      properties: {
        amountZAR: { type: 'number', description: 'Exact transaction amount in ZAR to lock card spending limit.' },
        memo: { type: 'string', description: 'Transaction memo describing product and outlet.' }
      },
      required: ['amountZAR', 'memo']
    }
  },
  {
    name: 'metapase_settle_deal',
    description: 'Settles agreed deal using cryptographic transaction token and virtual card authorization.',
    inputSchema: {
      type: 'object',
      properties: {
        transactionToken: { type: 'string', description: 'Accepted offer voucher token from merchant agent.' },
        cardId: { type: 'string', description: 'Stripe virtual card identifier.' },
        last4: { type: 'string', description: 'Last 4 digits of virtual card.' },
        authorizationId: { type: 'string', description: 'Sandbox authorization identifier.' }
      },
      required: ['transactionToken', 'cardId']
    }
  }
];

export async function handleMcpToolCall(toolName: string, args: any) {
  const agent = new PersonalShoppingAgent();

  switch (toolName) {
    case 'metapase_scan_proximity': {
      const match = await agent.scanNearbyDeals({
        intent: args.intent,
        maxBudgetZAR: args.maxBudgetZAR,
        matchRadiusM: args.matchRadiusM ?? 50
      });
      return { content: [{ type: 'text', text: JSON.stringify(match ?? { found: false }) }] };
    }

    case 'metapase_negotiate_deal': {
      const dealMatch = {
        mallId: 'sandton_city',
        outletId: 'sc_zara',
        outletName: 'Zara Sandton',
        campaignId: args.campaignId,
        sku: args.sku ?? 'SKU-001',
        itemName: args.itemName ?? 'Promoted Product',
        stickerPriceZAR: args.stickerPriceZAR,
        distanceM: args.distanceM ?? 12
      };
      const result = await agent.negotiateDeal(dealMatch, args.maxBudgetZAR);
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }

    case 'metapase_issue_virtual_card': {
      const card = await agent.issueSingleUseVirtualCard(args.amountZAR, args.memo);
      return { content: [{ type: 'text', text: JSON.stringify(card) }] };
    }

    case 'metapase_settle_deal': {
      const settlement = await agent.settleDeal(args.transactionToken, {
        cardId: args.cardId,
        last4: args.last4 ?? '4242',
        expMonth: 12,
        expYear: 2028,
        currency: 'ZAR',
        spendingLimitZAR: 1000,
        isSingleUse: true,
        testMode: true,
        authorizationId: args.authorizationId
      });
      return { content: [{ type: 'text', text: JSON.stringify(settlement) }] };
    }

    default:
      throw new Error(`Unknown MCP tool: ${toolName}`);
  }
}
