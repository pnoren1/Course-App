import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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
  },
}));

vi.mock('../components/WelcomePopup', () => ({
  default: ({ onAcknowledged }: { onAcknowledged: () => void }) => (
    <div data-testid="welcome-popup">
      <button onClick={onAcknowledged} data-testid="acknowledge-btn">
        Acknowledge
      </button>
    </div>
  ),
}));

vi.mock('../components/CourseHeader', () => ({
  default: ({ onSignOut }: { onSignOut: () => void }) => (
    <div data-testid="course-header">
      <button onClick={onSignOut}>Sign Out</button>
    </div>
  ),
}));

vi.mock('../components/UnitSection', () => ({
  default: () => <div data-testid="unit-section">Unit Content</div>,
}));

describe('CoursePage Content Access Control', () => {
  const mockUser = { id: 'test-user-id' };
  const mockRouter = { push: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue(mockRouter);
    (supabase.auth.getUser as any).mockResolvedValue({ data: { user: mockUser } });
  });

  it('should show loading state during acknowledgment check', async () => {
    // Mock slow acknowledgment check
    (courseAcknowledgmentService.checkAcknowledgment as any).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(false), 100))
    );

    render(<CoursePage />);

    // Should show acknowledgment loading state
    expect(screen.getByText('בודק הרשאות גישה...')).toBeInTheDocument();
  });

  it('should block course content for unacknowledged users', async () => {
    // Mock unacknowledged user
    (courseAcknowledgmentService.checkAcknowledgment as any).mockResolvedValue(false);

    render(<CoursePage />);

    await waitFor(() => {
      expect(screen.getByText('נדרש אישור תנאי השימוש')).toBeInTheDocument();
    });

    // Should show access blocked message
    expect(screen.getByText('כדי לגשת לתכני הקורס, יש לקרוא ולאשר את הנחיות הקורס ותנאי השימוש בחלון הצף שמופיע.')).toBeInTheDocument();
    
    // Should NOT show course content
    expect(screen.queryByTestId('unit-section')).not.toBeInTheDocument();
  });

  it('should show course content for acknowledged users', async () => {
    // Mock acknowledged user
    (courseAcknowledgmentService.checkAcknowledgment as any).mockResolvedValue(true);

    render(<CoursePage />);

    await waitFor(() => {
      expect(screen.queryByText('נדרש אישור תנאי השימוש')).not.toBeInTheDocument();
    });

    // Should NOT show access blocked message
    expect(screen.queryByText('כדי לגשת לתכני הקורס, יש לקרוא ולאשר את הנחיות הקורס ותנאי השימוש בחלון הצף שמופיע.')).not.toBeInTheDocument();
    
    // Should show course loading (since units are empty in mock)
    expect(screen.getByText('טוען קורס...')).toBeInTheDocument();
  });

  it('should default to blocking content on acknowledgment check error', async () => {
    // Mock acknowledgment check error
    (courseAcknowledgmentService.checkAcknowledgment as any).mockRejectedValue(new Error('Database error'));

    render(<CoursePage />);

    await waitFor(() => {
      expect(screen.getByText('נדרש אישור תנאי השימוש')).toBeInTheDocument();
    });

    // Should show access blocked message as safety measure
    expect(screen.getByText('כדי לגשת לתכני הקורס, יש לקרוא ולאשר את הנחיות הקורס ותנאי השימוש בחלון הצף שמופיע.')).toBeInTheDocument();
    
    // Should NOT show course content
    expect(screen.queryByTestId('unit-section')).not.toBeInTheDocument();
  });

  it('should allow access after acknowledgment through popup', async () => {
    // Mock initially unacknowledged user
    (courseAcknowledgmentService.checkAcknowledgment as any).mockResolvedValue(false);

    render(<CoursePage />);

    await waitFor(() => {
      expect(screen.getByText('נדרש אישור תנאי השימוש')).toBeInTheDocument();
    });

    // Should show welcome popup
    expect(screen.getByTestId('welcome-popup')).toBeInTheDocument();

    // Simulate acknowledgment through popup
    const acknowledgeBtn = screen.getByTestId('acknowledge-btn');
    acknowledgeBtn.click();

    await waitFor(() => {
      expect(screen.queryByText('נדרש אישור תנאי השימוש')).not.toBeInTheDocument();
    });

    // Should now show course loading
    expect(screen.getByText('טוען קורס...')).toBeInTheDocument();
  });
});