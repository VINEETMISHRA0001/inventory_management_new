/**
 * Script to initialize the admin user in the database.
 * Run this once to create the first admin user.
 * Usage: node scripts/init-admin.js <email> <password>
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function initAdmin() {
  try {
    console.log('Admin User Initialization');
    console.log('========================\n');

    const email = await question('Enter admin email: ');
    const password = await question('Enter admin password (min 6 characters): ');

    if (!email || !password) {
      console.error('Email and password are required');
      process.exit(1);
    }

    if (password.length < 6) {
      console.error('Password must be at least 6 characters');
      process.exit(1);
    }

    const response = await fetch('http://localhost:3000/api/auth/init-admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (response.ok) {
      console.log('\n✅ Success:', data.message);
    } else {
      console.error('\n❌ Error:', data.error);
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    rl.close();
  }
}

initAdmin();

