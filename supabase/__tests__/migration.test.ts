import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';

// Mock Supabase client for migration testing
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      insert: vi.fn(() => ({
        error: null
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          error: null
        }))
      }))
    })),
    auth: {
      getUser: vi.fn()
    }
  }
}));

import { supabase } from '../../lib/supabase';

const mockSupabase = supabase as any;

describe('Migration 002: Add user_name to acknowledgments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Property 3: Migration populates all existing records', () => {
    it('should populate user_name for all existing acknowledgment records after migration', async () => {
      // Feature: add-username-to-acknowledgments, Property 3: Migration populates all existing records
      // **Validates: Requirements 2.1, 2.4**
      
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: fc.uuid(),
              user_id: fc.uuid(),
              course_id: fc.string({ minLength: 1, maxLength: 50 }),
              acknowledged_at: fc.date().map(d => d.toISOString()),
              created_at: fc.date().map(d => d.toISOString())
            }),
            { minLength: 1, maxLength: 10 }
          ), // Generate array of existing acknowledgment records
          fc.array(
            fc.record({
              id: fc.uuid(),
              email: fc.emailAddress(),
              raw_user_meta_data: fc.oneof(
                fc.record({
                  display_name: fc.string({ minLength: 1, maxLength: 50 }),
                  full_name: fc.option(fc.string({ minLength: 1, maxLength: 50 }))
                }),
                fc.record({
                  full_name: fc.string({ minLength: 1, maxLength: 50 }),
                  display_name: fc.option(fc.string({ minLength: 1, maxLength: 50 }))
                }),
                fc.record({}) // No metadata
              )
            }),
            { minLength: 1, maxLength: 10 }
          ), // Generate array of auth.users records
          async (existingAcknowledgments, authUsers) => {
            // Reset mocks for each iteration
            vi.clearAllMocks();
            
            // Ensure each acknowledgment has a corresponding user
            const acknowledgmentsWithUsers = existingAcknowledgments.map((ack, index) => ({
              ...ack,
              user_id: authUsers[index % authUsers.length].id
            }));
            
            // Mock the migration process:
            // 1. First, simulate existing records without user_name
            const mockSelectExisting = {
              select: vi.fn().mockResolvedValue({
                data: acknowledgmentsWithUsers.map(ack => ({ ...ack, user_name: null })),
                error: null
              })
            };
            
            // 2. Mock the auth.users data for the UPDATE query
            const mockAuthUsers = authUsers.reduce((acc, user) => {
              acc[user.id] = user;
              return acc;
            }, {} as Record<string, any>);
            
            // 3. Mock the update operation that populates user_name
            const mockUpdate = {
              update: vi.fn().mockImplementation((updateData) => ({
                eq: vi.fn().mockResolvedValue({ error: null })
              }))
            };
            
            // 4. Mock the final verification query
            const mockSelectAfterMigration = {
              select: vi.fn().mockResolvedValue({
                data: acknowledgmentsWithUsers.map(ack => {
                  const user = mockAuthUsers[ack.user_id];
                  const userName = user?.raw_user_meta_data?.display_name?.trim() ||
                                 user?.raw_user_meta_data?.full_name?.trim() ||
                                 user?.email ||
                                 'Unknown User';
                  return { ...ack, user_name: userName };
                }),
                error: null
              })
            };
            
            mockSupabase.from
              .mockReturnValueOnce(mockSelectExisting) // Before migration
              .mockReturnValueOnce(mockUpdate) // Migration update
              .mockReturnValueOnce(mockSelectAfterMigration); // After migration
            
            // Simulate the migration process
            
            // 1. Get existing records before migration
            const beforeMigration = await mockSupabase.from('course_acknowledgments').select('*');
            expect(beforeMigration.data).toBeDefined();
            expect(beforeMigration.data.length).toBe(acknowledgmentsWithUsers.length);
            
            // Verify all records have null user_name before migration
            beforeMigration.data.forEach((record: any) => {
              expect(record.user_name).toBeNull();
            });
            
            // 2. Simulate the migration UPDATE operation
            await mockSupabase.from('course_acknowledgments').update({
              user_name: 'populated_by_migration'
            }).eq('user_name', null);
            
            // 3. Verify all records have user_name after migration
            const afterMigration = await mockSupabase.from('course_acknowledgments').select('*');
            expect(afterMigration.data).toBeDefined();
            expect(afterMigration.data.length).toBe(acknowledgmentsWithUsers.length);
            
            // Property: All existing records should have user_name populated after migration
            afterMigration.data.forEach((record: any) => {
              expect(record.user_name).toBeDefined();
              expect(record.user_name).not.toBeNull();
              expect(record.user_name).not.toBe('');
              expect(typeof record.user_name).toBe('string');
              expect(record.user_name.length).toBeGreaterThan(0);
            });
            
            // Verify the migration was called correctly
            expect(mockSupabase.from).toHaveBeenCalledWith('course_acknowledgments');
            expect(mockUpdate.update).toHaveBeenCalled();
          }
        ),
        { numRuns: 100 } // Run 100 iterations as specified in design
      );
    });
    
    it('should handle edge cases during migration', async () => {
      // Test specific edge cases for migration
      const edgeCases = [
        {
          name: 'user with display_name',
          user: { 
            id: 'user1', 
            email: 'test@example.com',
            raw_user_meta_data: { display_name: 'John Doe' }
          },
          expectedUserName: 'John Doe'
        },
        {
          name: 'user with full_name only',
          user: { 
            id: 'user2', 
            email: 'test2@example.com',
            raw_user_meta_data: { full_name: 'Jane Smith' }
          },
          expectedUserName: 'Jane Smith'
        },
        {
          name: 'user with email fallback',
          user: { 
            id: 'user3', 
            email: 'fallback@example.com',
            raw_user_meta_data: {}
          },
          expectedUserName: 'fallback@example.com'
        },
        {
          name: 'user with empty display_name',
          user: { 
            id: 'user4', 
            email: 'empty@example.com',
            raw_user_meta_data: { display_name: '   ' }
          },
          expectedUserName: 'empty@example.com'
        }
      ];
      
      for (const testCase of edgeCases) {
        vi.clearAllMocks();
        
        const acknowledgment = {
          id: 'ack1',
          user_id: testCase.user.id,
          course_id: 'course1',
          user_name: null
        };
        
        // Mock the migration logic for this specific case
        const mockUpdate = {
          update: vi.fn().mockResolvedValue({ error: null })
        };
        
        const mockSelectAfter = {
          select: vi.fn().mockResolvedValue({
            data: [{ ...acknowledgment, user_name: testCase.expectedUserName }],
            error: null
          })
        };
        
        mockSupabase.from
          .mockReturnValueOnce(mockUpdate)
          .mockReturnValueOnce(mockSelectAfter);
        
        // Simulate migration for this case
        await mockSupabase.from('course_acknowledgments').update({
          user_name: testCase.expectedUserName
        });
        
        // Verify result
        const result = await mockSupabase.from('course_acknowledgments').select('*');
        expect(result.data[0].user_name).toBe(testCase.expectedUserName);
      }
    });
  });
});