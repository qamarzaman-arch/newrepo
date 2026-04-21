/**
 * API Endpoint Tests
 * 
 * Quick tests to verify the new security endpoints work correctly
 * Run with: node test-endpoints.js
 */

const axios = require('axios');

const API_BASE = process.env.API_URL || 'http://localhost:3001/api/v1';

let authToken = null;

async function login() {
  console.log('\n🔑 Logging in...');
  
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    authToken = response.data.data.token;
    console.log('✅ Login successful!');
    return true;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    return false;
  }
}

async function testPinValidation() {
  console.log('\n🔐 Testing PIN Validation...');
  
  try {
    // Test with correct PIN (assuming default 123456)
    const response = await axios.post(`${API_BASE}/auth/validate-pin`, {
      pin: '123456',
      operation: 'discount-25%'
    }, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
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
    }, {
      headers: {
        'Authorization': `Bearer ${authToken}`
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
    const response = await axios.get(`${API_BASE}/payments/validations`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    console.log('✅ Payment History Response:', response.data);
    console.log(`   Found ${response.data.data.validations.length} validation records`);
  } catch (error) {
    console.error('❌ Payment History Error:', error.response?.data || error.message);
  }
}

async function runTests() {
  console.log('🚀 Starting API Endpoint Tests...');
  console.log(`   API Base URL: ${API_BASE}`);
  
  // Login first
  const loggedIn = await login();
  if (!loggedIn) {
    console.log('❌ Cannot proceed without authentication');
    return;
  }
  
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
