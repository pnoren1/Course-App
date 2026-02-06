/**
 * Manual test script for Video View Service
 * Run with: npx tsx test-video-views-service.ts
 * 
 * This script tests the service layer functions directly
 */

import { videoViewService } from './lib/services/videoViewService';
import { getSupabaseAdmin } from './lib/supabase';

async function runTests() {
  console.log('🧪 Starting Video View Service Tests\n');
  
  const adminClient = getSupabaseAdmin();
  let testUserId: string | null = null;
  let testOrgId: string | null = null;
  let adminUserId: string | null = null;
  let orgAdminUserId: string | null = null;

  try {
    // Setup: Create test organization
    console.log('📋 Setting up test data...');
    const { data: org, error: orgError } = await adminClient
      .from('organizations')
      .insert({ name: `Test Org ${Date.now()}` })
      .select()
      .single();

    if (orgError) throw new Error(`Failed to create org: ${orgError.message}`);
    testOrgId = org.id;
    console.log(`✅ Created test organization: ${testOrgId}`);

    // Create test student
    const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
      email: `test-student-${Date.now()}@example.com`,
      password: 'testpassword123',
      email_confirm: true
    });

    if (authError) throw new Error(`Failed to create user: ${authError.message}`);
    testUserId = authUser.user.id;

    await adminClient.from('user_profile').insert({
      id: testUserId,
      username: 'test-student',
      email: authUser.user.email,
      role: 'student',
      organization_id: testOrgId
    });
    console.log(`✅ Created test student: ${testUserId}`);

    // Create admin user
    const { data: adminAuth, error: adminAuthError } = await adminClient.auth.admin.createUser({
      email: `test-admin-${Date.now()}@example.com`,
      password: 'testpassword123',
      email_confirm: true
    });

    if (adminAuthError) throw new Error(`Failed to create admin: ${adminAuthError.message}`);
    adminUserId = adminAuth.user.id;

    await adminClient.from('user_profile').insert({
      id: adminUserId,
      username: 'test-admin',
      email: adminAuth.user.email,
      role: 'admin'
    });
    console.log(`✅ Created test admin: ${adminUserId}`);

    // Create org_admin user
    const { data: orgAdminAuth, error: orgAdminAuthError } = await adminClient.auth.admin.createUser({
      email: `test-org-admin-${Date.now()}@example.com`,
      password: 'testpassword123',
      email_confirm: true
    });

    if (orgAdminAuthError) throw new Error(`Failed to create org admin: ${orgAdminAuthError.message}`);
    orgAdminUserId = orgAdminAuth.user.id;

    await adminClient.from('user_profile').insert({
      id: orgAdminUserId,
      username: 'test-org-admin',
      email: orgAdminAuth.user.email,
      role: 'org_admin',
      organization_id: testOrgId
    });
    console.log(`✅ Created test org_admin: ${orgAdminUserId}\n`);

    // Test 1: Create video view
    console.log('Test 1: Create video view');
    const view1 = await videoViewService.createView(testUserId, 'lesson-1-intro');
    console.log(`✅ Created view: ${view1.id}`);
    console.log(`   User: ${view1.user_id}, Lesson: ${view1.lesson_id}\n`);

    // Test 2: Idempotency
    console.log('Test 2: Idempotency - create same view again');
    const view2 = await videoViewService.createView(testUserId, 'lesson-1-intro');
    if (view1.id === view2.id) {
      console.log(`✅ Idempotency works - same ID returned: ${view2.id}\n`);
    } else {
      console.log(`❌ Idempotency failed - different IDs: ${view1.id} vs ${view2.id}\n`);
    }

    // Test 3: Create multiple views
    console.log('Test 3: Create multiple views for same user');
    await videoViewService.createView(testUserId, 'lesson-2-basics');
    await videoViewService.createView(testUserId, 'lesson-3-advanced');
    console.log(`✅ Created additional views\n`);

    // Test 4: Get user views
    console.log('Test 4: Get user views');
    const userViews = await videoViewService.getUserViews(testUserId);
    console.log(`✅ Retrieved ${userViews.length} views for user`);
    userViews.forEach(v => {
      console.log(`   - ${v.lesson_id} (${v.created_at})`);
    });
    console.log();

    // Test 5: Has watched lesson
    console.log('Test 5: Check if user has watched specific lessons');
    const hasWatched1 = await videoViewService.hasWatchedLesson(testUserId, 'lesson-1-intro');
    const hasWatched2 = await videoViewService.hasWatchedLesson(testUserId, 'lesson-999-nonexistent');
    console.log(`✅ Has watched lesson-1-intro: ${hasWatched1}`);
    console.log(`✅ Has watched lesson-999-nonexistent: ${hasWatched2}\n`);

    // Test 6: Admin views all progress
    console.log('Test 6: Admin views all student progress');
    const adminProgress = await videoViewService.getAdminViews(adminUserId);
    console.log(`✅ Admin retrieved progress for ${adminProgress.length} students`);
    const testStudentProgress = adminProgress.find(p => p.user_id === testUserId);
    if (testStudentProgress) {
      console.log(`   Test student has ${testStudentProgress.watched_lessons.length} watched lessons`);
    }
    console.log();

    // Test 7: Org admin views organization progress
    console.log('Test 7: Org admin views organization progress');
    const orgAdminProgress = await videoViewService.getAdminViews(orgAdminUserId);
    console.log(`✅ Org admin retrieved progress for ${orgAdminProgress.length} students`);
    const allInOrg = orgAdminProgress.every(p => p.organization_id === testOrgId);
    console.log(`   All students in correct organization: ${allInOrg}\n`);

    // Test 8: Non-admin cannot access admin views
    console.log('Test 8: Non-admin user attempts to access admin views');
    try {
      await videoViewService.getAdminViews(testUserId);
      console.log(`❌ Should have thrown error for non-admin user\n`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('admin privileges')) {
        console.log(`✅ Correctly rejected non-admin user\n`);
      } else {
        console.log(`❌ Wrong error: ${error}\n`);
      }
    }

    console.log('✅ All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    if (testUserId) {
      await adminClient.from('video_views').delete().eq('user_id', testUserId);
      await adminClient.from('user_profile').delete().eq('id', testUserId);
      await adminClient.auth.admin.deleteUser(testUserId);
    }
    if (adminUserId) {
      await adminClient.from('user_profile').delete().eq('id', adminUserId);
      await adminClient.auth.admin.deleteUser(adminUserId);
    }
    if (orgAdminUserId) {
      await adminClient.from('user_profile').delete().eq('id', orgAdminUserId);
      await adminClient.auth.admin.deleteUser(orgAdminUserId);
    }
    if (testOrgId) {
      await adminClient.from('organizations').delete().eq('id', testOrgId);
    }
    console.log('✅ Cleanup complete');
  }
}

runTests().catch(console.error);
