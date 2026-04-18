/**
 * API Endpoint Tests
 * 
 * Quick tests to verify the new security endpoints work correctly
 * Run with: node test-endpoints.js
 */

const axios = require('axios');

const API_BASE = process.env.API_URL || 'http://localhost:3000/api/v1';

async function testPinValidation() {
  console.log('\n🔐 Testing PIN Validation...');
  
  try {
    // Test with correct PIN (assuming default 123456)
    const response = await axios.post(`${API_BASE}/auth/validate-pin`, {
      pin: '123456',
      operation: 'discount-25%'
    });
    
    console.log('✅ PIN Validation Response:', response.data);
    
    if (response.data.data.valid) {
      console.log('✅ PIN validation successful!');
    } else {
      console.log('❌ PIN validation failed (incorrect PIN or not set up)');
    }
  } catch (error) {
    console.error('❌ PIN Validation Error:', error.response?.data || error.message);
  }
}

async function testCardPayment() {
  console.log('\n💳 Testing Card Payment Validation...');
  
  try {
    const response = await axios.post(`${API_BASE}/payments/validate-card`, {
      amount: 150.50,
      cardDetails: {
        lastFour: '1234'
      }
    });
    
    console.log('✅ Card Payment Response:', response.data);
    
    if (response.data.success) {
      console.log('✅ Card payment validated!');
      console.log('   Transaction ID:', response.data.data.transactionId);
    }
  } catch (error) {
    console.error('❌ Card Payment Error:', error.response?.data || error.message);
  }
}

async function testPaymentHistory() {
  console.log('\n📊 Testing Payment History...');
  
  try {
    const response = await axios.get(`${API_BASE}/payments/validations`);
    
    console.log('✅ Payment History Response:', response.data);
    console.log(`   Found ${response.data.data.validations.length} validation records`);
  } catch (error) {
    console.error('❌ Payment History Error:', error.response?.data || error.message);
  }
}

async function runTests() {
  console.log('🚀 Starting API Endpoint Tests...');
  console.log(`   API Base URL: ${API_BASE}`);
  
  await testPinValidation();
  await testCardPayment();
  await testPaymentHistory();
  
  console.log('\n✅ All tests completed!');
  console.log('\n📝 Next Steps:');
  console.log('   1. If PIN validation failed, run: node setup-manager-pin.js 123456');
  console.log('   2. Check backend logs for any errors');
  console.log('   3. Verify database connection');
  console.log('   4. Test from POS frontend');
}

runTests().catch(console.error);
