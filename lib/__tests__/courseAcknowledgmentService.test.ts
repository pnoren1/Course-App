import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';

// Mock Supabase client first
vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn()
          })),
          order: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      })),
      insert: vi.fn(() => ({
        error: null
      }))
    })),
    auth: {
      admin: {
        getUserById: vi.fn()
      }
    }
  }
}));

import { SupabaseCourseAcknowledgmentService } from '../courseAcknowledgmentService';
import { supabase } from '../supabase';

const mockSupabase = supabase as any;

describe('SupabaseCourseAcknowledgmentService', () => {
  let service: SupabaseCourseAcknowledgmentService;

  beforeEach(() => {
    service = new SupabaseCourseAcknowledgmentService();
    vi.clearAllMocks();
  });

  describe('checkAcknowledgment', () => {
    it('should return false when no acknowledgment exists', async () => {
      const mockChain = {
        single: vi.fn().mockResolvedValue({ 
          data: null, 
          error: { code: 'PGRST116' } 
        })
      };
      
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue(mockChain)
          })
        })
      });

      const result = await service.checkAcknowledgment('user123', 'course456');
      
      expect(result).toBe(false);
      expect(mockSupabase.from).toHaveBeenCalledWith('course_acknowledgments');
    });

    it('should return true when acknowledgment exists', async () => {
      const mockChain = {
        single: vi.fn().mockResolvedValue({ 
          data: { id: 'ack123' }, 
          error: null 
        })
      };
      
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue(mockChain)
          })
        })
      });

      const result = await service.checkAcknowledgment('user123', 'course456');
      
      expect(result).toBe(true);
    });

    it('should return false on database error (safety measure)', async () => {
      const mockChain = {
        single: vi.fn().mockRejectedValue(new Error('Database error'))
      };
      
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue(mockChain)
          })
        })
      });

      const result = await service.checkAcknowledgment('user123', 'course456');
      
      expect(result).toBe(false);
    });
  });

  describe('getUserName', () => {
    it('should return display name when available', async () => {
      const mockUser = {
        user: {
          id: 'user123',
          email: 'test@example.com',
          user_metadata: {
            full_name: 'John Doe',
            display_name: 'Johnny'
          }
        }
      };

      (mockSupabase.auth.admin.getUserById as any).mockResolvedValue({
        data: mockUser,
        error: null
      });

      const result = await service.getUserName('user123');
      
      expect(result).toBe('John Doe');
      expect(mockSupabase.auth.admin.getUserById).toHaveBeenCalledWith('user123');
    });

    it('should fallback to email when display name is not available', async () => {
      const mockUser = {
        user: {
          id: 'user123',
          email: 'test@example.com',
          user_metadata: {}
        }
      };

      (mockSupabase.auth.admin.getUserById as any).mockResolvedValue({
        data: mockUser,
        error: null
      });

      const result = await service.getUserName('user123');
      
      expect(result).toBe('test@example.com');
    });

    it('should return "Unknown User" when user data is missing', async () => {
      (mockSupabase.auth.admin.getUserById as any).mockResolvedValue({
        data: null,
        error: { message: 'User not found' }
      });

      const result = await service.getUserName('nonexistent');
      
      expect(result).toBe('Unknown User');
    });
  });

  // Property-based test for user name population on creation
  describe('Property 1: User name population on creation', () => {
    it('should fetch and store the users display name from auth.users in the user_name field for any new acknowledgment created', async () => {
      // Feature: add-username-to-acknowledgments, Property 1: User name population on creation
      // **Validates: Requirements 1.1, 4.1**
      
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }), // userId
          fc.string({ minLength: 1, maxLength: 100 }), // full_name
          fc.string({ minLength: 1, maxLength: 100 }), // display_name
          fc.emailAddress(), // email
          async (userId, fullName, displayName, email) => {
            // Reset mocks for each iteration
            vi.clearAllMocks();
            
            // Mock user data with full_name available
            const mockUser = {
              user: {
                id: userId,
                email: email,
                user_metadata: {
                  full_name: fullName,
                  display_name: displayName
                }
              }
            };

            (mockSupabase.auth.admin.getUserById as any).mockResolvedValue({
              data: mockUser,
              error: null
            });

            // Test getUserName method
            const result = await service.getUserName(userId);
            
            // Verify that the system fetches and returns the user's display name
            // Priority is: full_name > display_name > email
            expect(result).toBe(fullName.trim());
            expect(mockSupabase.auth.admin.getUserById).toHaveBeenCalledWith(userId);
          }
        ),
        { numRuns: 100 } // Run 100 iterations as specified in design
      );
    });
  });

  // Property-based test for email fallback when display name unavailable
  describe('Property 2: Email fallback when display name unavailable', () => {
    it('should use the users email as the user_name value for any user without a display name', async () => {
      // Feature: add-username-to-acknowledgments, Property 2: Email fallback when display name unavailable
      // **Validates: Requirements 1.2, 4.1**
      
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }), // userId
          fc.emailAddress(), // email
          async (userId, email) => {
            // Reset mocks for each iteration
            vi.clearAllMocks();
            
            // Mock user data without display names (empty metadata)
            const mockUser = {
              user: {
                id: userId,
                email: email,
                user_metadata: {} // No full_name or display_name
              }
            };

            (mockSupabase.auth.admin.getUserById as any).mockResolvedValue({
              data: mockUser,
              error: null
            });

            // Test getUserName method
            const result = await service.getUserName(userId);
            
            // Verify that the system falls back to email when no display name is available
            expect(result).toBe(email);
            expect(mockSupabase.auth.admin.getUserById).toHaveBeenCalledWith(userId);
          }
        ),
        { numRuns: 100 } // Run 100 iterations as specified in design
      );
    });
  });

  describe('saveAcknowledgment', () => {
    it('should save acknowledgment successfully', async () => {
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null })
      });

      await expect(service.saveAcknowledgment('user123', 'course456', 'Test User')).resolves.not.toThrow();
      
      expect(mockSupabase.from).toHaveBeenCalledWith('course_acknowledgments');
    });

    it('should throw error when save fails', async () => {
      const mockError = new Error('Insert failed');
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: mockError })
      });

      await expect(service.saveAcknowledgment('user123', 'course456', 'Test User')).rejects.toThrow();
    });
  });

  // Property-based test for acknowledgment persistence
  describe('Property 4: Acknowledgment persistence', () => {
    it('should save acknowledgment status and remain accessible in future queries', async () => {
      // Feature: course-welcome-popup, Property 4: Acknowledgment persistence
      // **Validates: Requirements 2.1, 2.3**
      
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }), // userId
          fc.string({ minLength: 1, maxLength: 50 }), // courseId
          async (userId, courseId) => {
            // Reset mocks for each iteration
            vi.clearAllMocks();
            
            // Mock getUserName to return a test user name
            (mockSupabase.auth.admin.getUserById as any).mockResolvedValue({
              data: {
                user: {
                  id: userId,
                  email: 'test@example.com',
                  user_metadata: {
                    full_name: 'Test User'
                  }
                }
              },
              error: null
            });
            
            // Mock successful save operation
            const mockInsertChain = {
              insert: vi.fn().mockResolvedValue({ error: null })
            };
            
            // Mock successful check operation returning saved data
            const mockSelectChain = {
              single: vi.fn().mockResolvedValue({ 
                data: { 
                  id: 'test-id',
                  user_id: userId,
                  user_name: 'Test User',
                  course_id: courseId,
                  acknowledged_at: new Date().toISOString()
                }, 
                error: null 
              })
            };
            
            // First call for save operation
            mockSupabase.from
              .mockReturnValueOnce(mockInsertChain)
              // Second call for check operation
              .mockReturnValueOnce({
                select: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue(mockSelectChain)
                  })
                })
              });

            // Save acknowledgment (simulating valid form submission)
            await service.saveAcknowledgment(userId, courseId);
            
            // Verify save was called with correct table
            expect(mockSupabase.from).toHaveBeenCalledWith('course_acknowledgments');
            expect(mockInsertChain.insert).toHaveBeenCalledWith({
              user_id: userId,
              user_name: 'Test User',
              course_id: courseId
            });
            
            // Check acknowledgment status (simulating future query)
            const isAcknowledged = await service.checkAcknowledgment(userId, courseId);
            
            // Verify the acknowledgment persisted and is accessible
            expect(isAcknowledged).toBe(true);
            expect(mockSupabase.from).toHaveBeenCalledWith('course_acknowledgments');
            expect(mockSupabase.from).toHaveBeenCalledTimes(2); // Once for save, once for check
          }
        ),
        { numRuns: 100 } // Run 100 iterations as specified in design
      );
    });
  });

  // Property-based test for Supabase integration
  describe('Property 8: Supabase integration', () => {
    it('should use Supabase database for all acknowledgment operations', async () => {
      // Feature: course-welcome-popup, Property 8: Supabase integration
      // **Validates: Requirements 4.1, 4.2**
      
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }), // userId
          fc.string({ minLength: 1, maxLength: 50 }), // courseId
          async (userId, courseId) => {
            // Reset mocks for each iteration
            vi.clearAllMocks();
            
            // Mock getUserName to return a test user name
            (mockSupabase.auth.admin.getUserById as any).mockResolvedValue({
              data: {
                user: {
                  id: userId,
                  email: 'test@example.com',
                  user_metadata: {
                    full_name: 'Test User'
                  }
                }
              },
              error: null
            });
            
            // Mock successful responses
            const mockSelectChain = {
              single: vi.fn().mockResolvedValue({ 
                data: { id: 'test-id' }, 
                error: null 
              })
            };
            
            const mockInsertChain = {
              insert: vi.fn().mockResolvedValue({ error: null })
            };
            
            mockSupabase.from
              .mockReturnValueOnce({
                select: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue(mockSelectChain)
                  })
                })
              })
              .mockReturnValueOnce(mockInsertChain);

            // Test checkAcknowledgment uses Supabase
            await service.checkAcknowledgment(userId, courseId);
            
            // Verify Supabase was called for check operation
            expect(mockSupabase.from).toHaveBeenCalledWith('course_acknowledgments');
            
            // Test saveAcknowledgment uses Supabase
            await service.saveAcknowledgment(userId, courseId);
            
            // Verify Supabase was called for save operation
            expect(mockSupabase.from).toHaveBeenCalledWith('course_acknowledgments');
            expect(mockSupabase.auth.admin.getUserById).toHaveBeenCalledWith(userId);
            
            // Verify both operations used Supabase (called twice)
            expect(mockSupabase.from).toHaveBeenCalledTimes(2);
          }
        ),
        { numRuns: 100 } // Run 100 iterations as specified in design
      );
    });
  });

  // Property-based test for error handling safety
  describe('Property 9: Error handling safety', () => {
    it('should default to showing the welcome popup as a safety measure for any database error during acknowledgment checking', async () => {
      // Feature: course-welcome-popup, Property 9: Error handling safety
      // **Validates: Requirements 4.3**
      
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }), // userId
          fc.string({ minLength: 1, maxLength: 50 }), // courseId
          fc.oneof(
            fc.constant(new Error('Database connection failed')),
            fc.constant(new Error('Network timeout')),
            fc.constant(new Error('Authentication failed')),
            fc.constant(new Error('Table not found')),
            fc.constant(new Error('Permission denied'))
          ), // Various database error types
          async (userId, courseId, databaseError) => {
            // Reset mocks for each iteration
            vi.clearAllMocks();
            
            // Mock database error during acknowledgment check
            const mockChain = {
              single: vi.fn().mockRejectedValue(databaseError)
            };
            
            mockSupabase.from.mockReturnValue({
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue(mockChain)
                })
              })
            });

            // Test checkAcknowledgment with database error
            const result = await service.checkAcknowledgment(userId, courseId);
            
            // Verify that the system defaults to showing popup (returns false) as safety measure
            // This ensures that if there's any database error, the user will see the popup
            // rather than potentially bypassing important terms and conditions
            expect(result).toBe(false);
            
            // Verify that Supabase was called (the error occurred during the actual database call)
            expect(mockSupabase.from).toHaveBeenCalledWith('course_acknowledgments');
            expect(mockChain.single).toHaveBeenCalled();
          }
        ),
        { numRuns: 100 } // Run 100 iterations as specified in design
      );
    });
  });
});

