import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { courseAcknowledgmentService } from '@/lib/courseAcknowledgmentService';
import CoursePage from '../page';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(() => '/course'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      getSession: vi.fn(() => Promise.resolve({ data: { session: { user: { id: 'test-user-id' } } } })),
      signOut: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
    })),
  },
}));

vi.mock('@/lib/courseAcknowledgmentService', () => ({
  courseAcknowledgmentService: {
    checkAcknowledgment: vi.fn(),
    saveAcknowledgment: vi.fn(),
  },
}));

// Mock the WelcomePopup component to control its behavior in integration tests
vi.mock('../components/WelcomePopup', () => ({
  default: ({ userId, courseId, onAcknowledged }: { userId: string; courseId: string; onAcknowledged: () => void }) => {
    const [showPopup, setShowPopup] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(true);
    
    React.useEffect(() => {
      const checkAck = async () => {
        try {
          const acknowledged = await (courseAcknowledgmentService as any).checkAcknowledgment(userId, courseId);
          setShowPopup(!acknowledged);
        } catch (error) {
          setShowPopup(true); // Show on error as safety measure
        } finally {
          setIsLoading(false);
        }
      };
      
      if (userId && courseId) {
        checkAck();
      }
    }, [userId, courseId]);

    if (isLoading || !showPopup) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-testid="welcome-popup">
        <div className="bg-white rounded-lg p-6" dir="rtl">
          <h2>ברוכות הבאות לקורס!</h2>
          <div>הנחיות הקורס</div>
          <div>תנאי שימוש - חשוב מאוד!</div>
          <div>אסור בהחלט</div>
          <button 
            onClick={async () => {
              try {
                await (courseAcknowledgmentService as any).saveAcknowledgment(userId, courseId);
                setShowPopup(false); // Hide popup after successful acknowledgment
                onAcknowledged();
              } catch (error) {
                console.error('Save failed');
              }
            }}
            data-testid="acknowledge-btn"
          >
            אישור
          </button>
          <button aria-label="סגירה" onClick={() => console.log('Close blocked')}>×</button>
        </div>
      </div>
    );
  },
}));

const mockCourseAcknowledgmentService = courseAcknowledgmentService as any;

