import { describe, it, expect } from 'vitest';
import { MetricResolver, MetaRawInsight } from '../src/services/meta-api/metric-resolver.js';

describe('MetricResolver Unit Tests', () => {
  it('correctly calculates cost per messaging conversation when actions present', () => {
    const raw: MetaRawInsight = {
      spend: '300000',
      impressions: '10000',
      clicks: '200',
      actions: [
        { action_type: 'onsite_conversion.messaging_conversation_started_7d', value: '3' },
        { action_type: 'link_click', value: '200' },
      ],
      cost_per_action_type: [
        { action_type: 'onsite_conversion.messaging_conversation_started_7d', value: '100000' },
      ],
    };

    const resolved = MetricResolver.resolve(raw);
    expect(resolved.spend).toBe(300000);
    expect(resolved.messagingConversations).toBe(3);
    expect(resolved.costPerMessaging).toBe(100000);
    expect(resolved.cpm).toBe(30000);
    expect(resolved.cpc).toBe(1500);
    expect(resolved.ctr).toBe(2);
    expect(resolved.isZeroResults).toBe(false);
    expect(resolved.hasSufficientData).toBe(true);
  });

  it('handles zero messaging results with spend correctly', () => {
    const raw: MetaRawInsight = {
      spend: '250000',
      impressions: '8000',
      clicks: '100',
      actions: [{ action_type: 'link_click', value: '100' }],
    };

    const resolved = MetricResolver.resolve(raw);
    expect(resolved.spend).toBe(250000);
    expect(resolved.messagingConversations).toBe(0);
    expect(resolved.costPerMessaging).toBe(0);
    expect(resolved.isZeroResults).toBe(true);
    expect(resolved.hasSufficientData).toBe(true);
  });

  it('flags insufficient data when impressions and spend are minimal', () => {
    const raw: MetaRawInsight = {
      spend: '5000',
      impressions: '10',
      clicks: '0',
    };

    const resolved = MetricResolver.resolve(raw);
    expect(resolved.hasSufficientData).toBe(false);
    expect(resolved.dataQualityWarning).toBeDefined();
  });

  it('handles null/undefined raw insights gracefully', () => {
    const resolved = MetricResolver.resolve(null);
    expect(resolved.spend).toBe(0);
    expect(resolved.messagingConversations).toBe(0);
    expect(resolved.isZeroResults).toBe(true);
    expect(resolved.hasSufficientData).toBe(false);
  });
});
