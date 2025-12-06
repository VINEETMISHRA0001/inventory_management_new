/**
 * Script to reset admin password.
 * Usage: node scripts/reset-admin-password.js <email> <new_password>
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function resetAdminPassword() {
  try {
    console.log('Admin Password Reset');
    console.log('===================\n');

    const email = await question('Enter admin email: ');
    const newPassword = await question('Enter new password (min 6 characters): ');

    if (!email || !newPassword) {
      console.error('Email and password are required');
      process.exit(1);
    }

    if (newPassword.length < 6) {
      console.error('Password must be at least 6 characters');
      process.exit(1);
    }

    const response = await fetch('http://localhost:3000/api/auth/reset-admin-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, newPassword }),
    });

    const data = await response.json();

    if (response.ok) {
      console.log('\n✅ Success:', data.message);
      console.log('   You can now login with:');
      console.log('   Email:', email);
      console.log('   Password:', newPassword);
    } else {
      console.error('\n❌ Error:', data.error);
    }
  } catch (error) {
    console.error('Error:', error.message);
    console.log('\nMake sure the development server is running (npm run dev)');
  } finally {
    rl.close();
  }
}

resetAdminPassword();

