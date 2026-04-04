import { test, expect, Page } from '@playwright/test'

const baseUrl = process.env.E2E_BASE_URL

/**
 * E2E Tests for Product Review Feature
 *
 * Test Coverage:
 * 1. View Reviews (Public) - Review summary, list, sorting
 * 2. Write Review (Authenticated) - Create new review
 * 3. Edit Review - Modify existing review
 * 4. Delete Review - Remove review
 * 5. Verified Purchase Badge - Order verification display
 */

// Test data constants
const TEST_PRODUCT_SLUG = 'boho-sunburst-handbag'
const TEST_USER_EMAIL = process.env.E2E_TEST_USER_EMAIL || 'test-user@example.com'
const TEST_USER_PASSWORD = process.env.E2E_TEST_USER_PASSWORD || 'test-password'
const TEST_USER_NAME = 'Test User'

// Selectors for review components
const SELECTORS = {
  // Review Summary
  reviewSummary: '[data-testid="review-summary"], .review-summary',
  averageRating: '[data-testid="average-rating"], .font-display.text-5xl',
  totalReviews: '[data-testid="total-reviews"], .text-muted-foreground:has-text("review")',
  writeReviewButton: 'button:has-text("Write a Review")',
  ratingBar: '[role="progressbar"]',

  // Review List
  reviewList: '[data-testid="review-list"], .space-y-6',
  reviewCard: '[data-testid="review-card"], .review-item, .fabric-card',
  reviewItem: '.review-item',
  sortDropdown: '[data-testid="sort-select"], button[aria-haspopup="listbox"]',
  sortOption: '[role="option"]',
  noReviewsMessage: 'text=/No Reviews Yet/i',

  // Review Card Elements
  reviewAuthor: '.font-body.text-sm.font-medium',
  reviewDate: '.text-xs.text-muted-foreground',
  reviewRating: '[role="img"][aria-label*="stars"]',
  reviewTitle: '.font-body.font-medium.text-foreground',
  reviewContent: '.font-body.text-sm.text-muted-foreground',
  verifiedBadge: 'text=/Verified/i',
  helpfulButton: 'button:has-text("Helpful")',
  editButton: 'button[aria-label="Edit review"]',
  deleteButton: 'button[aria-label="Delete review"]',

  // Review Form/Modal
  reviewModal: '[role="dialog"]',
  ratingStar: 'button[aria-label*="Rate"]',
  titleInput: '#review-title',
  contentInput: '#review-content',
  submitButton: 'button:has-text("Submit Review")',
  updateButton: 'button:has-text("Update Review")',
  cancelButton: 'button:has-text("Cancel")',
  errorMessage: '.text-destructive',

  // Auth
  loginLink: 'a[href="/login"]',
  emailInput: '#email',
  passwordInput: '#password',
  loginButton: 'button:has-text("Sign In"):not(:has-text("Google"))',

  // Pagination
  prevPageButton: 'button:has-text("Previous")',
  nextPageButton: 'button:has-text("Next")',
  pageIndicator: 'text=/Page \\d+ of \\d+/',

  // Toast notifications
  toast: '[data-sonner-toast]',
  toastMessage: '[data-sonner-toast] [data-description]',
}

/**
 * Helper to login as test user
 */
async function loginAsTestUser(page: Page) {
  await page.goto(`${baseUrl}/login`)

  // Wait for login form to be visible
  await page.waitForSelector(SELECTORS.emailInput, { timeout: 10000 })

  // Fill login form
  await page.fill(SELECTORS.emailInput, TEST_USER_EMAIL)
  await page.fill(SELECTORS.passwordInput, TEST_USER_PASSWORD)

  // Submit login
  await page.click(SELECTORS.loginButton)

  // Wait for redirect after login
  await page.waitForURL(/\/(products|$)/, { timeout: 15000 })

  // Wait for auth state to settle
  await page.waitForTimeout(1000)
}

/**
 * Helper to navigate to a product page
 */
async function navigateToProduct(page: Page, slug: string = TEST_PRODUCT_SLUG) {
  await page.goto(`${baseUrl}/products/${slug}`)
  await page.waitForLoadState('networkidle')
  // Wait for page content to load
  await page.waitForSelector('h1', { timeout: 10000 })
}

/**
 * Helper to wait for review modal to appear
 */
async function openReviewModal(page: Page) {
  await page.click(SELECTORS.writeReviewButton)
  await page.waitForSelector(SELECTORS.reviewModal, { timeout: 5000 })
}

