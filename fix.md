Frontend: Add notification badge count to the document title

Description
When users have ILN open in a background tab, they currently have no way to know if something important happened an invoice was funded, a default is claimable. Adding the unread notification count to the browser tab title lets users notice updates without switching to the tab.

Requirements and context

Document title format:
No notifications: "Invoice Liquidity Network"
With notifications: "(3) Invoice Liquidity Network"
On specific pages: "(3) My Dashboard · ILN"
Update title whenever notification count changes
Clear count from title when notification centre is opened (all marked as read)
Page-specific titles for all major routes:
/ - "ILN Turn unpaid invoices into instant liquidity"
/dashboard - "My Dashboard · ILN"
/lp - "Fund Invoices · ILN"
/analytics - "Analytics · ILN"
/governance - "Governance · ILN"
/invoice/[id] - "Invoice #[id] · ILN"
Implement as a useDocumentTitle custom hook
Key files: new src/hooks/useDocumentTitle.ts, all page components
Suggested execution

Fork and branch: git checkout -b feat/document-title
Create src/hooks/useDocumentTitle.ts
Add hook to all major page components
Subscribe to notification count from notification context
Clear count on notification centre open
Example commit message
feat: add unread notification count and page titles to document title

Acceptance criteria

 Unread count appears in tab title correctly
 Count clears when notification centre opened
 All major routes have correct page-specific titles
 Title updates correctly on route change
 Hook is reusable across all page components