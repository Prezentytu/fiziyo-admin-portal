import { describe, expect, it } from 'vitest';

import { getChatTourPlacement } from '../chatTourPlacement';

const desktop = { width: 1360, height: 800 };
const phone = { width: 320, height: 680 };
const card = { width: 296, height: 190 };
const navigation = { left: 12, top: 110, width: 236, height: 108 };
const account = { left: 12, top: 547, width: 236, height: 120 };

describe('getChatTourPlacement', () => {
  it('positions the desktop callout beside the navigation links', () => {
    const layout = getChatTourPlacement(navigation, card, desktop, 'right');
    expect(layout.side).toBe('right');
    expect(layout.card.left).toBeGreaterThan(navigation.left + navigation.width);
  });

  it('puts the callout below the mobile navigation and above the mobile account menu', () => {
    const menu = getChatTourPlacement(navigation, card, phone, 'right');
    expect(menu.side).toBe('below');
    expect(menu.card.top).toBeGreaterThan(navigation.top + navigation.height);

    const profile = getChatTourPlacement(account, card, phone, 'right');
    expect(profile.side).toBe('above');
    expect(profile.card.top + profile.card.height).toBeLessThan(account.top);
  });

  it('gives the user a centered card when the anchor has not appeared', () => {
    const layout = getChatTourPlacement(null, card, phone, 'below');
    expect(layout.spotlight).toBeNull();
    expect(layout.card).toMatchObject({ left: 12, top: 245 });
  });
});