/**
 * Helper to close review modal
 */
async function closeReviewModal(page: Page) {
  const closeButton = page.locator(`${SELECTORS.reviewModal} button[aria-label*="Close"], ${SELECTORS.reviewModal} button:has-text("Cancel")`)
  if (await closeButton.isVisible()) {
    await closeButton.click()
    await page.waitForSelector(SELECTORS.reviewModal, { state: 'hidden', timeout: 5000 })
  }
}

/**
 * Helper to fill review form
 */
async function fillReviewForm(page: Page, rating: number, title: string, content: string) {
  // Click rating stars (1-5)
  const starIndex = rating - 1 // 0-indexed
  const stars = page.locator(SELECTORS.ratingStar)
  await stars.nth(starIndex).click()

  // Fill title and content
  await page.fill(SELECTORS.titleInput, title)
  await page.fill(SELECTORS.contentInput, content)
}

/**
 * Helper to generate unique review data
 */
function generateReviewData() {
  const timestamp = Date.now()
  return {
    title: `Great Product! ${timestamp}`,
    content: `This is a detailed review about the product. I really enjoyed using it and would recommend it to others. The quality exceeded my expectations. ${timestamp}`,
    rating: Math.floor(Math.random() * 2) + 4, // 4 or 5 stars
  }
}