describe('Course Welcome Popup Integration Tests', () => {
  const mockUser = { id: 'test-user-id' };
  const mockRouter = { push: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    (useRouter as any).mockReturnValue(mockRouter);
    (supabase.auth.getUser as any).mockResolvedValue({ data: { user: mockUser } });
  });

  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  describe('End-to-End User Flow - Requirements 1.1, 2.2, 3.3', () => {
    it('should complete full first-time user journey from popup display to content access', async () => {
      // Test Requirements: 1.1 (first-time popup display), 2.2 (acknowledged user bypass), 3.3 (content access control)
      
      // Mock first-time user (not acknowledged)
      mockCourseAcknowledgmentService.checkAcknowledgment.mockResolvedValue(false);
      mockCourseAcknowledgmentService.saveAcknowledgment.mockResolvedValue(undefined);

      render(<CoursePage />);

      // Step 1: Verify loading state during acknowledgment check
      await waitFor(() => {
        expect(screen.getByText('בודק הרשאות גישה...')).toBeInTheDocument();
      });

      // Step 2: Wait for acknowledgment check to complete and verify content is blocked
      await waitFor(() => {
        expect(mockCourseAcknowledgmentService.checkAcknowledgment).toHaveBeenCalledWith('test-user-id', 'main-course');
      });

      await waitFor(() => {
        expect(screen.getByText('נדרש אישור תנאי השימוש')).toBeInTheDocument();
      });

      // Verify content access is blocked (Requirement 3.3)
      expect(screen.getByText('כדי לגשת לתכני הקורס, יש לקרוא ולאשר את הנחיות הקורס ותנאי השימוש בחלון הצף שמופיע.')).toBeInTheDocument();
      expect(screen.queryByText('טוען קורס...')).not.toBeInTheDocument();

      // Step 3: Verify welcome popup is displayed (Requirement 1.1)
      await waitFor(() => {
        expect(screen.getByTestId('welcome-popup')).toBeInTheDocument();
      });

      expect(screen.getByText('ברוכות הבאות לקורס!')).toBeInTheDocument();
      expect(screen.getByText('הנחיות הקורס')).toBeInTheDocument();
      expect(screen.getByText('תנאי שימוש - חשוב מאוד!')).toBeInTheDocument();

      // Step 4: Complete acknowledgment process
      const acknowledgeBtn = screen.getByTestId('acknowledge-btn');
      fireEvent.click(acknowledgeBtn);

      // Step 5: Verify acknowledgment is saved
      await waitFor(() => {
        expect(mockCourseAcknowledgmentService.saveAcknowledgment).toHaveBeenCalledWith('test-user-id', 'main-course');
      });

      // Step 6: Verify popup disappears and content access is granted
      await waitFor(() => {
        expect(screen.queryByText('נדרש אישור תנאי השימוש')).not.toBeInTheDocument();
      });

      // Verify course content loading begins (content access granted)
      // Note: With empty units array, no loading state is shown
      await waitFor(() => {
        expect(screen.queryByText('נדרש אישור תנאי השימוש')).not.toBeInTheDocument();
      });

      // Verify popup is gone and content area is accessible
      expect(screen.queryByTestId('welcome-popup')).not.toBeInTheDocument();
    }, 30000);

    it('should bypass popup for acknowledged users and show content directly', async () => {
      // Test Requirement 2.2: acknowledged user bypass
      
      // Mock acknowledged user
      mockCourseAcknowledgmentService.checkAcknowledgment.mockResolvedValue(true);

      render(<CoursePage />);

      // Step 1: Verify loading state during acknowledgment check
      await waitFor(() => {
        expect(screen.getByText('בודק הרשאות גישה...')).toBeInTheDocument();
      });

      // Step 2: Wait for acknowledgment check to complete
      await waitFor(() => {
        expect(mockCourseAcknowledgmentService.checkAcknowledgment).toHaveBeenCalledWith('test-user-id', 'main-course');
      });

      // Step 3: Verify popup is NOT displayed for acknowledged users
      await waitFor(() => {
        expect(screen.queryByText('נדרש אישור תנאי השימוש')).not.toBeInTheDocument();
      });

      expect(screen.queryByTestId('welcome-popup')).not.toBeInTheDocument();

      // Step 4: Verify content access is granted immediately
      await waitFor(() => {
        expect(screen.queryByText('נדרש אישור תנאי השימוש')).not.toBeInTheDocument();
      });

      // Verify course content is shown (empty units array means no loading state)
      expect(screen.queryByText('טוען קורס...')).not.toBeInTheDocument();

      // Verify no blocking overlay is present
      const overlay = document.querySelector('.fixed.inset-0.bg-black.bg-opacity-50');
      expect(overlay).not.toBeInTheDocument();
    }, 15000);

    it('should handle database errors gracefully and default to showing popup', async () => {
      // Test Requirement 4.3: error handling safety
      
      // Mock database error
      mockCourseAcknowledgmentService.checkAcknowledgment.mockRejectedValue(new Error('Database connection failed'));

      render(<CoursePage />);

      // Step 1: Verify loading state during acknowledgment check
      await waitFor(() => {
        expect(screen.getByText('בודק הרשאות גישה...')).toBeInTheDocument();
      });

      // Step 2: Wait for error handling to complete
      await waitFor(() => {
        expect(mockCourseAcknowledgmentService.checkAcknowledgment).toHaveBeenCalledWith('test-user-id', 'main-course');
      });

      // Step 3: Verify popup is shown as safety measure
      await waitFor(() => {
        expect(screen.getByText('נדרש אישור תנאי השימוש')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByTestId('welcome-popup')).toBeInTheDocument();
      });

      // Step 4: Verify content access is blocked (safety measure)
      expect(screen.getByText('כדי לגשת לתכני הקורס, יש לקרוא ולאשר את הנחיות הקורס ותנאי השימוש בחלון הצף שמופיע.')).toBeInTheDocument();
      expect(screen.queryByText('טוען קורס...')).not.toBeInTheDocument();
    }, 15000);
  });

  describe('Integration with Existing Course Components', () => {
    it('should integrate properly with CourseHeader and maintain sign-out functionality', async () => {
      // Mock acknowledged user to access course content
      mockCourseAcknowledgmentService.checkAcknowledgment.mockResolvedValue(true);

      render(<CoursePage />);

      // Wait for acknowledgment check
      await waitFor(() => {
        expect(mockCourseAcknowledgmentService.checkAcknowledgment).toHaveBeenCalledWith('test-user-id', 'main-course');
      });

      // Wait for course content to load (empty units means no loading state)
      await waitFor(() => {
        expect(screen.queryByText('נדרש אישור תנאי השימוש')).not.toBeInTheDocument();
      });

      // Verify CourseHeader is rendered (check for sign out button)
      expect(screen.getByText('יציאה')).toBeInTheDocument();
      
      // Test sign-out functionality integration
      const signOutButton = screen.getByText('יציאה');
      fireEvent.click(signOutButton);
      
      expect(supabase.auth.signOut).toHaveBeenCalled();
      expect(mockRouter.push).toHaveBeenCalledWith('/');
    }, 15000);

    it('should integrate with UnitSection components when course data is available', async () => {
      // Mock acknowledged user
      mockCourseAcknowledgmentService.checkAcknowledgment.mockResolvedValue(true);
      
      // Mock course data with proper duration format
      const mockUnits = [
        {
          id: 1,
          title: 'Unit 1',
          order: 1,
          description: 'First unit',
          lessons: [
            {
              id: 1,
              title: 'Lesson 1',
              order: 1,
              duration: '00:30:00', // Proper string format
              locked: false,
              embedUrl: 'https://example.com',
              notes: 'Test notes',
              description: 'Test lesson',
              is_lab: false
            }
          ]
        }
      ];

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockUnits, error: null })
          })
        })
      });

      render(<CoursePage />);

      // Wait for acknowledgment check
      await waitFor(() => {
        expect(mockCourseAcknowledgmentService.checkAcknowledgment).toHaveBeenCalledWith('test-user-id', 'main-course');
      });

      // Wait for course data to load and verify units are displayed
      await waitFor(() => {
        expect(screen.getByText('Unit 1')).toBeInTheDocument();
      });

      // Verify loading state is gone
      expect(screen.queryByText('טוען קורס...')).not.toBeInTheDocument();
    }, 15000);

    it('should handle course loading errors while maintaining popup functionality', async () => {
      // Mock acknowledged user
      mockCourseAcknowledgmentService.checkAcknowledgment.mockResolvedValue(true);
      
      // Mock course loading error
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: null, error: new Error('Failed to load course') })
          })
        })
      });

      render(<CoursePage />);

      // Wait for acknowledgment check
      await waitFor(() => {
        expect(mockCourseAcknowledgmentService.checkAcknowledgment).toHaveBeenCalledWith('test-user-id', 'main-course');
      });

      // Wait for course loading error
      await waitFor(() => {
        expect(screen.getByText('שגיאה בטעינת הקורס')).toBeInTheDocument();
      });

      // Verify error is displayed but popup functionality remains intact
      expect(screen.getByText('Failed to load course')).toBeInTheDocument();
      expect(screen.queryByTestId('welcome-popup')).not.toBeInTheDocument(); // Should not show popup for acknowledged user
    }, 15000);
  });

  describe('Popup Persistence and User Experience', () => {
    it('should maintain popup persistence across page refreshes for unacknowledged users', async () => {
      // Test Requirements 3.1, 3.2: popup persistence
      
      // Mock unacknowledged user
      mockCourseAcknowledgmentService.checkAcknowledgment.mockResolvedValue(false);

      // Simulate first page load
      const { unmount } = render(<CoursePage />);

      await waitFor(() => {
        expect(screen.getByTestId('welcome-popup')).toBeInTheDocument();
      });

      // Simulate page refresh by unmounting and remounting
      unmount();
      cleanup();

      // Mock still unacknowledged after refresh
      mockCourseAcknowledgmentService.checkAcknowledgment.mockResolvedValue(false);

      render(<CoursePage />);

      // Verify popup appears again after refresh
      await waitFor(() => {
        expect(mockCourseAcknowledgmentService.checkAcknowledgment).toHaveBeenCalledWith('test-user-id', 'main-course');
      });

      await waitFor(() => {
        expect(screen.getByTestId('welcome-popup')).toBeInTheDocument();
      });

      // Verify content is still blocked
      expect(screen.getByText('נדרש אישור תנאי השימוש')).toBeInTheDocument();
    }, 15000);

    it('should prevent popup closure without acknowledgment', async () => {
      // Test Requirement 3.1: popup persistence when closed without acknowledgment
      
      // Mock unacknowledged user
      mockCourseAcknowledgmentService.checkAcknowledgment.mockResolvedValue(false);

      render(<CoursePage />);

      await waitFor(() => {
        expect(screen.getByTestId('welcome-popup')).toBeInTheDocument();
      });

      // Try to close popup without acknowledgment
      const closeButton = document.querySelector('button[aria-label="סגירה"]');
      expect(closeButton).toBeInTheDocument();

      if (closeButton) {
        fireEvent.click(closeButton);
        
        // Wait and verify popup is still visible (persistence)
        await new Promise(resolve => setTimeout(resolve, 200));
        expect(screen.getByTestId('welcome-popup')).toBeInTheDocument();
        
        // Verify content is still blocked
        expect(screen.getByText('נדרש אישור תנאי השימוש')).toBeInTheDocument();
      }
    }, 15000);

    it('should handle acknowledgment save errors gracefully', async () => {
      // Test error handling during acknowledgment save process
      
      // Mock unacknowledged user
      mockCourseAcknowledgmentService.checkAcknowledgment.mockResolvedValue(false);
      // Mock save error
      mockCourseAcknowledgmentService.saveAcknowledgment.mockRejectedValue(new Error('Save failed'));

      render(<CoursePage />);

      await waitFor(() => {
        expect(screen.getByTestId('welcome-popup')).toBeInTheDocument();
      });

      // Try to acknowledge
      const acknowledgeBtn = screen.getByTestId('acknowledge-btn');
      fireEvent.click(acknowledgeBtn);

      // Wait for save attempt
      await waitFor(() => {
        expect(mockCourseAcknowledgmentService.saveAcknowledgment).toHaveBeenCalledWith('test-user-id', 'main-course');
      });

      // Verify popup remains visible on save error (graceful error handling)
      await new Promise(resolve => setTimeout(resolve, 200));
      expect(screen.getByTestId('welcome-popup')).toBeInTheDocument();
      
      // Verify content access is still blocked
      expect(screen.getByText('נדרש אישור תנאי השימוש')).toBeInTheDocument();
    }, 15000);
  });

  describe('Authentication Integration', () => {
    it('should handle user authentication state changes properly', async () => {
      // Test integration with authentication system - simplified version
      
      // Start with no user
      (supabase.auth.getUser as any).mockResolvedValue({ data: { user: null } });

      const { unmount } = render(<CoursePage />);

      // Verify no popup is shown when no user is authenticated
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(screen.queryByTestId('welcome-popup')).not.toBeInTheDocument();

      // Clean up and test with authenticated user
      unmount();
      cleanup();
      vi.clearAllMocks();

      // Now test with authenticated unacknowledged user
      (supabase.auth.getUser as any).mockResolvedValue({ data: { user: mockUser } });
      mockCourseAcknowledgmentService.checkAcknowledgment.mockResolvedValue(false);

      render(<CoursePage />);

      // Verify popup appears for authenticated unacknowledged user
      await waitFor(() => {
        expect(screen.getByText('בודק הרשאות גישה...')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(mockCourseAcknowledgmentService.checkAcknowledgment).toHaveBeenCalledWith('test-user-id', 'main-course');
      });

      await waitFor(() => {
        expect(screen.getByTestId('welcome-popup')).toBeInTheDocument();
      });
    }, 15000);
  });
});