import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function clearAuth() {
  try {
    console.log('🧹 Clearing Authentication Session...\n');

    // Check current auth status
    console.log('1️⃣ Checking current authentication status...');
    const {
      data: { user },
      error: getUserError,
    } = await supabase.auth.getUser();

    if (getUserError) {
      console.log('   ⚠️ Error getting user:', getUserError.message);
    } else if (user) {
      console.log(`   👤 Currently logged in as: ${user.email}`);
    } else {
      console.log('   ℹ️ No user currently logged in');
    }

    // Sign out
    console.log('\n2️⃣ Signing out...');
    const { error: signOutError } = await supabase.auth.signOut();

    if (signOutError) {
      console.error('   ❌ Sign out failed:', signOutError.message);
    } else {
      console.log('   ✅ Successfully signed out');
    }

    // Verify sign out
    console.log('\n3️⃣ Verifying sign out...');
    const {
      data: { user: userAfterSignOut },
      error: checkError,
    } = await supabase.auth.getUser();

    if (checkError) {
      console.log(
        '   ⚠️ Error checking user after sign out:',
        checkError.message
      );
    } else if (userAfterSignOut) {
      console.log('   ⚠️ User still appears to be logged in');
    } else {
      console.log('   ✅ User successfully logged out');
    }

    console.log('\n📋 Manual Steps to Complete Logout:');
    console.log('===================================');
    console.log('1. Open your browser');
    console.log('2. Go to http://localhost:3009');
    console.log('3. Open Developer Tools (F12)');
    console.log('4. Go to Application/Storage tab');
    console.log('5. Clear the following:');
    console.log('   - Local Storage (all supabase keys)');
    console.log('   - Session Storage (all supabase keys)');
    console.log('   - Cookies (supabase related)');
    console.log('6. Refresh the page');
    console.log('\nOR simply open an Incognito/Private window');

    console.log('\n🎯 Expected Result:');
    console.log('- Should see login/signup form');
    console.log('- No automatic login');
    console.log('- Ready for fresh authentication test');
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the script
clearAuth();