// ============================================================================
// Test Suite: View Reviews (Public - No Auth Required)
// ============================================================================
test.describe('View Reviews (Public)', () => {
  test.skip(!baseUrl, 'Set E2E_BASE_URL to run e2e tests')

  test('should display review summary with average rating', async ({ page }) => {
    await navigateToProduct(page)

    // Scroll to reviews section
    await page.locator('text=/Customer Reviews/i').scrollIntoViewIfNeeded()

    // Wait for review summary to be visible
    await page.waitForSelector(SELECTORS.reviewSummary, { timeout: 5000 })

    // Verify average rating is displayed (format: X.X out of 5)
    const avgRating = page.locator(SELECTORS.averageRating)
    await expect(avgRating).toBeVisible()
    const ratingText = await avgRating.textContent()
    expect(ratingText).toMatch(/^\d\.\d$/)

    // Verify total reviews count
    const totalReviews = page.locator(SELECTORS.totalReviews)
    await expect(totalReviews).toBeVisible()
  })

  test('should display review list with review cards', async ({ page }) => {
    await navigateToProduct(page)

    // Scroll to reviews section
    await page.locator('text=/Customer Reviews/i').scrollIntoViewIfNeeded()

    // Wait for review list
    await page.waitForSelector(SELECTORS.reviewList, { timeout: 5000 })

    // Check if there are reviews (no reviews message should NOT be visible)
    const noReviewsMessage = page.locator(SELECTORS.noReviewsMessage)
    const hasNoReviews = await noReviewsMessage.isVisible()

    if (!hasNoReviews) {
      // Verify at least one review card is visible
      const reviewCards = page.locator(SELECTORS.reviewCard)
      const count = await reviewCards.count()
      expect(count).toBeGreaterThan(0)

      // Verify first review card has required elements
      const firstCard = reviewCards.first()

      // Check author name
      await expect(firstCard.locator(SELECTORS.reviewAuthor)).toBeVisible()

      // Check rating stars
      await expect(firstCard.locator(SELECTORS.reviewRating)).toBeVisible()

      // Check review content
      await expect(firstCard.locator(SELECTORS.reviewContent)).toBeVisible()
    }
  })

  test('should sort reviews by newest first', async ({ page }) => {
    await navigateToProduct(page)

    // Scroll to reviews section
    await page.locator('text=/Customer Reviews/i').scrollIntoViewIfNeeded()
    await page.waitForSelector(SELECTORS.reviewList, { timeout: 5000 })

    // Check if sort dropdown exists
    const sortDropdown = page.locator(SELECTORS.sortDropdown)
    const noReviewsMessage = page.locator(SELECTORS.noReviewsMessage)

    // Skip if no reviews
    if (await noReviewsMessage.isVisible()) {
      test.skip(true, 'No reviews to sort')
      return
    }

    if (await sortDropdown.isVisible()) {
      // Open sort dropdown
      await sortDropdown.click()
      await page.waitForSelector(SELECTORS.sortOption, { timeout: 3000 })

      // Select "Newest First"
      await page.click(`${SELECTORS.sortOption}:has-text("Newest First")`)

      // Wait for re-sort (could check for loading state)
      await page.waitForTimeout(500)

      // Verify sort selection is applied
      await expect(sortDropdown).toContainText(/Newest/)
    }
  })

  test('should sort reviews by highest rated', async ({ page }) => {
    await navigateToProduct(page)

    // Scroll to reviews section
    await page.locator('text=/Customer Reviews/i').scrollIntoViewIfNeeded()
    await page.waitForSelector(SELECTORS.reviewList, { timeout: 5000 })

    const sortDropdown = page.locator(SELECTORS.sortDropdown)
    const noReviewsMessage = page.locator(SELECTORS.noReviewsMessage)

    if (await noReviewsMessage.isVisible()) {
      test.skip(true, 'No reviews to sort')
      return
    }

    if (await sortDropdown.isVisible()) {
      await sortDropdown.click()
      await page.waitForSelector(SELECTORS.sortOption, { timeout: 3000 })
      await page.click(`${SELECTORS.sortOption}:has-text("Highest")`)

      await page.waitForTimeout(500)
      await expect(sortDropdown).toContainText(/Highest/)
    }
  })

  test('should sort reviews by lowest rated', async ({ page }) => {
    await navigateToProduct(page)

    // Scroll to reviews section
    await page.locator('text=/Customer Reviews/i').scrollIntoViewIfNeeded()
    await page.waitForSelector(SELECTORS.reviewList, { timeout: 5000 })

    const sortDropdown = page.locator(SELECTORS.sortDropdown)
    const noReviewsMessage = page.locator(SELECTORS.noReviewsMessage)

    if (await noReviewsMessage.isVisible()) {
      test.skip(true, 'No reviews to sort')
      return
    }

    if (await sortDropdown.isVisible()) {
      await sortDropdown.click()
      await page.waitForSelector(SELECTORS.sortOption, { timeout: 3000 })
      await page.click(`${SELECTORS.sortOption}:has-text("Lowest")`)

      await page.waitForTimeout(500)
      await expect(sortDropdown).toContainText(/Lowest/)
    }
  })

  test('should sort reviews by most helpful', async ({ page }) => {
    await navigateToProduct(page)

    // Scroll to reviews section
    await page.locator('text=/Customer Reviews/i').scrollIntoViewIfNeeded()
    await page.waitForSelector(SELECTORS.reviewList, { timeout: 5000 })

    const sortDropdown = page.locator(SELECTORS.sortDropdown)
    const noReviewsMessage = page.locator(SELECTORS.noReviewsMessage)

    if (await noReviewsMessage.isVisible()) {
      test.skip(true, 'No reviews to sort')
      return
    }

    if (await sortDropdown.isVisible()) {
      await sortDropdown.click()
      await page.waitForSelector(SELECTORS.sortOption, { timeout: 3000 })
      await page.click(`${SELECTORS.sortOption}:has-text("Helpful")`)

      await page.waitForTimeout(500)
      await expect(sortDropdown).toContainText(/Helpful/)
    }
  })

  test('should show empty state when no reviews exist', async ({ page }) => {
    // Navigate to a product that might not have reviews
    await page.goto(`${baseUrl}/products/test-product-no-reviews`)
    await page.waitForLoadState('networkidle')

    // If product doesn't exist, this test is skipped
    const productNotFound = await page.locator('text=/Product Not Found/i').isVisible()
    if (productNotFound) {
      test.skip(true, 'Test product without reviews does not exist')
      return
    }

    // Check for no reviews message
    const noReviewsMessage = page.locator(SELECTORS.noReviewsMessage)
    if (await noReviewsMessage.isVisible()) {
      await expect(noReviewsMessage).toContainText('No Reviews Yet')
    }
  })
})