describe('Integration Tests - Complete Flow with user_name', () => {
  let service: SupabaseCourseAcknowledgmentService;

  beforeEach(() => {
    service = new SupabaseCourseAcknowledgmentService();
    vi.clearAllMocks();
  });

  describe('Complete acknowledgment flow with user_name storage', () => {
    it('should create acknowledgment and verify user_name is stored correctly', async () => {
      // Test Requirements: 1.1, 1.3, 4.1, 4.3
      const userId = 'test-user-123';
      const courseId = 'main-course';
      const expectedUserName = 'John Doe';

      // Mock user data with display name
      mockSupabase.auth.admin.getUserById.mockResolvedValue({
        data: {
          user: {
            id: userId,
            email: 'john.doe@example.com',
            user_metadata: {
              full_name: expectedUserName
            }
          }
        },
        error: null
      });

      // Mock successful insert
      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({
        insert: mockInsert
      });

      // Step 1: Save acknowledgment (should include user_name)
      await service.saveAcknowledgment(userId, courseId);

      // Verify insert was called with user_name
      expect(mockInsert).toHaveBeenCalledWith({
        user_id: userId,
        user_name: expectedUserName,
        course_id: courseId
      });

      // Step 2: Mock the acknowledgment retrieval to verify user_name is stored
      const mockAcknowledgment = {
        id: 'ack-123',
        user_id: userId,
        user_name: expectedUserName,
        course_id: courseId,
        acknowledged_at: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z'
      };

      const mockSelectChain = {
        single: vi.fn().mockResolvedValue({ 
          data: mockAcknowledgment, 
          error: null 
        })
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue(mockSelectChain)
          })
        })
      });

      // Step 3: Retrieve acknowledgment and verify user_name is present
      const retrievedAck = await service.getAcknowledgment(userId, courseId);

      expect(retrievedAck).toBeDefined();
      expect(retrievedAck?.user_name).toBe(expectedUserName);
      expect(retrievedAck?.user_id).toBe(userId);
      expect(retrievedAck?.course_id).toBe(courseId);
    });

    it('should create acknowledgment with email fallback when display name unavailable', async () => {
      // Test Requirements: 1.2, 4.1
      const userId = 'test-user-456';
      const courseId = 'main-course';
      const userEmail = 'jane.smith@example.com';

      // Mock user data without display name (email fallback)
      mockSupabase.auth.admin.getUserById.mockResolvedValue({
        data: {
          user: {
            id: userId,
            email: userEmail,
            user_metadata: {} // No display name
          }
        },
        error: null
      });

      // Mock successful insert
      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({
        insert: mockInsert
      });

      // Save acknowledgment (should use email as user_name)
      await service.saveAcknowledgment(userId, courseId);

      // Verify insert was called with email as user_name
      expect(mockInsert).toHaveBeenCalledWith({
        user_id: userId,
        user_name: userEmail,
        course_id: courseId
      });
    });

    it('should retrieve course acknowledgments with user names without requiring joins', async () => {
      // Test Requirements: 1.3, 4.3 - Benefits of user_name field
      const courseId = 'main-course';
      const mockAcknowledgments = [
        {
          id: 'ack-1',
          user_id: 'user-1',
          user_name: 'Alice Johnson',
          course_id: courseId,
          acknowledged_at: '2024-01-01T00:00:00Z',
          created_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 'ack-2',
          user_id: 'user-2',
          user_name: 'bob.wilson@example.com',
          course_id: courseId,
          acknowledged_at: '2024-01-02T00:00:00Z',
          created_at: '2024-01-02T00:00:00Z'
        }
      ];

      // Mock the new getCourseAcknowledgments method
      const mockOrderChain = {
        order: vi.fn().mockResolvedValue({ 
          data: mockAcknowledgments, 
          error: null 
        })
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue(mockOrderChain)
        })
      });

      // Retrieve all acknowledgments for the course
      const acknowledgments = await service.getCourseAcknowledgments(courseId);

      // Verify results include user names without joins
      expect(acknowledgments).toHaveLength(2);
      expect(acknowledgments[0].user_name).toBe('Alice Johnson');
      expect(acknowledgments[1].user_name).toBe('bob.wilson@example.com');

      // Verify the query was made correctly (no joins needed)
      expect(mockSupabase.from).toHaveBeenCalledWith('course_acknowledgments');
      expect(mockOrderChain.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('should handle complete flow with graceful error handling', async () => {
      // Test Requirements: 4.1, 4.3 - Error handling
      const userId = 'test-user-789';
      const courseId = 'main-course';

      // Mock user fetch failure - getUserName should handle gracefully
      mockSupabase.auth.admin.getUserById.mockRejectedValue(new Error('Network error'));

      // Mock successful insert
      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({
        insert: mockInsert
      });

      // Should succeed with graceful error handling (Unknown User fallback)
      await service.saveAcknowledgment(userId, courseId);

      // Verify insert was called with "Unknown User" fallback
      expect(mockInsert).toHaveBeenCalledWith({
        user_id: userId,
        user_name: 'Unknown User',
        course_id: courseId
      });
    });
  });
});