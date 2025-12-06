/**
 * Script to check if admin exists and show admin email.
 * This helps identify if an admin user has been created.
 * Usage: node scripts/check-admin.js
 */

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function checkAdmin() {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI not found in .env.local');
      process.exit(1);
    }

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();

    const db = client.db();
    const admin = await db.collection('users').findOne({ role: 'admin' });

    if (admin) {
      console.log('✅ Admin user found:');
      console.log('   Email:', admin.email);
      console.log('   Auth Type:', admin.authType || 'email');
      console.log('   Created:', admin.createdAt);
      console.log('\n⚠️  Password is hashed and cannot be retrieved.');
      console.log('   If you forgot the password, you can:');
      console.log('   1. Use the forgot password feature');
      console.log('   2. Or delete the admin and create a new one');
    } else {
      console.log('❌ No admin user found.');
      console.log('\nTo create an admin user, make a POST request to:');
      console.log('   http://localhost:3000/api/auth/init-admin');
      console.log('\nWith body:');
      console.log('   {');
      console.log('     "email": "admin@example.com",');
      console.log('     "password": "your_password"');
      console.log('   }');
    }

    await client.close();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkAdmin();