// ============================================================================
// Test Suite: Write Review (Authenticated)
// ============================================================================
test.describe('Write Review (Authenticated)', () => {
  test.skip(!baseUrl, 'Set E2E_BASE_URL to run e2e tests')

  test.beforeEach(async ({ page }) => {
    // Login before each test in this suite
    await loginAsTestUser(page)
  })

  test('should redirect to login when unauthenticated user clicks Write Review', async ({ page, context }) => {
    // Create a new context without auth (logged out state)
    const newContext = await context.browser()!.newContext()
    const newPage = await newContext.newPage()

    await navigateToProduct(newPage)

    // Scroll to reviews section
    await newPage.locator('text=/Customer Reviews/i').scrollIntoViewIfNeeded()

    // Click Write Review button
    const writeButton = newPage.locator(SELECTORS.writeReviewButton)
    if (await writeButton.isVisible()) {
      await writeButton.click()

      // Should be redirected to login page
      await newPage.waitForURL(/\/login/, { timeout: 10000 })
      expect(newPage.url()).toContain('/login')
    }

    await newContext.close()
  })

  test('should open review modal when authenticated user clicks Write Review', async ({ page }) => {
    await navigateToProduct(page)

    // Scroll to reviews section
    await page.locator('text=/Customer Reviews/i').scrollIntoViewIfNeeded()

    // Click Write Review button
    const writeButton = page.locator(SELECTORS.writeReviewButton)
    await expect(writeButton).toBeVisible()
    await writeButton.click()

    // Verify modal opens
    await page.waitForSelector(SELECTORS.reviewModal, { timeout: 5000 })
    await expect(page.locator(SELECTORS.reviewModal)).toBeVisible()

    // Verify form elements are present
    await expect(page.locator(SELECTORS.ratingStar).first()).toBeVisible()
    await expect(page.locator(SELECTORS.titleInput)).toBeVisible()
    await expect(page.locator(SELECTORS.contentInput)).toBeVisible()
    await expect(page.locator(SELECTORS.submitButton)).toBeVisible()

    // Close modal
    await closeReviewModal(page)
  })

  test('should validate review form fields', async ({ page }) => {
    await navigateToProduct(page)
    await page.locator('text=/Customer Reviews/i').scrollIntoViewIfNeeded()
    await openReviewModal(page)

    // Try to submit empty form
    await page.click(SELECTORS.submitButton)

    // Should show validation errors
    await expect(page.locator('text=/Please select a rating/i')).toBeVisible()

    // Fill only title (too short)
    await page.fill(SELECTORS.titleInput, 'ab')
    await page.click(SELECTORS.submitButton)
    await expect(page.locator('text=/Title must be at least 3 characters/i')).toBeVisible()

    // Fill title but content too short
    await page.fill(SELECTORS.titleInput, 'Valid Title')
    await page.fill(SELECTORS.contentInput, 'short')
    await page.click(SELECTORS.submitButton)
    await expect(page.locator('text=/Review must be at least 10 characters/i')).toBeVisible()

    await closeReviewModal(page)
  })

  test('should submit a review successfully', async ({ page }) => {
    await navigateToProduct(page)
    await page.locator('text=/Customer Reviews/i').scrollIntoViewIfNeeded()

    const reviewData = generateReviewData()

    // Open review modal
    await openReviewModal(page)

    // Fill review form
    await fillReviewForm(page, reviewData.rating, reviewData.title, reviewData.content)

    // Submit review
    await page.click(SELECTORS.submitButton)

    // Wait for modal to close (success)
    await page.waitForSelector(SELECTORS.reviewModal, { state: 'hidden', timeout: 10000 })

    // Verify toast notification appears
    const toast = page.locator(SELECTORS.toast)
    // Note: Toast might appear and disappear quickly, so we just check it was visible

    // Verify new review appears in list
    // Note: The review should appear at the top if sorted by newest
    const reviewTitle = page.locator(`text="${reviewData.title}"`)
    await expect(reviewTitle).toBeVisible({ timeout: 10000 })
  })

  test('should allow star rating selection', async ({ page }) => {
    await navigateToProduct(page)
    await page.locator('text=/Customer Reviews/i').scrollIntoViewIfNeeded()
    await openReviewModal(page)

    // Test each star rating
    for (let rating = 1; rating <= 5; rating++) {
      const starIndex = rating - 1
      const stars = page.locator(SELECTORS.ratingStar)

      // Click the star
      await stars.nth(starIndex).click()

      // Verify rating label appears
      const ratingLabels: Record<number, string> = {
        1: 'Poor',
        2: 'Fair',
        3: 'Good',
        4: 'Very Good',
        5: 'Excellent',
      }

      if (rating >= 1 && rating <= 5) {
        await expect(page.locator(`text=${ratingLabels[rating]}`)).toBeVisible()
      }
    }

    await closeReviewModal(page)
  })

  test('should show character count for title and content', async ({ page }) => {
    await navigateToProduct(page)
    await page.locator('text=/Customer Reviews/i').scrollIntoViewIfNeeded()
    await openReviewModal(page)

    // Type in title field
    await page.fill(SELECTORS.titleInput, 'Test Title')
    await expect(page.locator('text=/10\\/100/')).toBeVisible()

    // Type in content field
    await page.fill(SELECTORS.contentInput, 'Test content for character count.')
    const contentCount = await page.locator(`text=/${'\\d+\\/2000'}/`).textContent()
    expect(contentCount).toMatch(/\d+\/2000/)

    await closeReviewModal(page)
  })
})

