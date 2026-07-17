# Search for "Effective Java" Book

## 1. Scenario Title

Search for the book "Effective Java" using the bookstore search functionality

## 2. Steps

1. Navigate to the application at `https://ksiegarnia.up.railway.app/`
2. Observe the "Available Books" page (home page) loaded with the full book catalog
3. Locate the search input field labeled "Search books by title or author..."
4. Type `Effective Java` into the search input field
5. Observe the book list update (filtering happens live as text is typed, no button click or Enter key required)
6. Verify the filtered results

## 3. Expected Results

- Step 2: The home page loads and displays the "Available Books" heading along with the full catalog of books (29 books by default), the search input, and category filter buttons ("All Books", "Available", "Bestsellers").
- Step 5: As soon as "Effective Java" is typed into the search field, the book grid updates in real time (no need to click the search icon button or press Enter) and shows only book(s) matching the search term by title or author.
- Step 6: The filtered result set contains exactly one book: "Effective Java" by Joshua Bloch, published in 2008, priced at $107.28, with "In stock: 100" displayed. No other books are shown in the results.

## 4. Key UI Elements

- **Search input field** — text box with placeholder "Search books by title or author...", located above the book grid, filters results live on input
- **Search button** — magnifying glass icon (🔍) button next to the search input (present but not required to trigger filtering; clicking it does not change the already-filtered results)
- **Book grid/list** — main content area displaying book cards
- **Book card** — each card displays: book cover image, title (heading), author name(s), publication year, price, stock quantity, and an "Add" button (cart icon)
- **Category filter buttons** — "All Books", "Available", "Bestsellers" buttons above the book grid (not used in this scenario, but visible on the page)
- **Navigation bar** — top bar with links "Books (29)", "Manage Books", "Authors (44)", "Orders (1)", a cart button, and a "Login" button

## 5. Test Data

| Field | Value |
|---|---|
| Search term | `Effective Java` |
| Expected matching book title | Effective Java |
| Expected matching book author | Joshua Bloch |
| Expected matching book year | 2008 |
| Expected matching book price | $107.28 |
| Expected matching book stock | In stock: 100 |

## 6. Assertions

- The search input field is visible and accepts text input
- After typing "Effective Java", the book grid displays exactly one book card
- The displayed book card's heading/title text equals "Effective Java"
- The displayed book card's author paragraph text equals "Joshua Bloch"
- The displayed book card's year paragraph text equals "2008"
- The displayed book card's price text equals "$107.28"
- No book cards with unrelated titles (e.g., "Java Puzzlers", "Java Concurrency in Practice", "Thinking in Java", "Functional Programming in Java") are present in the filtered result, confirming the search returns only the exact/relevant match

## 7. Notes

- The search filters the book list **live/instantly** as the user types — there is no need to click the search (🔍) button or press Enter to trigger the search. Clicking the search button after typing does not alter the already-filtered result.
- Clearing the search input restores the full, unfiltered catalog of 29 books, confirming the search is a client-side/live filter rather than a page navigation or full reload.
- The "Books (29)" counter in the top navigation bar does not update to reflect the filtered count — it always shows the total catalog size (29), not the number of currently visible/filtered results. This is a UI detail to be aware of and should not be used as a source of the filtered count in assertions.
- The catalog contains other Java-related titles (e.g., "Java Puzzlers", "Java Concurrency in Practice", "Thinking in Java", "Functional Programming in Java", "JavaScript: The Good Parts") which could partially match a looser search term; the exact term "Effective Java" returned only the single, precise match during exploration, so the test should assert an exact count of 1 result with the exact title match.
