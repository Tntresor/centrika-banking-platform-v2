const { TestDataGenerator } = require('./test-data-generator');
const { storage } = require('../storage-supabase');

async function runTests() {
  console.log('🚀 Starting automated test data generation...');
  
  try {
    // Initialize services
    const auditService = {
      log: async (action, userId, data) => {
        console.log(`Audit: ${action} for user ${userId}`);
      }
    };
    
    const testGenerator = new TestDataGenerator(storage, auditService);

    // Generate test data
    const results = await testGenerator.generateTestData(10, 100);
    
    console.log('✅ Test data generation completed successfully!');
    console.log('📊 Summary:', JSON.stringify(results.summary, null, 2));

    // Generate credit facilities for some users
    const userIds = Array.from({length: 10}, (_, i) => i + 1);
    await testGenerator.generateCreditFacilities(userIds);
    
    console.log('💳 Credit facilities generated');
    
    // Run basic validation queries
    console.log('🔍 Running validation queries...');
    
    const userCount = await storage.executeQuery('SELECT COUNT(*) as count FROM users');
    const walletCount = await storage.executeQuery('SELECT COUNT(*) as count FROM wallets');
    const transactionCount = await storage.executeQuery('SELECT COUNT(*) as count FROM transactions');
    const kycCount = await storage.executeQuery('SELECT COUNT(*) as count FROM kyc_documents');
    
    console.log('📈 Database Statistics:');
    console.log(`  - Users: ${userCount.rows[0].count}`);
    console.log(`  - Wallets: ${walletCount.rows[0].count}`);
    console.log(`  - Transactions: ${transactionCount.rows[0].count}`);
    console.log(`  - KYC Documents: ${kycCount.rows[0].count}`);
    
    // Test transaction volume
    const volumeResult = await storage.executeQuery(
      'SELECT SUM(amount) as total_volume FROM transactions WHERE status = $1',
      ['completed']
    );
    
    console.log(`  - Total Transaction Volume: ${parseFloat(volumeResult.rows[0].total_volume || 0).toLocaleString()} RWF`);
    
    // Test KYC distribution
    const kycStats = await storage.executeQuery(`
      SELECT kyc_status, COUNT(*) as count 
      FROM users 
      GROUP BY kyc_status
    `);
    
    console.log('  - KYC Status Distribution:');
    kycStats.rows.forEach(row => {
      console.log(`    ${row.kyc_status}: ${row.count} users`);
    });
    
    console.log('✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Auto-run if called directly
if (require.main === module) {
  runTests()
    .then(() => {
      console.log('🎉 Test suite completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { runTests };