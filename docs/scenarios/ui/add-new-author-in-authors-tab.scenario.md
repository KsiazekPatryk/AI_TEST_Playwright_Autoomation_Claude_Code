# Add New Author in Authors Tab

## 1. Scenario Title

Add a new author from the Authors management page and verify it was added correctly.

## 2. Steps

1. Navigate to `https://ksiegarnia.up.railway.app/`.
2. Click the "Authors" navigation link in the top navigation bar.
3. On the Authors Management page, record the current author count shown in the "Authors (N)" navigation link (baseline count).
4. Click the "➕ Add New Author" button.
5. In the "Add New Author" dialog, fill in the "First Name" field with the test first name.
6. Fill in the "Last Name" field with the test last name.
7. Click the "Add Author" button inside the dialog.
8. Observe the success confirmation toast notification.
9. Locate the newly added author card in the authors list (identified by full name and a newly assigned ID).
10. Verify the "Authors (N)" navigation counter incremented by 1 from the baseline recorded in step 3.
11. Use the "Search by first name or last name..." field to search by the new author's first name only, and confirm the new author appears as the sole/matching result.
12. Reload the Authors page (navigate to `/authors` again) and confirm the newly added author is still present in the list (data persisted).

## 3. Expected Results

- Step 2: The page navigates to `/authors` and displays the "👥 Authors Management" heading with a grid of existing author cards.
- Step 4: A modal dialog titled "➕ Add New Author" opens, containing "First Name" and "Last Name" text fields plus "Cancel" and "Add Author" buttons.
- Step 7: The dialog closes, the form submits, and no page reload/navigation error occurs.
- Step 8: A toast appears at the top of the page reading "✅ Author added successfully!" with a dismiss ("×") control.
- Step 9: A new author card appears in the authors grid displaying:
  - Avatar initials (first letter of first name + first letter of last name)
  - Heading with "First Name Last Name" exactly as entered
  - Paragraph "ID: {N}" with a newly assigned, previously unused numeric ID
- Step 10: The "Authors (N)" counter in the navigation bar equals baseline + 1.
- Step 11: The search results show exactly the newly added author card and no "No authors found." message.
- Step 12: After reloading, the new author card is still visible in the list, confirming the addition was persisted (not just local UI state), and the "Authors (N)" counter remains at baseline + 1.

## 4. Key UI Elements

- **Top navigation bar**: contains "Books (N)", "Manage Books", "Authors (N)", "Orders (N)" links, a cart button, and a "Login" button.
- **Authors (N) navigation link**: link showing the current total author count; navigates to the Authors Management page.
- **Search input**: text field labeled "Search by first name or last name..." with an adjacent search ("🔍") button; filters the author list live as text is entered.
- **"➕ Add New Author" button**: opens the add-author modal dialog.
- **Add New Author dialog**: modal with a title heading "➕ Add New Author", a close ("×") button, a "First Name" text field, a "Last Name" text field, a "Cancel" button, and an "Add Author" submit button.
- **Success toast notification**: transient banner with a checkmark icon, the text "Author added successfully!", and a dismiss ("×") button.
- **Author card**: displays avatar initials, the author's full name as a heading, an "ID: {N}" paragraph, and "✏️" (edit) / "🗑️" (delete) action buttons.

## 5. Test Data

| Field | Value |
|---|---|
| First Name | `Automation` |
| Last Name | `Tester` |

Notes on data:
- Values were validated live against the real application; no other fields are present or required in the Add New Author dialog.
- The resulting author is displayed as "Automation Tester" with initials "AT".

## 6. Assertions

- The "Add New Author" dialog is visible after clicking "➕ Add New Author", with visible "First Name" and "Last Name" fields.
- After submission, the success toast containing the text "Author added successfully!" is visible.
- An author card with heading text exactly matching "Automation Tester" is visible in the authors grid.
- The author card associated with "Automation Tester" displays an "ID:" value (numeric, non-empty).
- The "Authors (N)" navigation counter value equals the baseline value captured before submission, plus 1.
- Filtering the search field with the author's first name ("Automation") returns exactly one result, matching "Automation Tester".
- After a full page reload/navigation to `/authors`, the "Automation Tester" author card is still present, and the "Authors (N)" counter still equals baseline + 1.

## 7. Notes

- **Shared/dynamic environment**: This is a shared demo application (`ksiegarnia.up.railway.app`) without a per-run data reset. The author list and total count are not fixed — during exploration the baseline author count changed between page loads (observed 44 → 50) due to data seeded independently of this test. Do NOT hardcode an expected baseline count; always capture it dynamically immediately before adding the author and assert on the relative increment (+1), as reflected in the steps above.
- **New author IDs are sequential but not statically predictable**: the newly created author received the next available ID (51 in exploration) — automation should assert on the presence of the name/card and a well-formed ID value rather than a hardcoded ID number.
- **Search field behavior (important)**: The search box matches against first name OR last name as separate fields, not the concatenated "First Last" string. Searching for the full name together (e.g. "Automation Tester") returned "No authors found." — automation must search using only the first name (or only the last name), not both together.
- **List ordering**: New authors are not appended strictly alphabetically or at the end of the visible grid; the new card appeared inserted between "Michael T.Nygard" and "David Thomas" in the list. Locate the new author card by its visible text/name rather than by position/index.
- **Persistence confirmed**: Reloading the Authors page after adding the author still showed the new author and the incremented navigation counter, confirming the addition is persisted server-side, not just in local UI state.
- No client-side field validation (e.g., required-field errors) was explicitly tested in this scenario, since the given scenario only covers the happy path of adding an author with both fields filled.