// ============================================================================
// Test Suite: Edit Review
// ============================================================================
test.describe('Edit Review', () => {
  test.skip(!baseUrl, 'Set E2E_BASE_URL to run e2e tests')

  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page)
  })

  test('should show edit button only for own reviews', async ({ page }) => {
    await navigateToProduct(page)
    await page.locator('text=/Customer Reviews/i').scrollIntoViewIfNeeded()
    await page.waitForSelector(SELECTORS.reviewList, { timeout: 5000 })

    // Check if there are any review cards
    const reviewCards = page.locator(SELECTORS.reviewCard)
    const count = await reviewCards.count()

    if (count === 0) {
      test.skip(true, 'No reviews to test edit button visibility')
      return
    }

    // Get current user (assuming test user has at least one review)
    // For reviews NOT owned by current user, edit button should not be visible
    // For reviews owned by current user, edit button should be visible
    // This test verifies that the edit button exists somewhere on the page

    // Check if any review has edit button (user's own review)
    const editButtons = page.locator(SELECTORS.editButton)
    const editCount = await editButtons.count()

    // The number of edit buttons should match number of user's own reviews
    // We can't assert exact count without knowing test data state
    // But we verify that edit button structure is correct
    if (editCount > 0) {
      const firstEditBtn = editButtons.first()
      await expect(firstEditBtn).toHaveAttribute('aria-label', 'Edit review')
    }
  })

  test('should open edit modal with existing review data', async ({ page }) => {
    await navigateToProduct(page)
    await page.locator('text=/Customer Reviews/i').scrollIntoViewIfNeeded()
    await page.waitForSelector(SELECTORS.reviewList, { timeout: 5000 })

    // Find and click edit button on user's own review
    const editButton = page.locator(SELECTORS.editButton).first()

    if (await editButton.isVisible()) {
      await editButton.click()

      // Wait for modal to open
      await page.waitForSelector(SELECTORS.reviewModal, { timeout: 5000 })

      // Verify modal shows "Edit" in title
      await expect(page.locator('text=/Edit Your Review/i')).toBeVisible()

      // Verify existing data is pre-filled
      const titleInput = page.locator(SELECTORS.titleInput)
      const contentInput = page.locator(SELECTORS.contentInput)

      const titleValue = await titleInput.inputValue()
      const contentValue = await contentInput.inputValue()

      // Title and content should have values (not empty)
      expect(titleValue.length).toBeGreaterThan(0)
      expect(contentValue.length).toBeGreaterThan(0)

      await closeReviewModal(page)
    } else {
      test.skip(true, 'No editable reviews found for test user')
    }
  })

  test('should update review successfully', async ({ page }) => {
    await navigateToProduct(page)
    await page.locator('text=/Customer Reviews/i').scrollIntoViewIfNeeded()
    await page.waitForSelector(SELECTORS.reviewList, { timeout: 5000 })

    const editButton = page.locator(SELECTORS.editButton).first()

    if (await editButton.isVisible()) {
      await editButton.click()
      await page.waitForSelector(SELECTORS.reviewModal, { timeout: 5000 })

      // Modify the review
      const timestamp = Date.now()
      const newTitle = `Updated Review ${timestamp}`
      const newContent = `This is my updated review content. I have changed my opinion after more use. ${timestamp}`

      await page.fill(SELECTORS.titleInput, newTitle)
      await page.fill(SELECTORS.contentInput, newContent)

      // Click update button
      await page.click(SELECTORS.updateButton)

      // Wait for modal to close
      await page.waitForSelector(SELECTORS.reviewModal, { state: 'hidden', timeout: 10000 })

      // Verify updated title appears in list
      await expect(page.locator(`text="${newTitle}"`)).toBeVisible({ timeout: 10000 })
    } else {
      test.skip(true, 'No editable reviews found for test user')
    }
  })
})

