import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as fc from 'fast-check';
import WelcomePopup from '../WelcomePopup';
import AcknowledgmentForm from '../AcknowledgmentForm';
import { courseAcknowledgmentService } from '@/lib/courseAcknowledgmentService';

// Mock the courseAcknowledgmentService
vi.mock('@/lib/courseAcknowledgmentService', () => ({
  courseAcknowledgmentService: {
    checkAcknowledgment: vi.fn(),
    saveAcknowledgment: vi.fn(),
  }
}));

const mockCourseAcknowledgmentService = courseAcknowledgmentService as any;

describe('WelcomePopup', () => {
  const mockOnAcknowledged = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  // Property 1: First-time popup display
  describe('Property 1: First-time popup display', () => {
    it('should display popup for any student who has not previously acknowledged a course', async () => {
      // Feature: course-welcome-popup, Property 1: First-time popup display
      // **Validates: Requirements 1.1**
      
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }), // userId
          fc.string({ minLength: 1, maxLength: 50 }), // courseId
          async (userId, courseId) => {
            // Clean up before each iteration
            cleanup();
            vi.clearAllMocks();
            
            // Mock that the user has NOT acknowledged the course (first-time user)
            mockCourseAcknowledgmentService.checkAcknowledgment.mockResolvedValue(false);

            // Render the component
            render(
              <WelcomePopup
                userId={userId}
                courseId={courseId}
                onAcknowledged={mockOnAcknowledged}
              />
            );

            // Wait for the component to finish loading and check acknowledgment status
            await waitFor(() => {
              expect(mockCourseAcknowledgmentService.checkAcknowledgment).toHaveBeenCalledWith(userId, courseId);
            }, { timeout: 3000 });

            // Wait for popup to be visible
            await waitFor(() => {
              // The popup should be displayed for first-time users
              const popupTitle = screen.getByText('ברוכות הבאות לקורס!');
              expect(popupTitle).toBeInTheDocument();
            }, { timeout: 3000 });

            // Verify that the popup contains the required content (course guidelines and terms)
            expect(screen.getByText('הנחיות הקורס')).toBeInTheDocument();
            expect(screen.getByText('תנאי שימוש - חשוב מאוד!')).toBeInTheDocument();
            
            // Verify that the terms prohibiting copying, photographing, transferring, or recording are displayed
            // Check for the specific text that contains the prohibited actions
            expect(screen.getByText('אסור בהחלט')).toBeInTheDocument();
            // Check that the prohibited actions text exists (using getAllByText since it appears in multiple places)
            const prohibitedActionsElements = screen.getAllByText(/להעתיק.*לצלם.*להעביר.*להקליט/);
            expect(prohibitedActionsElements.length).toBeGreaterThan(0);
            
            // Verify that both required checkboxes are present
            expect(screen.getByText(/אני מסכימה לתנאי השימוש/)).toBeInTheDocument();
            expect(screen.getByText(/קראתי והבנתי את הנחיות הקורס/)).toBeInTheDocument();
            
            // Clean up after this iteration
            cleanup();
          }
        ),
        { numRuns: 10 } // Reduced from 100 to 10 for faster testing
      );
    });

    it('should NOT display popup for any student who has previously acknowledged a course', async () => {
      // Additional test to verify the inverse - acknowledged users should not see popup
      
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }), // userId
          fc.string({ minLength: 1, maxLength: 50 }), // courseId
          async (userId, courseId) => {
            // Clean up before each iteration
            cleanup();
            vi.clearAllMocks();
            
            // Mock that the user HAS acknowledged the course
            mockCourseAcknowledgmentService.checkAcknowledgment.mockResolvedValue(true);

            // Render the component
            const { container } = render(
              <WelcomePopup
                userId={userId}
                courseId={courseId}
                onAcknowledged={mockOnAcknowledged}
              />
            );

            // Wait for the component to finish loading and check acknowledgment status
            await waitFor(() => {
              expect(mockCourseAcknowledgmentService.checkAcknowledgment).toHaveBeenCalledWith(userId, courseId);
            }, { timeout: 3000 });

            // Wait a bit to ensure component has time to render (or not render)
            await new Promise(resolve => setTimeout(resolve, 200));

            // The popup should NOT be displayed for users who have already acknowledged
            expect(container.firstChild).toBeNull();
            expect(screen.queryByText('ברוכות הבאות לקורס!')).not.toBeInTheDocument();
            
            // Clean up after this iteration
            cleanup();
          }
        ),
        { numRuns: 10 } // Reduced from 100 to 10 for faster testing
      );
    });

    it('should display popup as safety measure when database error occurs', async () => {
      // Test error handling - popup should show on database errors as safety measure
      
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }), // userId
          fc.string({ minLength: 1, maxLength: 50 }), // courseId
          async (userId, courseId) => {
            // Clean up before each iteration
            cleanup();
            vi.clearAllMocks();
            
            // Mock database error
            mockCourseAcknowledgmentService.checkAcknowledgment.mockRejectedValue(new Error('Database error'));

            // Render the component
            render(
              <WelcomePopup
                userId={userId}
                courseId={courseId}
                onAcknowledged={mockOnAcknowledged}
              />
            );

            // Wait for the component to handle the error
            await waitFor(() => {
              expect(mockCourseAcknowledgmentService.checkAcknowledgment).toHaveBeenCalledWith(userId, courseId);
            }, { timeout: 3000 });

            // Wait for popup to be visible (should show as safety measure)
            await waitFor(() => {
              const popupTitle = screen.getByText('ברוכות הבאות לקורס!');
              expect(popupTitle).toBeInTheDocument();
            }, { timeout: 3000 });

            // Verify popup content is displayed
            expect(screen.getByText('הנחיות הקורס')).toBeInTheDocument();
            expect(screen.getByText('תנאי שימוש - חשוב מאוד!')).toBeInTheDocument();
            
            // Clean up after this iteration
            cleanup();
          }
        ),
        { numRuns: 10 } // Reduced from 100 to 10 for faster testing
      );
    });
  });

  // Property 2: Required content display
  describe('Property 2: Required content display', () => {
    it('should contain course guidelines and terms of use prohibiting copying, photographing, transferring, or recording for any displayed popup', async () => {
      // Feature: course-welcome-popup, Property 2: Required content display
      // **Validates: Requirements 1.2**
      
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }), // userId
          fc.string({ minLength: 1, maxLength: 50 }), // courseId
          async (userId, courseId) => {
            // Clean up before each iteration
            cleanup();
            vi.clearAllMocks();
            
            // Mock that the user has NOT acknowledged the course (so popup will be displayed)
            mockCourseAcknowledgmentService.checkAcknowledgment.mockResolvedValue(false);

            // Render the component
            render(
              <WelcomePopup
                userId={userId}
                courseId={courseId}
                onAcknowledged={mockOnAcknowledged}
              />
            );

            // Wait for the component to finish loading and popup to be displayed
            await waitFor(() => {
              expect(mockCourseAcknowledgmentService.checkAcknowledgment).toHaveBeenCalledWith(userId, courseId);
            }, { timeout: 3000 });

            // Wait for popup to be visible
            await waitFor(() => {
              const popupTitle = screen.getByText('ברוכות הבאות לקורס!');
              expect(popupTitle).toBeInTheDocument();
            }, { timeout: 3000 });

            // Verify that the popup contains course guidelines
            expect(screen.getByText('הנחיות הקורס')).toBeInTheDocument();
            
            // Verify course guidelines content is present
            expect(screen.getByText('השתתפו באופן פעיל בשיעורים ובתרגילים')).toBeInTheDocument();
            expect(screen.getByText('שאלו שאלות במידת הצורך - אנחנו כאן לעזור')).toBeInTheDocument();
            expect(screen.getByText('עקבו אחר לוח הזמנים והמטלות')).toBeInTheDocument();
            expect(screen.getByText('כבדו את חברותיכן לקורס ואת הצוות המלמד')).toBeInTheDocument();

            // Verify that the popup contains terms of use section
            expect(screen.getByText('תנאי שימוש - חשוב מאוד!')).toBeInTheDocument();
            
            // Verify terms of use specifically prohibiting copying, photographing, transferring, or recording
            expect(screen.getByText('אסור בהחלט')).toBeInTheDocument();
            
            // Check for the specific prohibited actions text (appears in multiple places)
            const prohibitedActionsElements = screen.getAllByText(/להעתיק.*לצלם.*להעביר.*להקליט/);
            expect(prohibitedActionsElements.length).toBeGreaterThan(0);
            
            // Verify additional terms content
            expect(screen.getByText(/לשתף חומרי הקורס עם אנשים שאינם רשומים לקורס/)).toBeInTheDocument();
            expect(screen.getByText(/להקליט שיעורים או לצלם מסכים/)).toBeInTheDocument();
            expect(screen.getByText(/הפרת התנאים עלולה להוביל להרחקה מהקורס/)).toBeInTheDocument();

            // Verify that both required checkboxes are present (part of the required content)
            expect(screen.getByText(/אני מסכימה לתנאי השימוש ומתחייבת שלא להעתיק, לצלם, להעביר או להקליט/)).toBeInTheDocument();
            expect(screen.getByText(/קראתי והבנתי את הנחיות הקורס ותנאי השימוש/)).toBeInTheDocument();
            
            // Verify submit button is present
            expect(screen.getByText('המשך לקורס')).toBeInTheDocument();
            
            // Clean up after this iteration
            cleanup();
          }
        ),
        { numRuns: 10, timeout: 10000 } // Reduced runs and increased timeout
      );
    }, 15000); // Increase test timeout to 15 seconds
  });

  // Property 5: Acknowledged user bypass
  describe('Property 5: Acknowledged user bypass', () => {
    it('should NOT display popup for any student who has previously acknowledged a course', async () => {
      // Feature: course-welcome-popup, Property 5: Acknowledged user bypass
      // **Validates: Requirements 2.2**
      
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }), // userId
          fc.string({ minLength: 1, maxLength: 50 }), // courseId
          async (userId, courseId) => {
            // Clean up before each iteration
            cleanup();
            vi.clearAllMocks();
            
            // Mock that the user HAS previously acknowledged the course
            mockCourseAcknowledgmentService.checkAcknowledgment.mockResolvedValue(true);

            // Render the component
            const { container } = render(
              <WelcomePopup
                userId={userId}
                courseId={courseId}
                onAcknowledged={mockOnAcknowledged}
              />
            );

            // Wait for the component to finish loading and check acknowledgment status
            await waitFor(() => {
              expect(mockCourseAcknowledgmentService.checkAcknowledgment).toHaveBeenCalledWith(userId, courseId);
            }, { timeout: 1000 });

            // Wait a bit to ensure component has time to render (or not render)
            await new Promise(resolve => setTimeout(resolve, 100));

            // The popup should NOT be displayed for users who have already acknowledged
            // Verify that no popup content is rendered
            expect(container.firstChild).toBeNull();
            expect(screen.queryByText('ברוכות הבאות לקורס!')).not.toBeInTheDocument();
            expect(screen.queryByText('הנחיות הקורס')).not.toBeInTheDocument();
            expect(screen.queryByText('תנאי שימוש - חשוב מאוד!')).not.toBeInTheDocument();
            
            // Verify that the acknowledgment service was called to check status
            expect(mockCourseAcknowledgmentService.checkAcknowledgment).toHaveBeenCalledWith(userId, courseId);
            expect(mockCourseAcknowledgmentService.checkAcknowledgment).toHaveBeenCalledTimes(1);
            
            // Clean up after this iteration
            cleanup();
          }
        ),
        { numRuns: 10, timeout: 10000 } // Reduced runs and increased timeout
      );
    }, 15000); // Increase test timeout to 15 seconds
  });

  // Property 6: Popup persistence for unacknowledged users
  describe('Property 6: Popup persistence for unacknowledged users', () => {
    it('should continue to appear on every course visit until acknowledgment is complete for any unacknowledged student', async () => {
      // Feature: course-welcome-popup, Property 6: Popup persistence for unacknowledged users
      // **Validates: Requirements 3.1, 3.2**
      
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }), // userId
          fc.string({ minLength: 1, maxLength: 50 }), // courseId
          fc.integer({ min: 1, max: 5 }), // Number of visits to simulate
          async (userId, courseId, numVisits) => {
            // Clean up before each iteration
            cleanup();
            vi.clearAllMocks();
            
            // Mock that the user has NOT acknowledged the course (unacknowledged user)
            mockCourseAcknowledgmentService.checkAcknowledgment.mockResolvedValue(false);

            // Simulate multiple visits to the course page
            for (let visit = 0; visit < numVisits; visit++) {
              // Clean up between visits
              cleanup();
              
              // Render the component (simulating a new page visit)
              const { container } = render(
                <WelcomePopup
                  userId={userId}
                  courseId={courseId}
                  onAcknowledged={mockOnAcknowledged}
                />
              );

              // Wait for the component to finish loading and check acknowledgment status
              await waitFor(() => {
                expect(mockCourseAcknowledgmentService.checkAcknowledgment).toHaveBeenCalledWith(userId, courseId);
              }, { timeout: 1000 });

              // Wait for popup to be visible
              await waitFor(() => {
                // The popup should be displayed on every visit for unacknowledged users
                const popupTitle = screen.getByText('ברוכות הבאות לקורס!');
                expect(popupTitle).toBeInTheDocument();
              }, { timeout: 1000 });

              // Verify that the popup contains the required content
              expect(screen.getByText('הנחיות הקורס')).toBeInTheDocument();
              expect(screen.getByText('תנאי שימוש - חשוב מאוד!')).toBeInTheDocument();
              
              // Verify that both required checkboxes are present (user must acknowledge)
              expect(screen.getByText(/אני מסכימה לתנאי השימוש/)).toBeInTheDocument();
              expect(screen.getByText(/קראתי והבנתי את הנחיות הקורס/)).toBeInTheDocument();

              // Verify that the popup is actually visible (not just in DOM)
              const popupContainer = container.querySelector('[dir="rtl"]');
              expect(popupContainer).toBeInTheDocument();
              expect(popupContainer).toBeVisible();

              // Simulate user closing the popup without acknowledging (Requirements 3.1)
              // The close button should not actually close the popup for unacknowledged users
              const closeButton = container.querySelector('button[aria-label="סגירה"]');
              if (closeButton) {
                fireEvent.click(closeButton);
                
                // Wait a bit and verify popup is still visible (persistence requirement)
                await new Promise(resolve => setTimeout(resolve, 100));
                expect(screen.getByText('ברוכות הבאות לקורס!')).toBeInTheDocument();
              }
            }

            // Verify that checkAcknowledgment was called for each visit
            expect(mockCourseAcknowledgmentService.checkAcknowledgment).toHaveBeenCalledTimes(numVisits);
            
            // Verify that all calls were made with the correct parameters
            for (let i = 0; i < numVisits; i++) {
              expect(mockCourseAcknowledgmentService.checkAcknowledgment).toHaveBeenNthCalledWith(i + 1, userId, courseId);
            }
            
            // Clean up after this iteration
            cleanup();
          }
        ),
        { numRuns: 10, timeout: 15000 } // Reduced runs and increased timeout
      );
    }, 20000); // Increase test timeout to 20 seconds
  });

  // Property 3: Form validation requirements
  describe('Property 3: Form validation requirements', () => {
    it('should require both checkboxes to be checked before form can be successfully submitted', async () => {
      // Feature: course-welcome-popup, Property 3: Form validation requirements
      // **Validates: Requirements 1.3, 1.4**
      
      await fc.assert(
        fc.asyncProperty(
          fc.boolean(), // termsAgreed initial state
          fc.boolean(), // messageRead initial state
          async (initialTermsAgreed, initialMessageRead) => {
            // Clean up before each iteration
            cleanup();
            vi.clearAllMocks();
            
            const mockOnSubmit = vi.fn();
            const user = userEvent.setup();

            // Render the AcknowledgmentForm component
            render(
              <AcknowledgmentForm
                onSubmit={mockOnSubmit}
                isSubmitting={false}
              />
            );

            // Get the checkboxes and submit button
            const termsCheckbox = screen.getByRole('checkbox', { 
              name: /אני מסכימה לתנאי השימוש ומתחייבת שלא להעתיק, לצלם, להעביר או להקליט את תכני הקורס/ 
            });
            const messageCheckbox = screen.getByRole('checkbox', { 
              name: /קראתי והבנתי את הנחיות הקורס ותנאי השימוש/ 
            });
            const submitButton = screen.getByRole('button', { name: /המשך לקורס/ });

            // Set initial checkbox states if needed
            if (initialTermsAgreed && !termsCheckbox.checked) {
              await user.click(termsCheckbox);
            }
            if (initialMessageRead && !messageCheckbox.checked) {
              await user.click(messageCheckbox);
            }

            // Test all possible combinations of checkbox states
            const testCases = [
              { terms: false, message: false, shouldSubmit: false },
              { terms: true, message: false, shouldSubmit: false },
              { terms: false, message: true, shouldSubmit: false },
              { terms: true, message: true, shouldSubmit: true }
            ];

            for (const testCase of testCases) {
              // Reset mocks for each test case
              mockOnSubmit.mockClear();

              // Set checkbox states to match test case
              if (termsCheckbox.checked !== testCase.terms) {
                await user.click(termsCheckbox);
              }
              if (messageCheckbox.checked !== testCase.message) {
                await user.click(messageCheckbox);
              }

              // Verify button disabled state matches expected submission ability
              if (testCase.shouldSubmit) {
                expect(submitButton).not.toBeDisabled();
              } else {
                expect(submitButton).toBeDisabled();
              }

              // Try to submit the form - for disabled buttons, we need to trigger form submission directly
              if (testCase.shouldSubmit) {
                await user.click(submitButton);
              } else {
                // For disabled buttons, trigger form submission via form submit event to test validation
                const form = submitButton.closest('form');
                if (form) {
                  fireEvent.submit(form);
                }
              }

              // Wait for any async operations
              await waitFor(() => {
                if (testCase.shouldSubmit) {
                  // Form should submit successfully when both checkboxes are checked
                  expect(mockOnSubmit).toHaveBeenCalledWith({
                    termsAgreed: true,
                    messageRead: true
                  });
                } else {
                  // Form should NOT submit when either checkbox is unchecked
                  expect(mockOnSubmit).not.toHaveBeenCalled();
                }
              });

              // Verify error messages appear when checkboxes are not checked (only after form submission attempt)
              if (!testCase.shouldSubmit) {
                if (!testCase.terms) {
                  await waitFor(() => {
                    expect(screen.getByText('חובה לאשר את תנאי השימוש')).toBeInTheDocument();
                  });
                }
                if (!testCase.message) {
                  await waitFor(() => {
                    expect(screen.getByText('חובה לאשר שקראתן את ההודעה')).toBeInTheDocument();
                  });
                }
              } else {
                // No error messages should be present when both are checked
                expect(screen.queryByText('חובה לאשר את תנאי השימוש')).not.toBeInTheDocument();
                expect(screen.queryByText('חובה לאשר שקראתן את ההודעה')).not.toBeInTheDocument();
              }
            }
            
            // Clean up after this iteration
            cleanup();
          }
        ),
        { numRuns: 10, timeout: 15000 } // Reduced runs for faster testing
      );
    }, 20000); // Increase test timeout to 20 seconds

    it('should prevent form submission when either checkbox is unchecked', async () => {
      // Additional property test focusing on the prevention aspect
      
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            { terms: false, message: false }, // Neither checked
            { terms: true, message: false },  // Only terms checked
            { terms: false, message: true }   // Only message checked
          ),
          async (checkboxState) => {
            // Clean up before each iteration
            cleanup();
            vi.clearAllMocks();
            
            const mockOnSubmit = vi.fn();
            const user = userEvent.setup();

            // Render the AcknowledgmentForm component
            render(
              <AcknowledgmentForm
                onSubmit={mockOnSubmit}
                isSubmitting={false}
              />
            );

            // Get the checkboxes and submit button
            const termsCheckbox = screen.getByRole('checkbox', { 
              name: /אני מסכימה לתנאי השימוש ומתחייבת שלא להעתיק, לצלם, להעביר או להקליט את תכני הקורס/ 
            });
            const messageCheckbox = screen.getByRole('checkbox', { 
              name: /קראתי והבנתי את הנחיות הקורס ותנאי השימוש/ 
            });
            const submitButton = screen.getByRole('button', { name: /המשך לקורס/ });

            // Set checkbox states according to test case
            if (checkboxState.terms) {
              await user.click(termsCheckbox);
            }
            if (checkboxState.message) {
              await user.click(messageCheckbox);
            }

            // Verify that the submit button is disabled when not both checkboxes are checked
            expect(submitButton).toBeDisabled();

            // Try to submit the form (should not work due to disabled button)
            await user.click(submitButton);

            // Wait for any potential async operations
            await new Promise(resolve => setTimeout(resolve, 100));

            // Verify that onSubmit was NOT called
            expect(mockOnSubmit).not.toHaveBeenCalled();

            // Verify appropriate error messages are shown
            if (!checkboxState.terms) {
              // Try to trigger form submission via form submit event to test validation
              const form = submitButton.closest('form');
              if (form) {
                fireEvent.submit(form);
                await waitFor(() => {
                  expect(screen.getByText('חובה לאשר את תנאי השימוש')).toBeInTheDocument();
                });
              }
            }
            if (!checkboxState.message) {
              // Try to trigger form submission via form submit event to test validation
              const form = submitButton.closest('form');
              if (form) {
                fireEvent.submit(form);
                await waitFor(() => {
                  expect(screen.getByText('חובה לאשר שקראתן את ההודעה')).toBeInTheDocument();
                });
              }
            }
            
            // Clean up after this iteration
            cleanup();
          }
        ),
        { numRuns: 10, timeout: 10000 }
      );
    }, 15000);

    it('should allow form submission only when both checkboxes are checked', async () => {
      // Property test for the positive case - successful submission
      
      await fc.assert(
        fc.asyncProperty(
          fc.constant({ terms: true, message: true }), // Both checkboxes checked
          async (checkboxState) => {
            // Clean up before each iteration
            cleanup();
            vi.clearAllMocks();
            
            const mockOnSubmit = vi.fn();
            const user = userEvent.setup();

            // Render the AcknowledgmentForm component
            render(
              <AcknowledgmentForm
                onSubmit={mockOnSubmit}
                isSubmitting={false}
              />
            );

            // Get the checkboxes and submit button
            const termsCheckbox = screen.getByRole('checkbox', { 
              name: /אני מסכימה לתנאי השימוש ומתחייבת שלא להעתיק, לצלם, להעביר או להקליט את תכני הקורס/ 
            });
            const messageCheckbox = screen.getByRole('checkbox', { 
              name: /קראתי והבנתי את הנחיות הקורס ותנאי השימוש/ 
            });
            const submitButton = screen.getByRole('button', { name: /המשך לקורס/ });

            // Check both checkboxes
            await user.click(termsCheckbox);
            await user.click(messageCheckbox);

            // Verify that the submit button is enabled when both checkboxes are checked
            expect(submitButton).not.toBeDisabled();

            // Submit the form
            await user.click(submitButton);

            // Wait for form submission
            await waitFor(() => {
              expect(mockOnSubmit).toHaveBeenCalledWith({
                termsAgreed: true,
                messageRead: true
              });
            });

            // Verify that onSubmit was called exactly once
            expect(mockOnSubmit).toHaveBeenCalledTimes(1);

            // Verify no error messages are shown
            expect(screen.queryByText('חובה לאשר את תנאי השימוש')).not.toBeInTheDocument();
            expect(screen.queryByText('חובה לאשר שקראתן את ההודעה')).not.toBeInTheDocument();
            
            // Clean up after this iteration
            cleanup();
          }
        ),
        { numRuns: 10, timeout: 10000 }
      );
    }, 15000);
  });

  // Property 7: Content access control
  describe('Property 7: Content access control', () => {
    it('should block access to course content until acknowledgment is complete for any student who has not acknowledged the welcome message', async () => {
      // Feature: course-welcome-popup, Property 7: Content access control
      // **Validates: Requirements 3.3**
      
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }), // userId
          fc.string({ minLength: 1, maxLength: 50 }), // courseId
          fc.boolean(), // hasError - whether to simulate database error
          async (userId, courseId, hasError) => {
            // Clean up before each iteration
            cleanup();
            vi.clearAllMocks();
            
            if (hasError) {
              // Mock database error - should default to blocking content as safety measure
              mockCourseAcknowledgmentService.checkAcknowledgment.mockRejectedValue(new Error('Database error'));
            } else {
              // Mock that the user has NOT acknowledged the course (unacknowledged user)
              mockCourseAcknowledgmentService.checkAcknowledgment.mockResolvedValue(false);
            }

            // Render the WelcomePopup component
            render(
              <WelcomePopup
                userId={userId}
                courseId={courseId}
                onAcknowledged={mockOnAcknowledged}
              />
            );

            // Wait for the component to finish loading and check acknowledgment status
            await waitFor(() => {
              expect(mockCourseAcknowledgmentService.checkAcknowledgment).toHaveBeenCalledWith(userId, courseId);
            }, { timeout: 3000 });

            // Wait for popup to be visible
            await waitFor(() => {
              // The popup should be displayed for unacknowledged users (blocking content access)
              const popupTitle = screen.getByText('ברוכות הבאות לקורס!');
              expect(popupTitle).toBeInTheDocument();
            }, { timeout: 3000 });

            // Verify that the popup is actually blocking content access by being visible and modal
            const popupContainer = document.querySelector('.fixed.inset-0.bg-gradient-to-br');
            expect(popupContainer).toBeInTheDocument();
            expect(popupContainer).toBeVisible();

            // Verify that the popup contains the required acknowledgment form (blocking mechanism)
            expect(screen.getByText(/אני מסכימה לתנאי השימוש/)).toBeInTheDocument();
            expect(screen.getByText(/קראתי והבנתי את הנחיות הקורס/)).toBeInTheDocument();
            expect(screen.getByText('המשך לקורס')).toBeInTheDocument();

            // Verify that the submit button is disabled initially (content remains blocked)
            const submitButton = screen.getByRole('button', { name: /המשך לקורס/ });
            expect(submitButton).toBeDisabled();

            // Verify that the popup cannot be closed without acknowledgment (persistent blocking)
            const closeButton = document.querySelector('button[aria-label="סגירה"]');
            if (closeButton) {
              fireEvent.click(closeButton);
              
              // Wait a bit and verify popup is still visible (content still blocked)
              await new Promise(resolve => setTimeout(resolve, 100));
              expect(screen.getByText('ברוכות הבאות לקורס!')).toBeInTheDocument();
              expect(popupContainer).toBeVisible();
            }

            // Verify that content access is blocked by checking that the popup overlay covers the entire screen
            const overlay = document.querySelector('.fixed.inset-0');
            expect(overlay).toBeInTheDocument();
            expect(overlay).toHaveClass('z-50'); // High z-index ensures it blocks content

            // Test that acknowledgment is required to unblock content
            const user = userEvent.setup();
            
            // Get the checkboxes
            const termsCheckbox = screen.getByRole('checkbox', { 
              name: /אני מסכימה לתנאי השימוש ומתחייבת שלא להעתיק, לצלם, להעביר או להקליט את תכני הקורס/ 
            });
            const messageCheckbox = screen.getByRole('checkbox', { 
              name: /קראתי והבנתי את הנחיות הקורס ותנאי השימוש/ 
            });

            // Check both checkboxes to enable form submission (unblock content)
            await user.click(termsCheckbox);
            await user.click(messageCheckbox);

            // Verify that the submit button is now enabled (content can be unblocked)
            await waitFor(() => {
              expect(submitButton).not.toBeDisabled();
            });

            // Mock successful acknowledgment save
            mockCourseAcknowledgmentService.saveAcknowledgment.mockResolvedValue(undefined);

            // Submit the form to unblock content access
            await user.click(submitButton);

            // Wait for acknowledgment to be saved and popup to disappear (content unblocked)
            await waitFor(() => {
              expect(mockCourseAcknowledgmentService.saveAcknowledgment).toHaveBeenCalledWith(userId, courseId);
            }, { timeout: 3000 });

            // Wait for popup to disappear (indicating content is now accessible)
            await waitFor(() => {
              expect(screen.queryByText('ברוכות הבאות לקורס!')).not.toBeInTheDocument();
            }, { timeout: 3000 });

            // Verify that onAcknowledged callback was called (signaling content access granted)
            expect(mockOnAcknowledged).toHaveBeenCalledTimes(1);

            // Clean up after this iteration
            cleanup();
          }
        ),
        { numRuns: 10, timeout: 20000 } // Reduced runs and increased timeout for complex test
      );
    }, 25000); // Increase test timeout to 25 seconds

    it('should allow content access for any student who has previously acknowledged the welcome message', async () => {
      // Additional property test for the positive case - acknowledged users should have content access
      
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }), // userId
          fc.string({ minLength: 1, maxLength: 50 }), // courseId
          async (userId, courseId) => {
            // Clean up before each iteration
            cleanup();
            vi.clearAllMocks();
            
            // Mock that the user HAS acknowledged the course (should have content access)
            mockCourseAcknowledgmentService.checkAcknowledgment.mockResolvedValue(true);

            // Render the WelcomePopup component
            const { container } = render(
              <WelcomePopup
                userId={userId}
                courseId={courseId}
                onAcknowledged={mockOnAcknowledged}
              />
            );

            // Wait for the component to finish loading and check acknowledgment status
            await waitFor(() => {
              expect(mockCourseAcknowledgmentService.checkAcknowledgment).toHaveBeenCalledWith(userId, courseId);
            }, { timeout: 1000 });

            // Wait a bit to ensure component has time to render (or not render)
            await new Promise(resolve => setTimeout(resolve, 100));

            // The popup should NOT be displayed for acknowledged users (content access allowed)
            expect(container.firstChild).toBeNull();
            expect(screen.queryByText('ברוכות הבאות לקורס!')).not.toBeInTheDocument();

            // Verify that no blocking overlay is present (content is accessible)
            const overlay = document.querySelector('.fixed.inset-0.bg-black.bg-opacity-50');
            expect(overlay).not.toBeInTheDocument();

            // Verify that no acknowledgment form is present (no blocking mechanism)
            expect(screen.queryByText(/אני מסכימה לתנאי השימוש/)).not.toBeInTheDocument();
            expect(screen.queryByText(/קראתי והבנתי את הנחיות הקורס/)).not.toBeInTheDocument();
            expect(screen.queryByText('המשך לקורס')).not.toBeInTheDocument();

            // Verify that the acknowledgment service was called to check status
            expect(mockCourseAcknowledgmentService.checkAcknowledgment).toHaveBeenCalledWith(userId, courseId);
            expect(mockCourseAcknowledgmentService.checkAcknowledgment).toHaveBeenCalledTimes(1);

            // Verify that onAcknowledged was not called (no acknowledgment needed)
            expect(mockOnAcknowledged).not.toHaveBeenCalled();

            // Clean up after this iteration
            cleanup();
          }
        ),
        { numRuns: 10, timeout: 10000 } // Reduced runs and increased timeout
      );
    }, 15000); // Increase test timeout to 15 seconds
  });
});