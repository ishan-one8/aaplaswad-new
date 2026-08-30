// === SAI PRASAD — Config defaults ===
// Kept free of dependencies so the seed script can read it without the AWS SDK.

const DEFAULT_SHOP = {
    configId: 'shop',
    isOpen: true,
    autoSchedule: true,
    openTime: '10:00',
    closeTime: '22:30',
    weeklyOff: [],
    holidayDates: [],
    closedMessage: 'We are closed right now. Please check back during opening hours.',
    pauseOrders: false,
    pauseMessage: 'We are extremely busy right now and have paused new orders. Please try again shortly.',
    hotelLat: null,
    hotelLng: null,
    deliveryRadiusKm: 7,
    deliveryFee: 0,
    minOrderValue: 0,
    codEnabled: true,
    onlineEnabled: true,
    prepTimeMinutes: 30,
    defaultPayoutPerDelivery: 20,

    // First-order offer — switched on and off from the admin panel
    firstOrderDiscountEnabled: true,
    firstOrderDiscountPercent: 10,

    // Used to turn distance into an arrival estimate for the customer
    avgSpeedKmph: 20
};

module.exports = { DEFAULT_SHOP };