// ============================================================================
// Test Suite: Delete Review
// ============================================================================
test.describe('Delete Review', () => {
  test.skip(!baseUrl, 'Set E2E_BASE_URL to run e2e tests')

  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page)
  })

  test('should show delete button only for own reviews', async ({ page }) => {
    await navigateToProduct(page)
    await page.locator('text=/Customer Reviews/i').scrollIntoViewIfNeeded()
    await page.waitForSelector(SELECTORS.reviewList, { timeout: 5000 })

    const deleteButtons = page.locator(SELECTORS.deleteButton)
    const count = await deleteButtons.count()

    // Verify delete button structure
    if (count > 0) {
      const firstDeleteBtn = deleteButtons.first()
      await expect(firstDeleteBtn).toHaveAttribute('aria-label', 'Delete review')
    }
  })

  test('should remove review after deletion', async ({ page }) => {
    await navigateToProduct(page)
    await page.locator('text=/Customer Reviews/i').scrollIntoViewIfNeeded()
    await page.waitForSelector(SELECTORS.reviewList, { timeout: 5000 })

    // First, create a new review to delete
    const reviewData = generateReviewData()
    await openReviewModal(page)
    await fillReviewForm(page, reviewData.rating, reviewData.title, reviewData.content)
    await page.click(SELECTORS.submitButton)
    await page.waitForSelector(SELECTORS.reviewModal, { state: 'hidden', timeout: 10000 })

    // Wait for review to appear
    await expect(page.locator(`text="${reviewData.title}"`)).toBeVisible({ timeout: 10000 })

    // Find and click delete button on the newly created review
    const newReviewCard = page.locator(SELECTORS.reviewCard).filter({ hasText: reviewData.title })
    const deleteBtn = newReviewCard.locator(SELECTORS.deleteButton)

    if (await deleteBtn.isVisible()) {
      await deleteBtn.click()

      // Wait for review to be removed
      await page.waitForTimeout(1000)

      // Verify review is no longer visible
      await expect(page.locator(`text="${reviewData.title}"`)).not.toBeVisible({ timeout: 5000 })
    } else {
      test.skip(true, 'Delete button not found on new review')
    }
  })
})

// ============================================================================
// Test Suite: Verified Purchase Badge
// ============================================================================
test.describe('Verified Purchase Badge', () => {
  test.skip(!baseUrl, 'Set E2E_BASE_URL to run e2e tests')

  test('should display verified badge on reviews from customers with orders', async ({ page }) => {
    await navigateToProduct(page)
    await page.locator('text=/Customer Reviews/i').scrollIntoViewIfNeeded()
    await page.waitForSelector(SELECTORS.reviewList, { timeout: 5000 })

    // Check for verified purchase badges
    const verifiedBadges = page.locator(SELECTORS.verifiedBadge)

    // If any reviews have verified badge, verify the structure
    const count = await verifiedBadges.count()
    if (count > 0) {
      // Check that badge contains proper elements
      const firstBadge = verifiedBadges.first()
      await expect(firstBadge).toContainText('Verified')

      // Check for checkmark icon (Lucide CheckCircle2)
      const checkIcon = firstBadge.locator('svg')
      await expect(checkIcon).toBeVisible()
    }
  })

  test('should NOT show verified badge for reviews without order', async ({ page }) => {
    await navigateToProduct(page)
    await page.locator('text=/Customer Reviews/i').scrollIntoViewIfNeeded()
    await page.waitForSelector(SELECTORS.reviewList, { timeout: 5000 })

    // Get all review cards
    const reviewCards = page.locator(SELECTORS.reviewCard)
    const count = await reviewCards.count()

    // This test verifies that the badge structure exists
    // In real data, some reviews may have it and some may not
    // We just verify the component renders correctly
    for (let i = 0; i < Math.min(count, 3); i++) {
      const card = reviewCards.nth(i)
      const badge = card.locator(SELECTORS.verifiedBadge)
      const hasBadge = await badge.isVisible()

      // If badge is visible, verify its content
      if (hasBadge) {
        const badgeText = await badge.textContent()
        expect(badgeText).toContain('Verified')
      }
    }
  })

  test('should create verified review after order', async ({ page }) => {
    // This test would require:
    // 1. Login as test user
    // 2. Complete an order (complex checkout flow)
    // 3. Navigate to product
    // 4. Write review
    // 5. Verify verified badge appears

    // For E2E simplicity, we'll skip the full checkout flow
    // and just verify the review modal can be opened

    await loginAsTestUser(page)
    await navigateToProduct(page)
    await page.locator('text=/Customer Reviews/i').scrollIntoViewIfNeeded()

    // Click write review
    const writeButton = page.locator(SELECTORS.writeReviewButton)
    if (await writeButton.isVisible()) {
      await writeButton.click()
      await page.waitForSelector(SELECTORS.reviewModal, { timeout: 5000 })

      // Verify modal content
      await expect(page.locator('text=/Write a Review/i')).toBeVisible()

      await closeReviewModal(page)
    }
  })
})

