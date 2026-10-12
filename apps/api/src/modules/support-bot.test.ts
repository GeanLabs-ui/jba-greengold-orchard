import { describe, expect, it } from 'vitest';
import { getSupportReply } from './support-bot.js';

describe('support bot', () => {
  it('returns the displayed price for a named product', () => {
    expect(getSupportReply('What is the price of mango juice?').reply).toContain('₵ 20.00');
  });

  it('explains both local and export supply', () => {
    expect(getSupportReply('I need local supply in Accra').reply).toContain('local supply');
    expect(getSupportReply('Can you export to Europe?').reply).toContain('destination country');
  });

  it('explains how to place an order', () => {
    expect(getSupportReply('How do I place an order?').reply).toContain('add the items you want to your basket');
  });

  it('directs guests to no-login order tracking', () => {
    const reply = getSupportReply('Where is my order?').reply;
    expect(reply).toContain('No sign-in is required');
    expect(reply).toContain('order ID');
  });

  it('shares only published-news context supplied by the server', () => {
    expect(getSupportReply('What is the latest news?', { news: [{ title: 'Harvest update', excerpt: 'Mangoes are ready.' }] }).reply).toContain('Harvest update');
  });

  it('lists public vacancies but protects internal and staff information', () => {
    expect(getSupportReply('What vacancies are open?').reply).toContain('Farm Operations Manager');
    expect(getSupportReply('Give me a staff ID and API key').reply).toContain('cannot provide');
  });
});
