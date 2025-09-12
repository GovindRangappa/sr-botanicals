// scripts/createTestLabel.cjs
require('dotenv').config();

const ShippoLib = require('shippo');

const SHIPPO_KEY = process.env.SHIPPO_API_KEY;
if (!SHIPPO_KEY) {
  throw new Error('Missing SHIPPO_API_KEY in environment');
}

// Shippo SDKs have had two init styles; this handles both:
const shippo =
  typeof ShippoLib === 'function'
    ? ShippoLib(SHIPPO_KEY)
    : new ShippoLib.Shippo(SHIPPO_KEY);

const fromAddress = {
  name: 'SR Botanicals',
  street1: '2412 Ivy Stone Ln',
  city: 'Friendswood',
  state: 'TX',
  zip: '77546',
  country: 'US',
  phone: '5551234567',
  email: 'info@srbotanicals.com',
};

const toAddress = {
  name: 'Test Customer',
  street1: '1600 Pennsylvania Ave NW',
  city: 'Washington',
  state: 'DC',
  zip: '20500',
  country: 'US',
  phone: '5559876543',
  email: 'test@example.com',
};

// Use Shippo’s snake_case field names
const parcel = {
  length: '8.6875',
  width: '5.4375',
  height: '1.625',
  distance_unit: 'in',
  weight: '20',
  mass_unit: 'oz',
};

async function createTestLabel() {
  try {
    const shipment = await shippo.shipment.create({
      address_from: fromAddress,
      address_to: toAddress,
      parcels: [parcel],
      async: false,
    });

    if (!shipment || !shipment.rates || shipment.rates.length === 0) {
      throw new Error('No rates returned from Shippo');
    }

    const rate = shipment.rates[0];
    console.log('📦 Using rate:', rate.provider, rate.servicelevel?.name, `$${rate.amount}`);

    const transaction = await shippo.transaction.create({
      rate: rate.object_id,
      label_file_type: 'PDF',
      async: false,
    });

    if (transaction.status === 'SUCCESS') {
      console.log('✅ Test label created');
      console.log('📄 Label URL:', transaction.label_url);
      console.log('🔍 Tracking Number:', transaction.tracking_number);
    } else {
      console.error('❌ Label creation failed:', transaction.messages);
    }
  } catch (err) {
    console.error('❌ Error during test label creation:', err);
  }
}

createTestLabel();