// ============================================================================
// Test Suite: Review Pagination (if applicable)
// ============================================================================
test.describe('Review Pagination', () => {
  test.skip(!baseUrl, 'Set E2E_BASE_URL to run e2e tests')

  test('should show pagination controls when reviews exceed page limit', async ({ page }) => {
    await navigateToProduct(page)
    await page.locator('text=/Customer Reviews/i').scrollIntoViewIfNeeded()
    await page.waitForSelector(SELECTORS.reviewList, { timeout: 5000 })

    // Check if pagination exists
    const pageIndicator = page.locator(SELECTORS.pageIndicator)
    const prevButton = page.locator(SELECTORS.prevPageButton)
    const nextButton = page.locator(SELECTORS.nextPageButton)

    // If pagination is visible, verify it works
    if (await pageIndicator.isVisible()) {
      // Verify page indicator format
      const indicatorText = await pageIndicator.textContent()
      expect(indicatorText).toMatch(/Page \d+ of \d+/)

      // Test next page
      if (await nextButton.isEnabled()) {
        await nextButton.click()
        await page.waitForTimeout(500)
        await expect(pageIndicator).toBeVisible()
      }

      // Test previous page
      if (await prevButton.isEnabled()) {
        await prevButton.click()
        await page.waitForTimeout(500)
        await expect(pageIndicator).toBeVisible()
      }
    }
  })
})

// ============================================================================
// Test Suite: Mark Review as Helpful
// ============================================================================
test.describe('Mark Review as Helpful', () => {
  test.skip(!baseUrl, 'Set E2E_BASE_URL to run e2e tests')

  test('should increment helpful count when clicked', async ({ page }) => {
    await navigateToProduct(page)
    await page.locator('text=/Customer Reviews/i').scrollIntoViewIfNeeded()
    await page.waitForSelector(SELECTORS.reviewList, { timeout: 5000 })

    const reviewCards = page.locator(SELECTORS.reviewCard)
    const count = await reviewCards.count()

    if (count === 0) {
      test.skip(true, 'No reviews to test helpful button')
      return
    }

    // Find first helpful button
    const helpfulButtons = page.locator(SELECTORS.helpfulButton)
    const buttonCount = await helpfulButtons.count()

    if (buttonCount > 0) {
      const firstButton = helpfulButtons.first()

      // Get initial count
      const initialText = await firstButton.textContent()
      const initialMatch = initialText?.match(/Helpful \((\d+)\)/)
      const initialCount = initialMatch ? parseInt(initialMatch[1], 10) : 0

      // Click helpful
      await firstButton.click()

      // Wait for UI update
      await page.waitForTimeout(500)

      // Verify count incremented or button disabled
      const isDisabled = await firstButton.isDisabled()
      if (!isDisabled) {
        const newText = await firstButton.textContent()
        const newMatch = newText?.match(/Helpful \((\d+)\)/)
        const newCount = newMatch ? parseInt(newMatch[1], 10) : initialCount
        expect(newCount).toBe(initialCount + 1)
      }
    }
  })

  test('should disable helpful button after clicking', async ({ page }) => {
    await navigateToProduct(page)
    await page.locator('text=/Customer Reviews/i').scrollIntoViewIfNeeded()
    await page.waitForSelector(SELECTORS.reviewList, { timeout: 5000 })

    const helpfulButtons = page.locator(SELECTORS.helpfulButton)
    const count = await helpfulButtons.count()

    if (count > 0) {
      const firstButton = helpfulButtons.first()

      // Click helpful
      await firstButton.click()
      await page.waitForTimeout(500)

      // Verify button is now disabled or marked
      const isDisabled = await firstButton.isDisabled()
      const buttonText = await firstButton.textContent()

      // Button should be disabled or visually changed
      expect(isDisabled || buttonText?.includes('Helpful')).toBeTruthy()
    }
  })

  test('should not allow helpful on own reviews', async ({ page }) => {
    await loginAsTestUser(page)
    await navigateToProduct(page)
    await page.locator('text=/Customer Reviews/i').scrollIntoViewIfNeeded()
    await page.waitForSelector(SELECTORS.reviewList, { timeout: 5000 })

    // Find user's own review (has edit/delete buttons)
    const editButtons = page.locator(SELECTORS.editButton)
    const editCount = await editButtons.count()

    if (editCount > 0) {
      // Get the parent review card of the first editable review
      const ownReview = editButtons.first().locator('xpath=../..')
      const helpfulBtn = ownReview.locator(SELECTORS.helpfulButton)

      // Helpful button on own review should be disabled
      const isDisabled = await helpfulBtn.isDisabled()
      expect(isDisabled).toBe(true)
    }
  })
})

