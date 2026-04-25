Frontend: Add multi-language support (i18n) with English and Spanish

Description
ILN targets freelancers in emerging markets where Spanish is widely spoken. Adding i18n infrastructure now even with just English and Spanish makes all future translations trivial and signals the project's global ambitions.

Requirements and context

i18n library: react-i18next
Languages: English (default) and Spanish
Language toggle: globe icon in navbar, dropdown with language options
Preference stored in localStorage
All UI strings externalised to translation files: public/locales/en/translation.json and public/locales/es/translation.json
Pages to fully translate (in scope): landing page, invoice submission form, freelancer dashboard, LP discovery table, navigation bar
Dates and numbers formatted using Intl API for locale-specific formatting
Missing translation keys fall back to English
Key files: new src/i18n.ts, all in-scope components
Suggested execution

Fork and branch: git checkout -b feat/i18n
Install and configure react-i18next
Create English and Spanish translation files
Replace all hardcoded strings in in-scope pages with t() keys
Add language toggle to navbar
Write tests: translation key coverage, fallback to English
Example commit message
feat: add react-i18next with English and Spanish translations

Acceptance criteria

 Language toggle switches all in-scope pages instantly
 Spanish translation is accurate and natural (not machine-translated)
 All in-scope UI strings externalised no hardcoded English in components
 Dates and numbers formatted per locale
 Preference persists across sessions
 Missing keys fall back to English without errors