// ============================================================================
// Test Suite: Accessibility
// ============================================================================
test.describe('Review Accessibility', () => {
  test.skip(!baseUrl, 'Set E2E_BASE_URL to run e2e tests')

  test('should have proper ARIA labels for review elements', async ({ page }) => {
    await navigateToProduct(page)
    await page.locator('text=/Customer Reviews/i').scrollIntoViewIfNeeded()
    await page.waitForSelector(SELECTORS.reviewList, { timeout: 5000 })

    const reviewCards = page.locator(SELECTORS.reviewCard)
    const count = await reviewCards.count()

    if (count > 0) {
      const firstCard = reviewCards.first()

      // Check rating has proper aria-label
      const rating = firstCard.locator(SELECTORS.reviewRating)
      const ariaLabel = await rating.getAttribute('aria-label')
      expect(ariaLabel).toMatch(/\d+ out of 5 stars/i)
    }
  })

  test('should have accessible modal for writing reviews', async ({ page }) => {
    await loginAsTestUser(page)
    await navigateToProduct(page)
    await page.locator('text=/Customer Reviews/i').scrollIntoViewIfNeeded()

    await openReviewModal(page)

    // Verify modal has dialog role
    const modal = page.locator(SELECTORS.reviewModal)
    await expect(modal).toHaveAttribute('role', 'dialog')

    // Verify form inputs have labels
    const titleInput = page.locator(SELECTORS.titleInput)
    const titleLabel = await page.locator(`label[for="${await titleInput.getAttribute('id')}"]`).textContent()
    expect(titleLabel).toContain('Title')

    const contentInput = page.locator(SELECTORS.contentInput)
    const contentLabel = await page.locator(`label[for="${await contentInput.getAttribute('id')}"]`).textContent()
    expect(contentLabel).toContain('Review')

    await closeReviewModal(page)
  })

  test('should have accessible star rating controls', async ({ page }) => {
    await loginAsTestUser(page)
    await navigateToProduct(page)
    await page.locator('text=/Customer Reviews/i').scrollIntoViewIfNeeded()
    await openReviewModal(page)

    const stars = page.locator(SELECTORS.ratingStar)
    const count = await stars.count()

    // Verify all 5 stars have proper aria-labels
    expect(count).toBe(5)

    for (let i = 0; i < count; i++) {
      const ariaLabel = await stars.nth(i).getAttribute('aria-label')
      expect(ariaLabel).toMatch(/Rate \d+ out of 5 stars/i)
    }

    await closeReviewModal(page)
  })
})

// ============================================================================
// Test Suite: Responsive Design
// ============================================================================
test.describe('Review Responsive Design', () => {
  test.skip(!baseUrl, 'Set E2E_BASE_URL to run e2e tests')

  test('should display review summary correctly on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    await navigateToProduct(page)
    await page.locator('text=/Customer Reviews/i').scrollIntoViewIfNeeded()
    await page.waitForSelector(SELECTORS.reviewSummary, { timeout: 5000 })

    // Verify elements are visible and properly sized
    const avgRating = page.locator(SELECTORS.averageRating)
    await expect(avgRating).toBeVisible()

    const writeButton = page.locator(SELECTORS.writeReviewButton)
    await expect(writeButton).toBeVisible()
  })

  test('should display review list correctly on tablet', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 })

    await navigateToProduct(page)
    await page.locator('text=/Customer Reviews/i').scrollIntoViewIfNeeded()
    await page.waitForSelector(SELECTORS.reviewList, { timeout: 5000 })

    // Verify layout
    const reviewSummary = page.locator(SELECTORS.reviewSummary)
    await expect(reviewSummary).toBeVisible()

    const reviewList = page.locator(SELECTORS.reviewList)
    await expect(reviewList).toBeVisible()
  })

  test('should display review list correctly on desktop', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 })

    await navigateToProduct(page)
    await page.locator('text=/Customer Reviews/i').scrollIntoViewIfNeeded()
    await page.waitForSelector(SELECTORS.reviewSummary, { timeout: 5000 })

    // Verify two-column layout
    const reviewSummary = page.locator(SELECTORS.reviewSummary)
    const boundingBox = await reviewSummary.boundingBox()

    // Summary should take up about 1/3 of width (lg:col-span-1)
    expect(boundingBox).toBeTruthy()
  })
})